const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { analyzeGithubRepo } = require('../services/githubEngine');

const router = express.Router();
router.use(requireAuth);

// POST /api/github/analyze  { repoUrl } -> project-specific questions
router.post('/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });
    const result = await analyzeGithubRepo(repoUrl);
    res.json(result);
  } catch (err) {
    res.status(422).json({ error: 'GitHub analysis failed', detail: err.message });
  }
});

module.exports = router;
