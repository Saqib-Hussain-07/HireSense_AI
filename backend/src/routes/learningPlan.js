const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { generateLearningPlan } = require('../services/learningEngine');

const router = express.Router();
router.use(requireAuth);

// GET /api/learning-plan — returns cached plan if weak topics unchanged, or regenerates if changed
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const plan = await generateLearningPlan(req.userId, user?.targetRole);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate learning plan', detail: err.message });
  }
});

module.exports = router;
