const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DIMS = [
  'relevance',
  'structure',
  'technicalAccuracy',
  'businessThinking',
  'star',
  'creativity',
  'deliveryScore',
];

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  // Projection + .lean(): Only pull the numeric fields needed for metrics,
  // bypassing heavy text blobs (transcripts, idealAnswer, gapNotes) and Mongoose hydration.
  const sessions = await InterviewSession.find(
    { userId: req.userId, status: 'completed' },
    'createdAt overallScore questions.finalScore questions.rubricScores'
  )
    .sort({ createdAt: 1 })
    .lean();

  const scoreTrend = [];
  const deliveryTrend = [];
  const technicalTrend = [];
  const dimTotals = Object.fromEntries(DIMS.map((d) => [d, { sum: 0, count: 0 }]));
  let totalSessions = 0;

  // Single-pass accumulator replacing 9+ separate .map()/.filter()/.reduce() passes
  for (const s of sessions) {
    const questions = s.questions || [];
    let scoredSum = 0;
    let scoredCount = 0;
    let deliverySum = 0;
    let deliveryCount = 0;
    let technicalSum = 0;
    let technicalCount = 0;

    for (const q of questions) {
      if (q.finalScore > 0) {
        scoredSum += q.finalScore;
        scoredCount++;
      }
      const rub = q.rubricScores;
      if (rub) {
        if (rub.deliveryScore != null) {
          deliverySum += rub.deliveryScore;
          deliveryCount++;
        }
        if (rub.technicalAccuracy != null) {
          technicalSum += rub.technicalAccuracy;
          technicalCount++;
        }
        for (const dim of DIMS) {
          const val = rub[dim];
          if (val != null) {
            dimTotals[dim].sum += val;
            dimTotals[dim].count++;
          }
        }
      }
    }

    const calculatedOverall = scoredCount ? Math.round(scoredSum / scoredCount) : 0;
    // Verify session data is not corrupt (scores must be within 0-10 range)
    if (s.overallScore > 10 || calculatedOverall > 10) {
      console.warn(`[dashboard/stats] Skipping unverified corrupt session ${s._id} (score out of bounds: ${s.overallScore})`);
      continue;
    }

    const isVerified = s.overallScore === calculatedOverall;
    totalSessions++;

    scoreTrend.push({
      date: s.createdAt,
      overallScore: s.overallScore,
      sessionId: s._id,
      verified: isVerified,
    });

    const avgDelivery = deliveryCount ? Math.round((deliverySum / deliveryCount) * 10) / 10 : 0;
    deliveryTrend.push({
      date: s.createdAt,
      deliveryScore: avgDelivery,
      sessionId: s._id,
      verified: isVerified,
    });

    const avgTechnical = technicalCount ? Math.round((technicalSum / technicalCount) * 10) / 10 : 0;
    technicalTrend.push({
      date: s.createdAt,
      technicalAccuracy: avgTechnical,
      sessionId: s._id,
      verified: isVerified,
    });
  }

  const dimAverages = {};
  for (const dim of DIMS) {
    const { sum, count } = dimTotals[dim];
    dimAverages[dim] = count ? Math.round((sum / count) * 10) / 10 : null;
  }

  res.json({
    scoreTrend,
    deliveryTrend,
    technicalTrend,
    dimAverages,
    totalSessions,
  });
});

module.exports = router;

