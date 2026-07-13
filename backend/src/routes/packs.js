const express = require('express');
const InterviewPack = require('../models/InterviewPack');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/packs?company=Google — list packs, optionally filtered by company.
// Honest scope note: no admin curation/moderation layer — any user can
// create a pack (see POST below), so treat these as community presets.
router.get('/', async (req, res) => {
  try {
    const { company } = req.query;
    const filter = company ? { company: new RegExp(`^${company}$`, 'i') } : {};
    const packs = await InterviewPack.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(packs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load packs', detail: err.message });
  }
});

// POST /api/packs — create a new pack.
router.post('/', async (req, res) => {
  try {
    const { name, company, description, defaultType, defaultDifficulty, defaultPersona, tags } = req.body;
    if (!name || !company) return res.status(400).json({ error: 'name and company are required' });
    const pack = await InterviewPack.create({
      name,
      company,
      description,
      defaultType,
      defaultDifficulty,
      defaultPersona,
      tags,
      createdBy: req.userId,
    });
    res.status(201).json(pack);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pack', detail: err.message });
  }
});

module.exports = router;
