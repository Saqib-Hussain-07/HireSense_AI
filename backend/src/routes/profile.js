const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/', async (req, res) => {
  const allowed = ['name', 'college', 'degree', 'gradYear', 'skills', 'experience', 'targetRole', 'preferredCompanies'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-passwordHash');
  res.json(user);
});

module.exports = router;
