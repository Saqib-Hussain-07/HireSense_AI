const express = require('express');
const cheerio = require('cheerio');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const JobDescription = require('../models/JobDescription');
const { requireAuth } = require('../middleware/auth');
const { callAI } = require('../services/aiAdapter');
const { jdExtractPrompt } = require('../utils/prompts');
const { assertPublicHost } = require('../utils/ssrfValidator');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const jds = await JobDescription.find({ userId: req.userId })
      .select('jobTitle company createdAt')
      .sort({ createdAt: -1 });
    res.json(jds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list job descriptions', detail: err.message });
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * JD-from-URL (blueprint 3B.17). Fetches the page and strips it down to
 * plausible job-description text via cheerio. This is a best-effort text
 * extraction, not a purpose-built scraper for every ATS vendor's markup —
 * heavily templated career sites (Workday, Greenhouse SPAs that render via
 * JS) may come back thin; the fallback in that case is to ask the user to
 * paste the text instead, same as the Phase 1 path.
 */
function cleanUrl(url) {
  let cleaned = (url || '').trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

async function fetchJDTextFromUrl(url) {
  const targetUrl = cleanUrl(url);

  // Validate that the host is a valid public endpoint and not a private/loopback/cloud metadata IP
  await assertPublicHost(targetUrl);

  let currentUrl = targetUrl;
  let res;
  const MAX_REDIRECTS = 3;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    res = await fetch(currentUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HireSenseAI/1.0)' },
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) break;

      const nextUrl = new URL(location, currentUrl).toString();
      await assertPublicHost(nextUrl); // Re-assert public host on every redirect hop
      currentUrl = nextUrl;
      continue;
    }

    break;
  }

  if (!res || !res.ok) throw new Error(`Could not fetch that URL (status ${res ? res.status : 'error'})`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text;
}

router.post('/analyze', async (req, res) => {
  try {
    const { rawText, url } = req.body;
    let text = rawText;

    if (!text && url) {
      try {
        text = await fetchJDTextFromUrl(url);
      } catch (fetchErr) {
        return res.status(422).json({
          error: `Could not extract a job description from that URL: ${fetchErr.message}. Please paste the JD text instead.`,
        });
      }
      if (!text || text.length < 100) {
        return res.status(422).json({
          error: 'That page loaded but did not contain enough readable text (it may be JS-rendered). Please paste the JD text instead.',
        });
      }
    }
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'rawText is required (paste the job description), or provide a fetchable url' });
    }

    const { data } = await callAI({ ...jdExtractPrompt(text), jsonOnly: true });

    const jd = await JobDescription.create({
      userId: req.userId,
      rawText: text,
      sourceUrl: url || null,
      jobTitle: data.jobTitle || '',
      company: data.company || '',
      requiredSkills: data.requiredSkills || [],
      niceToHave: data.niceToHave || [],
      softSkills: data.softSkills || [],
      experienceLevel: data.experienceLevel || '',
      responsibilities: data.responsibilities || [],
    });

    res.status(201).json(jd);
  } catch (err) {
    res.status(500).json({ error: 'JD analysis failed', detail: err.message });
  }
});

/**
 * POST /api/jd/upload-pdf
 * Accepts a PDF file, extracts text with pdf-parse, then runs the same
 * JD extraction AI call as /analyze. Lets the frontend support JD PDF
 * upload without needing a new library on the client side.
 */
router.post('/upload-pdf', upload.single('jd'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'jd file is required (field name: jd)' });

    let text = '';
    try {
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text || '';
    } catch (parseErr) {
      console.warn('[jd] PDF parse failed:', parseErr.message);
    }

    if (!text || text.trim().length < 20) {
      return res.status(422).json({
        error: 'Could not extract readable text from that PDF. Please paste the job description text instead.',
      });
    }

    const { data } = await callAI({ ...jdExtractPrompt(text), jsonOnly: true });

    const jd = await JobDescription.create({
      userId: req.userId,
      rawText: text,
      sourceUrl: null,
      jobTitle: data.jobTitle || '',
      company: data.company || '',
      requiredSkills: data.requiredSkills || [],
      niceToHave: data.niceToHave || [],
      softSkills: data.softSkills || [],
      experienceLevel: data.experienceLevel || '',
      responsibilities: data.responsibilities || [],
    });

    res.status(201).json(jd);
  } catch (err) {
    res.status(500).json({ error: 'JD PDF upload failed', detail: err.message });
  }
});

module.exports = router;
