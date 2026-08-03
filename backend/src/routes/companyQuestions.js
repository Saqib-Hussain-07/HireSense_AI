const express = require('express');
const CompanyQuestion = require('../models/CompanyQuestion');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/company-questions?company=Google&tag=system_design
// Tagged by company + recency (blueprint 3B.18); sorted most-recent first.
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  try {
    const { company, tag } = req.query;
    const filter = {};
    if (company) filter.company = new RegExp(`^${escapeRegExp(company)}$`, 'i');
    if (tag) filter.tags = tag;
    const questions = await CompanyQuestion.find(filter).sort({ recency: -1 }).limit(100);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load company questions', detail: err.message });
  }
});

// POST /api/company-questions  { company, questionText, tags }
// User-submitted; no moderation pipeline yet (see model note) so these are
// unverified — flagged as source: 'user_submitted'.
router.post('/', async (req, res) => {
  try {
    const { company, questionText, tags } = req.body;
    if (!company || !questionText) return res.status(400).json({ error: 'company and questionText are required' });
    const q = await CompanyQuestion.create({
      company,
      questionText,
      tags: tags || [],
      source: 'user_submitted',
      submittedBy: req.userId,
      recency: new Date(),
    });
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit question', detail: err.message });
  }
});

module.exports = router;
