/**
 * WS /ws/interview/:id
 * --------------------
 * Live voice turn exchange for a single interview session.
 *
 * Protocol (JSON messages both ways):
 *  Client -> Server:
 *    { type: 'transcript_partial', questionIndex, text }   // live STT preview, not scored
 *    { type: 'transcript_final', questionIndex, text, durationSeconds }
 *    { type: 'redo_request', questionIndex }
 *    { type: 'ping' }
 *  Server -> Client:
 *    { type: 'question', questionIndex, text }             // client runs its own TTS/ElevenLabs call via textToSpeech
 *    { type: 'scored', questionIndex, result }
 *    { type: 'followup', questionIndex, text, tier }
 *    { type: 'pushback', questionIndex, text }
 *    { type: 'silence_nudge', questionIndex }               // 45s of no transcript activity
 *    { type: 'auto_advance', questionIndex, nextIndex }      // 90s of no transcript activity
 *    { type: 'session_complete' }
 *    { type: 'error', message }
 *
 * Reliability: every final transcript triggers an immediate session.save()
 * so Session Resume (blueprint 3C.24) works even if the socket drops mid-turn.
 */

const { WebSocketServer } = require('ws');
const InterviewSession = require('../models/InterviewSession');
const { resolveUserFromToken } = require('../middleware/auth');
const { scoreAnswer } = require('./scoringEngine');
const { getNextFollowUp, maybePushback } = require('./followUpEngine');
const { acquireLock, releaseLock } = require('./distributedLock');

const SOFT_NUDGE_MS = 45 * 1000;
const AUTO_ADVANCE_MS = 90 * 1000;

