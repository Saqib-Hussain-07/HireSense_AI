const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/history - session list + replay data
router.get('/', async (req, res) => {
  const sessions = await InterviewSession.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(sessions);
});

module.exports = router;
