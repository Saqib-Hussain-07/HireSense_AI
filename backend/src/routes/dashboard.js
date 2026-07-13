const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  const sessions = await InterviewSession.find({ userId: req.userId, status: 'completed' }).sort({ createdAt: 1 });

  const scoreTrend = sessions.map((s) => ({ date: s.createdAt, overallScore: s.overallScore }));

  const deliveryTrend = sessions.map((s) => {
    const withScores = s.questions.filter((q) => q.rubricScores?.deliveryScore != null);
    const avg = withScores.length
      ? withScores.reduce((sum, q) => sum + q.rubricScores.deliveryScore, 0) / withScores.length
      : 0;
    return { date: s.createdAt, deliveryScore: Math.round(avg * 10) / 10 };
  });

  const technicalTrend = sessions.map((s) => {
    const withScores = s.questions.filter((q) => q.rubricScores?.technicalAccuracy != null);
    const avg = withScores.length
      ? withScores.reduce((sum, q) => sum + q.rubricScores.technicalAccuracy, 0) / withScores.length
      : 0;
    return { date: s.createdAt, technicalAccuracy: Math.round(avg * 10) / 10 };
  });

  // weak topics radar: naive approach for Phase 1 - lowest average rubric
  // dimension across all sessions, expand with real topic tagging in Phase 2
  const dims = ['relevance', 'structure', 'technicalAccuracy', 'businessThinking', 'star', 'creativity'];
  const dimAverages = {};
  for (const dim of dims) {
    const all = sessions.flatMap((s) => s.questions.map((q) => q.rubricScores?.[dim]).filter((v) => v != null));
    dimAverages[dim] = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null;
  }

  res.json({ scoreTrend, deliveryTrend, technicalTrend, dimAverages, totalSessions: sessions.length });
});

module.exports = router;
