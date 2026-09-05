const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const MatchReport = require('../models/MatchReport');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { callAI } = require('../services/aiAdapter');
const { interviewGeneratePrompt } = require('../utils/prompts');
const { scoreAnswer } = require('../services/scoringEngine');
const { getNextFollowUp, maybePushback } = require('../services/followUpEngine');
const { textToSpeech } = require('../services/voiceAdapter');
const { updateWeaknessTracker } = require('../services/weaknessEngine');
const { generatePanelQuestions } = require('../services/panelEngine');

const router = express.Router();
router.use(requireAuth);

// POST /api/interview/tts  { text } -> { fallback: bool, audioBase64?, mime?, text }
// Client plays the returned audio if fallback is false, otherwise speaks
// `text` itself via the browser's built-in SpeechSynthesis API.
router.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await textToSpeech(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'TTS failed', detail: err.message });
  }
});

// POST /api/interview/generate
// Accepts either a single `persona`, or `panelPersonas: [personaA, personaB]`
// for Panel Interview Mode (blueprint Phase 3) — two personas alternating
// ownership of questions within the same session.
router.post('/generate', async (req, res) => {
  try {
    const { type = 'technical', difficulty = 'medium', persona = 'friendly_mentor', panelPersonas, mode = 'coaching', matchReportId } = req.body;

    if (panelPersonas && (!Array.isArray(panelPersonas) || panelPersonas.length !== 2)) {
      return res.status(400).json({ error: 'panelPersonas must be an array of exactly 2 persona ids' });
    }

    let resumeParsed = {};
    let jdParsed = {};
    let matchReport = null;
    if (matchReportId) {
      matchReport = await MatchReport.findOne({ _id: matchReportId, userId: req.userId });
      if (matchReport) {
        const resume = await Resume.findById(matchReport.resumeId);
        const jd = await JobDescription.findById(matchReport.jdId);
        resumeParsed = resume?.parsed || {};
        jdParsed = jd || {};
      }
    }

    let questions;
    if (panelPersonas) {
      const panelQuestions = await generatePanelQuestions({ resumeParsed, jdParsed, type, difficulty, panelPersonas, mode });
      questions = panelQuestions; // already shaped as { questionText, persona }
    } else {
      const { data } = await callAI({
        ...interviewGeneratePrompt({ resumeParsed, jdParsed, type, difficulty, persona, mode }),
        jsonOnly: true,
      });
      // Defensive mapping: AI sometimes returns question objects instead of plain strings
      // (e.g. { question: "...", score: 0.5, rationale: "..." }). Always extract the text.
      questions = (data.questions || []).map((q) => ({
        questionText: typeof q === 'string' ? q : (q.question || q.questionText || q.text || JSON.stringify(q)),
      }));
    }

    const session = await InterviewSession.create({
      userId: req.userId,
      matchReportId: matchReport ? matchReport._id : undefined,
      type,
      persona: panelPersonas ? panelPersonas[0] : persona,
      panelPersonas: panelPersonas || undefined,
      mode,
      difficulty,
      status: 'in_progress',
      currentQuestionIndex: 0,
      questions,
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Interview generation failed', detail: err.message });
  }
});

// GET /api/interview/:id  -> resume in-progress session, incl. voice state
router.get('/:id', async (req, res) => {
  const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.userId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// POST /api/interview/:id/answer  -> fallback text-mode endpoint if WS unavailable
router.post('/:id/answer', async (req, res) => {
  try {
    const { questionIndex, answerTranscript, durationSeconds } = req.body;
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const q = session.questions[questionIndex];
    if (!q) return res.status(400).json({ error: 'Invalid questionIndex' });

    const user = await User.findById(req.userId);
    q.answerTranscript = answerTranscript;

    const result = await scoreAnswer({
      question: q.questionText,
      answerTranscript,
      targetRole: user?.targetRole,
      mode: session.mode,
      durationSeconds,
      persona: q.persona || session.persona,
      sessionType: session.type,
    });

    q.rubricScores = result.rubricScores;
    q.finalScore = result.finalScore;
    if (result.verdict) q.verdict = result.verdict;
    q.idealAnswer = result.idealAnswer;
    q.gapNotes = result.gapNotes;
    q.evidenceQuotes = result.evidenceQuotes;
    if (result.starCheck) q.starCheck = result.starCheck;
    if (result.pushback) q.pushback = result.pushback;
    if (result.followUp) q.followUps.push({ q: result.followUp, aTranscript: '' });

    session.currentQuestionIndex = Math.min(questionIndex + 1, session.questions.length);
    await session.save();

    res.json({ question: q, deliveryMeta: result.deliveryMeta, currentQuestionIndex: session.currentQuestionIndex });
  } catch (err) {
    res.status(500).json({ error: 'Answer scoring failed', detail: err.message });
  }
});

// POST /api/interview/:id/followup  (questionIndex) -> adaptive follow-up
router.post('/:id/followup', async (req, res) => {
  try {
    const { questionIndex } = req.body;
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const q = session.questions[questionIndex];
    if (!q) return res.status(400).json({ error: 'Invalid questionIndex' });

    const shortHistory = session.questions.slice(0, questionIndex).map((qq) => ({
      q: qq.questionText,
      a: qq.answerTranscript?.slice(0, 200),
    }));

    const { followUpText, tier } = await getNextFollowUp({
      lastAnswerTranscript: q.answerTranscript,
      shortHistory,
      persona: q.persona || session.persona,
    });

    const { pushback } = await maybePushback({ claim: q.answerTranscript, persona: q.persona || session.persona });
    if (pushback) q.pushback = pushback;

    q.followUps.push({ q: followUpText, aTranscript: '' });
    await session.save();

    res.json({ followUpText, tier, pushback: pushback || null });
  } catch (err) {
    res.status(500).json({ error: 'Follow-up generation failed', detail: err.message });
  }
});

// POST /api/interview/:id/redo  (questionIndex, newAnswerAudio/newAnswerTranscript)
router.post('/:id/redo', async (req, res) => {
  try {
    const { questionIndex, newAnswerTranscript, durationSeconds } = req.body;
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const q = session.questions[questionIndex];
    if (!q) return res.status(400).json({ error: 'Invalid questionIndex' });

    const user = await User.findById(req.userId);
    q.answerTranscript = newAnswerTranscript;

    const result = await scoreAnswer({
      question: q.questionText,
      answerTranscript: newAnswerTranscript,
      targetRole: user?.targetRole,
      mode: session.mode,
      durationSeconds,
      persona: q.persona || session.persona,
      sessionType: session.type,
    });

    q.rubricScores = result.rubricScores;
    q.finalScore = result.finalScore;
    if (result.verdict) q.verdict = result.verdict;
    q.idealAnswer = result.idealAnswer;
    q.gapNotes = result.gapNotes;
    q.evidenceQuotes = result.evidenceQuotes;
    if (result.starCheck) q.starCheck = result.starCheck;

    await session.save();
    res.json({ question: q, deliveryMeta: result.deliveryMeta });
  } catch (err) {
    res.status(500).json({ error: 'Redo scoring failed', detail: err.message });
  }
});

// POST /api/interview/:id/finish -> triggers full session scoring/aggregation
router.post('/:id/finish', async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const scored = session.questions.filter((q) => q.finalScore > 0);
    const overallScore = scored.length
      ? parseFloat((scored.reduce((sum, q) => sum + q.finalScore, 0) / scored.length).toFixed(1))
      : 0;

    session.overallScore = overallScore;
    session.verdict = overallScore >= 8.0 ? 'Hire' : overallScore >= 6.0 ? 'Hold' : 'Pass';
    session.status = 'completed';
    await session.save();

    // Weakness Tracker (blueprint 3B.19): auto-update from this session's
    // low-scoring rubric dimensions so the Learning Plan can target them.
    try {
      await updateWeaknessTracker(req.userId, session);
    } catch (wErr) {
      console.warn('[interview/finish] weakness tracker update failed (non-fatal):', wErr.message);
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Finishing session failed', detail: err.message });
  }
});

module.exports = router;
