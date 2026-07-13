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
const jwt = require('jsonwebtoken');
const InterviewSession = require('../models/InterviewSession');
const { scoreAnswer } = require('./scoringEngine');
const { getNextFollowUp, maybePushback } = require('./followUpEngine');

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
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      userId = payload.userId;
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
          await session.save();
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

    // Send the current/first unanswered question to kick things off, and
    // support Session Resume by picking up at currentQuestionIndex.
    const startIndex = Math.min(session.currentQuestionIndex, session.questions.length - 1);
    if (session.questions[startIndex]) {
      ws.send(JSON.stringify({ type: 'question', questionIndex: startIndex, text: session.questions[startIndex].questionText, persona: session.questions[startIndex].persona || session.persona }));
      armSilenceTimers(startIndex);
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

        q.answerTranscript = text || q.answerTranscript;
        await session.save(); // auto-save after every turn (blueprint reliability rule)

        try {
          const result = await scoreAnswer({
            question: q.questionText,
            answerTranscript: q.answerTranscript,
            mode: session.mode,
            durationSeconds,
            persona: q.persona || session.persona,
            sessionType: session.type,
          });
          q.rubricScores = result.rubricScores;
          q.finalScore = result.finalScore;
          q.idealAnswer = result.idealAnswer;
          q.gapNotes = result.gapNotes;
          q.evidenceQuotes = result.evidenceQuotes;
          if (result.starCheck) q.starCheck = result.starCheck;
          await session.save();

          ws.send(JSON.stringify({ type: 'scored', questionIndex, result }));

          const shortHistory = session.questions.slice(0, questionIndex).map((qq) => ({ q: qq.questionText, a: qq.answerTranscript?.slice(0, 200) }));
          const { followUpText, tier } = await getNextFollowUp({ lastAnswerTranscript: q.answerTranscript, shortHistory, persona: q.persona || session.persona });
          const { pushback } = await maybePushback({ claim: q.answerTranscript, persona: q.persona || session.persona });

          if (pushback) {
            q.pushback = pushback;
            await session.save();
            ws.send(JSON.stringify({ type: 'pushback', questionIndex, text: pushback }));
          } else if (followUpText) {
            q.followUps.push({ q: followUpText, aTranscript: '' });
            await session.save();
            ws.send(JSON.stringify({ type: 'followup', questionIndex, text: followUpText, tier }));
          }
        } catch (aiErr) {
          console.error('[wsGateway] scoring/follow-up failed:', aiErr.message);
          ws.send(JSON.stringify({ type: 'error', message: 'AI evaluation temporarily unavailable, please retry your answer.' }));
        }

        armSilenceTimers(questionIndex);
        return;
      }

      if (msg.type === 'advance') {
        clearSilenceTimers();
        const nextIndex = msg.questionIndex + 1;
        session.currentQuestionIndex = nextIndex;
        await session.save();
        if (nextIndex < session.questions.length) {
          ws.send(JSON.stringify({ type: 'question', questionIndex: nextIndex, text: session.questions[nextIndex].questionText, persona: session.questions[nextIndex].persona || session.persona }));
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