function attachWsGateway(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const match = req.url.match(/^\/ws\/interview\/([a-fA-F0-9]{24})(\?.*)?$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, match[1]);
    });
  });

  wss.on('connection', async (ws, req, sessionId) => {
    let userId;
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      userId = await resolveUserFromToken(token);
      if (!userId) throw new Error('Unauthorized');
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: invalid or missing token' }));
      ws.close();
      return;
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      ws.close();
      return;
    }

    let silenceTimer = null;
    let nudgeSent = false;

    function clearSilenceTimers() {
      if (silenceTimer) clearTimeout(silenceTimer);
      nudgeSent = false;
    }

    function armSilenceTimers(questionIndex) {
      clearSilenceTimers();
      silenceTimer = setTimeout(() => {
        if (ws.readyState !== ws.OPEN) return;
        nudgeSent = true;
        ws.send(JSON.stringify({ type: 'silence_nudge', questionIndex }));
        // arm the second stage: auto-advance after another 45s (total 90s)
        silenceTimer = setTimeout(async () => {
          if (ws.readyState !== ws.OPEN) return;
          const nextIndex = questionIndex + 1;
          session.questions[questionIndex].timedOut = true;
          session.currentQuestionIndex = nextIndex;
          await InterviewSession.updateOne(
            { _id: session._id },
            {
              $set: {
                [`questions.${questionIndex}.timedOut`]: true,
                currentQuestionIndex: nextIndex,
                lastSavedAt: new Date(),
              },
            }
          );
          ws.send(JSON.stringify({ type: 'auto_advance', questionIndex, nextIndex }));
          if (nextIndex < session.questions.length) {
            ws.send(JSON.stringify({ type: 'question', questionIndex: nextIndex, text: session.questions[nextIndex].questionText, persona: session.questions[nextIndex].persona || session.persona }));
            armSilenceTimers(nextIndex);
          } else {
            ws.send(JSON.stringify({ type: 'session_complete' }));
          }
        }, AUTO_ADVANCE_MS - SOFT_NUDGE_MS);
      }, SOFT_NUDGE_MS);
    }

    // Send the current question/status to kick things off and
    // support Session Resume across instance restarts and reconnects.
    const startIndex = Math.min(session.currentQuestionIndex, session.questions.length - 1);
    const startQ = session.questions[startIndex];
    if (startQ) {
      if (startQ.scoringStatus === 'scoring') {
        ws.send(
          JSON.stringify({
            type: 'scoring_in_progress',
            questionIndex: startIndex,
            text: startQ.questionText,
            message: 'Evaluation is in progress across cluster…',
          })
        );
      } else if (startQ.scoringStatus === 'scored') {
        ws.send(
          JSON.stringify({
            type: 'scored',
            questionIndex: startIndex,
            result: {
              rubricScores: startQ.rubricScores,
              finalScore: startQ.finalScore,
              idealAnswer: startQ.idealAnswer,
              gapNotes: startQ.gapNotes,
              evidenceQuotes: startQ.evidenceQuotes,
              starCheck: startQ.starCheck,
              sentiment: startQ.sentiment,
              engagement: startQ.engagement,
              confidenceScore: startQ.confidenceScore,
              jargonHighlights: startQ.jargonHighlights,
            },
          })
        );
        if (startQ.pushback) {
          ws.send(JSON.stringify({ type: 'pushback', questionIndex: startIndex, text: startQ.pushback }));
        } else if (startQ.followUps && startQ.followUps.length > 0) {
          const lastFollowUp = startQ.followUps[startQ.followUps.length - 1];
          ws.send(JSON.stringify({ type: 'followup', questionIndex: startIndex, text: lastFollowUp.q }));
        }
        armSilenceTimers(startIndex);
      } else {
        ws.send(
          JSON.stringify({
            type: 'question',
            questionIndex: startIndex,
            text: startQ.questionText,
            persona: startQ.persona || session.persona,
          })
        );
        armSilenceTimers(startIndex);
      }
    }

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.send(JSON.stringify({ type: 'error', message: 'Malformed message, expected JSON' }));
      }

      if (msg.type === 'ping') return ws.send(JSON.stringify({ type: 'pong' }));

      if (msg.type === 'transcript_partial') {
        // Any activity resets the silence clock, even before final transcript.
        clearSilenceTimers();
        armSilenceTimers(msg.questionIndex);
        return;
      }

      if (msg.type === 'transcript_final' || msg.type === 'redo_request') {
        clearSilenceTimers();
        const { questionIndex, text, durationSeconds } = msg;
        const q = session.questions[questionIndex];
        if (!q) return ws.send(JSON.stringify({ type: 'error', message: 'Invalid questionIndex' }));

        const scoringKey = `scoring:${sessionId}:${questionIndex}`;
        const { acquired, lockId } = await acquireLock(scoringKey, 60000);
        if (!acquired) {
          console.warn(`[wsGateway] Scoring already in progress across cluster for key: ${scoringKey}`);
          ws.send(
            JSON.stringify({
              type: 'scoring_in_progress',
              questionIndex,
              message: 'Evaluation is currently being processed by another cluster instance.',
            })
          );
          return;
        }

        q.answerTranscript = text || q.answerTranscript;
        q.scoringStatus = 'scoring';
        q.scoringStartedAt = new Date();
        q.followUps = [];
        q.pushback = null;

        // Targeted positional update (avoids full-document save of entire questions array)
        await InterviewSession.updateOne(
          { _id: session._id },
          {
            $set: {
              [`questions.${questionIndex}.answerTranscript`]: q.answerTranscript,
              [`questions.${questionIndex}.scoringStatus`]: 'scoring',
              [`questions.${questionIndex}.scoringStartedAt`]: q.scoringStartedAt,
              [`questions.${questionIndex}.followUps`]: [],
              [`questions.${questionIndex}.pushback`]: null,
              lastSavedAt: new Date(),
            },
          }
        );

        try {
          const shortHistory = session.questions.slice(0, questionIndex).map((qq) => ({ q: qq.questionText, a: qq.answerTranscript?.slice(0, 200) }));
          const result = await scoreAnswer({
            question: q.questionText,
            answerTranscript: q.answerTranscript,
            mode: session.mode,
            durationSeconds,
            persona: q.persona || session.persona,
            sessionType: session.type,
            shortHistory,
          });
          q.scoringStatus = 'scored';
          q.rubricScores = result.rubricScores;
          q.finalScore = result.finalScore;
          if (result.verdict) q.verdict = result.verdict;
          q.idealAnswer = result.idealAnswer;
          q.gapNotes = result.gapNotes;
          q.evidenceQuotes = result.evidenceQuotes;
          if (result.starCheck) q.starCheck = result.starCheck;
          q.sentiment = result.sentiment;
          q.engagement = result.engagement;
          q.confidenceScore = result.confidenceScore;
          q.jargonHighlights = result.jargonHighlights;

          // Single-pass conversational next steps (zero extra LLM calls)
          if (result.pushback) {
            q.pushback = result.pushback;
          } else if (result.followUp) {
            q.followUps = [{ q: result.followUp, aTranscript: '' }];
          }

          const updateFields = {
            [`questions.${questionIndex}.scoringStatus`]: 'scored',
            [`questions.${questionIndex}.rubricScores`]: result.rubricScores,
            [`questions.${questionIndex}.finalScore`]: result.finalScore,
            [`questions.${questionIndex}.idealAnswer`]: result.idealAnswer,
            [`questions.${questionIndex}.gapNotes`]: result.gapNotes,
            [`questions.${questionIndex}.evidenceQuotes`]: result.evidenceQuotes,
            [`questions.${questionIndex}.sentiment`]: result.sentiment,
            [`questions.${questionIndex}.engagement`]: result.engagement,
            [`questions.${questionIndex}.confidenceScore`]: result.confidenceScore,
            [`questions.${questionIndex}.jargonHighlights`]: result.jargonHighlights,
            [`questions.${questionIndex}.pushback`]: q.pushback,
            [`questions.${questionIndex}.followUps`]: q.followUps,
            lastSavedAt: new Date(),
          };
          if (result.verdict) {
            updateFields[`questions.${questionIndex}.verdict`] = result.verdict;
          }
          if (result.starCheck) {
            updateFields[`questions.${questionIndex}.starCheck`] = result.starCheck;
          }

          // Targeted positional update for scoring results
          await InterviewSession.updateOne(
            { _id: session._id },
            { $set: updateFields }
          );

          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'scored', questionIndex, result }));
            if (result.pushback) {
              ws.send(JSON.stringify({ type: 'pushback', questionIndex, text: result.pushback }));
            } else if (result.followUp) {
              ws.send(JSON.stringify({ type: 'followup', questionIndex, text: result.followUp, tier: 'unified_followup' }));
            }
          }
        } catch (aiErr) {
          console.error('[wsGateway] scoring/follow-up failed:', aiErr.message);
          q.scoringStatus = 'failed';
          await InterviewSession.updateOne(
            { _id: session._id },
            {
              $set: {
                [`questions.${questionIndex}.scoringStatus`]: 'failed',
                lastSavedAt: new Date(),
              },
            }
          );
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'AI evaluation temporarily unavailable, please retry your answer.' }));
          }
        } finally {
          await releaseLock(scoringKey, lockId);
        }

        armSilenceTimers(questionIndex);
        return;
      }

      if (msg.type === 'advance') {
        clearSilenceTimers();
        const nextIndex = msg.questionIndex + 1;
        session.currentQuestionIndex = nextIndex;
        await InterviewSession.updateOne(
          { _id: session._id },
          {
            $set: {
              currentQuestionIndex: nextIndex,
              lastSavedAt: new Date(),
            },
          }
        );
        if (nextIndex < session.questions.length) {
          const nextQ = session.questions[nextIndex];
          ws.send(
            JSON.stringify({
              type: 'question',
              questionIndex: nextIndex,
              text: nextQ.questionText,
              persona: nextQ.persona || session.persona,
            })
          );
          armSilenceTimers(nextIndex);
        } else {
          ws.send(JSON.stringify({ type: 'session_complete' }));
        }
      }
    });

    ws.on('close', () => {
      clearSilenceTimers();
    });
  });

  return wss;
}

module.exports = attachWsGateway;
