const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/history - session list sorted most recent first
// Returns summarized view (no binary fields) for listing in history UI
router.get('/', async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-questions.answerAudioUrl -questions.questionAudioUrl'); // strip heavy audio URLs
    res.json(sessions);
  } catch (err) {
    console.error('[history] list failed:', err.message);
    res.status(500).json({ error: 'Failed to load history', detail: err.message });
  }
});

module.exports = router;
