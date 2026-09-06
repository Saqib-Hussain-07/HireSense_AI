const express = require('express');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const MatchReport = require('../models/MatchReport');
const { requireAuth } = require('../middleware/auth');
const { callAI } = require('../services/aiAdapter');
const { matchReportPrompt } = require('../utils/prompts');
const { computeAtsScore } = require('../services/atsScoringEngine');

const router = express.Router();
router.use(requireAuth);

const MATCH_CACHE_TTL_MS = parseInt(process.env.MATCH_CACHE_TTL_MS, 10) || 10 * 60 * 1000; // 10 minutes default

router.post('/', async (req, res) => {
  try {
    const { resumeId, jdId, forceRefresh } = req.body;
    if (!resumeId || !jdId) return res.status(400).json({ error: 'resumeId and jdId are required' });

    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    const jd = await JobDescription.findOne({ _id: jdId, userId: req.userId });
    if (!resume || !jd) return res.status(404).json({ error: 'Resume or JD not found for this user' });

    // Check for cached match report
    const existingReport = await MatchReport.findOne({
      userId: req.userId,
      resumeId,
      jdId,
    }).sort({ updatedAt: -1, createdAt: -1 });

    const reportTimestamp = existingReport ? (existingReport.updatedAt || existingReport.createdAt) : null;
    const isWithinTTL = reportTimestamp && (Date.now() - new Date(reportTimestamp).getTime() < MATCH_CACHE_TTL_MS);
    const resumeNotModified = !resume.updatedAt || !reportTimestamp || new Date(resume.updatedAt) <= new Date(reportTimestamp);
    const jdNotModified = !jd.updatedAt || !reportTimestamp || new Date(jd.updatedAt) <= new Date(reportTimestamp);

    if (existingReport && isWithinTTL && resumeNotModified && jdNotModified && !forceRefresh && req.query.refresh !== 'true') {
      // Synchronize resume's target JD if needed
      if (resume.targetJdId?.toString() !== jd._id.toString()) {
        resume.atsScore = existingReport.matchPercent;
        resume.atsBreakdown = existingReport.breakdown;
        resume.isJdSpecific = true;
        resume.targetJdId = jd._id;
        resume.targetJdTitle = `${jd.jobTitle}${jd.company ? ` (${jd.company})` : ''}`;
        resume.missingKeywords = existingReport.missing;
        await resume.save();
      }
      return res.status(200).json(existingReport);
    }

    // Calculate unified deterministic match score using the shared engine
    const atsResult = computeAtsScore({
      rawText: resume.rawText,
      parsed: resume.parsed,
      targetRole: jd.jobTitle,
      weakBullets: resume.weakBullets,
      fileSizeBytes: resume.fileData ? resume.fileData.length : (resume.rawText ? resume.rawText.length * 1.5 : 0),
      mimeType: resume.mimeType || 'application/pdf',
      jd,
    });

    // LLM strictly generates qualitative skill gaps, explanations, and resources
    let data = { skillGaps: [], missing: [], strong: [] };
    try {
      const aiRes = await callAI({
        ...matchReportPrompt(resume.parsed, jd),
        jsonOnly: true,
        temperature: 0.2,
      });
      data = aiRes.data || data;
    } catch (aiErr) {
      console.warn('[match] AI qualitative gap extraction failed, proceeding with deterministic report:', aiErr.message);
    }

    const reportPayload = {
      userId: req.userId,
      resumeId,
      jdId,
      matchPercent: atsResult.score,
      breakdown: atsResult.breakdown,
      missing: atsResult.missingKeywords.length > 0 ? atsResult.missingKeywords : (data.missing || []),
      strong: atsResult.matchedKeywords.length > 0 ? atsResult.matchedKeywords : (data.strong || []),
      skillGaps: data.skillGaps || [],
    };

    const report = await MatchReport.findOneAndUpdate(
      { userId: req.userId, resumeId, jdId },
      { $set: reportPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync match score & label back to resume so candidate sees updated match
    resume.atsScore = atsResult.score;
    resume.atsBreakdown = atsResult.breakdown;
    resume.scoreLabel = atsResult.scoreLabel;
    resume.isJdSpecific = true;
    resume.targetJdId = jd._id;
    resume.targetJdTitle = `${jd.jobTitle}${jd.company ? ` (${jd.company})` : ''}`;
    resume.missingKeywords = atsResult.missingKeywords;
    await resume.save();

    res.status(existingReport ? 200 : 201).json(report);
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
