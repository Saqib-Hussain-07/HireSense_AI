const express = require('express');
const WeaknessTracker = require('../models/WeaknessTracker');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/weakness-tracker
router.get('/', async (req, res) => {
  try {
    const tracker = await WeaknessTracker.findOne({ userId: req.userId });
    if (!tracker) return res.json({ userId: req.userId, weakTopics: [] });
    res.json(tracker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weakness tracker', detail: err.message });
  }
});

module.exports = router;
