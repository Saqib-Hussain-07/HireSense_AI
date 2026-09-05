const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Resume = require('../models/Resume');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { callAI } = require('../services/aiAdapter');
const { resumeAnalyzePrompt } = require('../utils/prompts');
const { computeAtsScore } = require('../services/atsScoringEngine');

const router = express.Router();
router.use(requireAuth);

// ── Memory storage: file bytes go straight into req.file.buffer ──────────────
// No disk writes, no uploads/ directory, no Cloudinary needed.
// MongoDB holds the binary — documents stay well under the 16 MB limit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap
});

// ── Text extraction from in-memory buffer ─────────────────────────────────────
async function extractRawText(buffer, originalname) {
  const ext = (originalname || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === 'docx' || ext === 'doc') {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  // Fallback: plain text
  return buffer.toString('utf-8');
}

// ── POST /api/resume/upload ───────────────────────────────────────────────────
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file)    return res.status(400).json({ error: 'resume file is required (field name: resume)' });
    if (!req.userId)  return res.status(401).json({ error: 'Not authenticated' });

    const { buffer, originalname, mimetype } = req.file;

    // ── Extract raw text from the in-memory buffer ──────────────────────────
    let rawText = '';
    try {
      rawText = await extractRawText(buffer, originalname);
    } catch (extractErr) {
      // Non-fatal: proceed without raw text if parsing fails (encrypted PDFs etc.)
      console.warn('[resume] text extraction failed:', extractErr.message);
    }

    const user = await User.findById(req.userId);
    const priorCount = await Resume.countDocuments({ userId: req.userId });

    // ── AI parsing + scoped bullet review (LLM evaluates language quality & extracts structure) ──
    let parsed = { skills: [], education: [], experience: [], projects: [], certifications: [] };
    let bulletQuality = 75;
    let missingKeywords = [];
    let weakBullets = [];

    if (rawText.trim().length > 20) {
      try {
        const result = await callAI({
          ...resumeAnalyzePrompt(rawText, user?.targetRole),
          jsonOnly: true,
          temperature: 0.2,
        });
        parsed = result.data.parsed || parsed;
        bulletQuality = Number(result.data.bulletQuality) || 75;
        missingKeywords = result.data.missingKeywords || [];
        weakBullets = result.data.weakBullets || [];
      } catch (aiErr) {
        console.error('[resume] AI parsing/bullet review failed:', aiErr.message);
        // Upload still succeeds — structured fields stay empty, deterministic ATS still runs
      }
    }

    // ── Multi-Component Deterministic ATS Calculation ──────────────────────────
    // 35% Keyword/Skill Match + 20% Formatting + 20% Quantified Impact + 15% Completeness + 10% Bullet Quality
    const atsResult = computeAtsScore({
      rawText,
      parsed,
      targetRole: user?.targetRole,
      bulletQualityScore: bulletQuality,
      fileSizeBytes: buffer.length,
      mimeType: mimetype || 'application/pdf',
    });

    const atsScore = atsResult.atsScore;
    const atsBreakdown = atsResult.breakdown;

    // Merge deterministic missing keywords with LLM suggestions
    const mergedMissing = Array.from(new Set([...atsResult.missingKeywords, ...missingKeywords])).slice(0, 8);

    // ── Persist to MongoDB (binary stored as Buffer field) ───────────────────
    const resume = await Resume.create({
      userId:   req.userId,
      version:  priorCount + 1,
      fileData: buffer,          // PDF/DOCX bytes stored directly in Mongo
      fileName: originalname,
      mimeType: mimetype || 'application/pdf',
      rawText,
      parsed,
      atsScore,
      atsBreakdown,
      missingKeywords: mergedMissing,
      weakBullets,
    });

    // Return the document without the heavy binary field
    const out = resume.toObject();
    delete out.fileData;
    res.status(201).json(out);

  } catch (err) {
    console.error('[resume] upload route error:', err.message, err.stack);
    res.status(500).json({ error: 'Resume upload failed', detail: err.message });
  }
});

// ── GET /api/resume/:id/file — stream PDF back to browser ────────────────────
router.get('/:id/file', async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.userId });
    if (!resume || !resume.fileData) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.set('Content-Type', resume.mimeType || 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${resume.fileName || 'resume.pdf'}"`);
    res.send(resume.fileData);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve file' });
  }
});

// ── GET /api/resume/versions ─────────────────────────────────────────────────
router.get('/versions', async (req, res) => {
  // Exclude the binary field from list responses to keep payloads small
  const resumes = await Resume.find({ userId: req.userId }, { fileData: 0 }).sort({ version: -1 });
  res.json(resumes);
});

// ── GET /api/resume/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const resume = await Resume.findOne(
    { _id: req.params.id, userId: req.userId },
    { fileData: 0 }  // exclude binary field
  );
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  res.json(resume);
});

module.exports = router;
