const express = require('express');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const MatchReport = require('../models/MatchReport');
const { requireAuth } = require('../middleware/auth');
const { callAI } = require('../services/aiAdapter');
const { matchReportPrompt } = require('../utils/prompts');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const { resumeId, jdId } = req.body;
    if (!resumeId || !jdId) return res.status(400).json({ error: 'resumeId and jdId are required' });

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    const jd = await JobDescription.findOne({ _id: jdId, userId: req.userId });
    if (!resume || !jd) return res.status(404).json({ error: 'Resume or JD not found for this user' });

    const { data } = await callAI({ ...matchReportPrompt(resume.parsed, jd), jsonOnly: true });

    const report = await MatchReport.create({
      userId: req.userId,
      resumeId,
      jdId,
      matchPercent: data.matchPercent || 0,
      missing: data.missing || [],
      strong: data.strong || [],
      skillGaps: data.skillGaps || [],
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Match generation failed', detail: err.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const report = await MatchReport.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    if (!report) return res.status(404).json({ error: 'No match report found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest match report', detail: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const report = await MatchReport.findOne({ _id: req.params.id, userId: req.userId });
  if (!report) return res.status(404).json({ error: 'Match report not found' });
  res.json(report);
});

module.exports = router;
