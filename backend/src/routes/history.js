const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/history - paginated session list sorted most recent first
// Returns summarized view (no binary/heavy audio fields) with O(1) indexed page seek
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, sessions] = await Promise.all([
      InterviewSession.countDocuments({ userId: req.userId }),
      InterviewSession.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-questions.answerAudioUrl -questions.questionAudioUrl')
        .lean(),
    ]);

    res.json({
      sessions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error('[history] list failed:', err.message);
    res.status(500).json({ error: 'Failed to load history', detail: err.message });
  }
});

module.exports = router;

