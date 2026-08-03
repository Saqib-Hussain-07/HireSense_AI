const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  const sessions = await InterviewSession.find({ userId: req.userId, status: 'completed' }).sort({ createdAt: 1 });

  // Data validation pipeline: cross-reference dashboard metrics against actual session logs
  const verifiedSessions = [];
  for (const s of sessions) {
    const scored = s.questions.filter((q) => q.finalScore > 0);
    const calculatedOverall = scored.length
      ? Math.round(scored.reduce((sum, q) => sum + q.finalScore, 0) / scored.length)
      : 0;

    // Verify session data is not corrupt (scores must be within 0-10 range now)
    if (s.overallScore > 10 || calculatedOverall > 10) {
      console.warn(`[dashboard/stats] Skipping unverified corrupt session ${s._id} (score out of bounds: ${s.overallScore})`);
      continue;
    }

    const isVerified = s.overallScore === calculatedOverall;
    verifiedSessions.push({
      ...s.toObject(),
      isVerified
    });
  }

  const scoreTrend = verifiedSessions.map((s) => ({
    date: s.createdAt,
    overallScore: s.overallScore,
    sessionId: s._id,
    verified: s.isVerified
  }));

  const deliveryTrend = verifiedSessions.map((s) => {
    const withScores = s.questions.filter((q) => q.rubricScores?.deliveryScore != null);
    const avg = withScores.length
      ? withScores.reduce((sum, q) => sum + q.rubricScores.deliveryScore, 0) / withScores.length
      : 0;
    return {
      date: s.createdAt,
      deliveryScore: Math.round(avg * 10) / 10,
      sessionId: s._id,
      verified: s.isVerified
    };
  });

  const technicalTrend = verifiedSessions.map((s) => {
    const withScores = s.questions.filter((q) => q.rubricScores?.technicalAccuracy != null);
    const avg = withScores.length
      ? withScores.reduce((sum, q) => sum + q.rubricScores.technicalAccuracy, 0) / withScores.length
      : 0;
    return {
      date: s.createdAt,
      technicalAccuracy: Math.round(avg * 10) / 10,
      sessionId: s._id,
      verified: s.isVerified
    };
  });

  // All rubric scores are already normalized to 0-10 by scoringEngine.js.
  // Just average directly per dimension — no secondary normalization needed.
  const DIMS = ['relevance', 'structure', 'technicalAccuracy', 'businessThinking', 'star', 'creativity', 'deliveryScore'];
  const dimAverages = {};
  for (const dim of DIMS) {
    const all = verifiedSessions.flatMap((s) => s.questions.map((q) => q.rubricScores?.[dim]).filter((v) => v != null));
    dimAverages[dim] = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null;
  }

  res.json({
    scoreTrend,
    deliveryTrend,
    technicalTrend,
    dimAverages,
    totalSessions: verifiedSessions.length
  });
});

module.exports = router;
