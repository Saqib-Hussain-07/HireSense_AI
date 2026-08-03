/**
 * GitHub Analyzer + Project Explainer (blueprint 3B.15)
 * ------------------------------------------------------
 * Candidate shares a public repo URL -> we pull metadata + README from the
 * GitHub REST API (no auth needed for public repos, but rate-limited to
 * 60 req/hr per IP without a token — set GITHUB_TOKEN in .env to raise that
 * limit for real usage) -> one narrow AI call generates project-specific
 * spoken interview questions.
 */

const fetch = require('node-fetch');
const { callAI } = require('./aiAdapter');
const { githubQuestionsPrompt } = require('../utils/prompts');

function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) throw new Error('Could not parse a GitHub owner/repo from that URL');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

function githubHeaders() {
  const headers = { 'User-Agent': 'HireSenseAI', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function fetchRepoData(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = githubHeaders();

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error('Repository not found (is it public?)');
    if (repoRes.status === 403) throw new Error('GitHub API rate limit hit — set GITHUB_TOKEN in .env to raise the limit');
    throw new Error(`GitHub API error ${repoRes.status}`);
  }
  const repoJson = await repoRes.json();

  const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
  const langData = langRes.ok ? await langRes.json() : {};
  const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
  const languages = Object.entries(langData).map(([name, bytes]) => ({
    name,
    percentage: totalBytes ? Math.round((bytes / totalBytes) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);

  let readmeExcerpt = '';
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeJson = await readmeRes.json();
      readmeExcerpt = Buffer.from(readmeJson.content, readmeJson.encoding).toString('utf-8');
    }
  } catch (e) {
    console.warn('[githubEngine] README fetch failed (non-fatal):', e.message);
  }

  return {
    repoName: repoJson.full_name,
    description: repoJson.description,
    languages,
    readmeExcerpt,
    stars: repoJson.stargazers_count,
    url: repoJson.html_url,
  };
}

async function analyzeGithubRepo(repoUrl) {
  const repoData = await fetchRepoData(repoUrl);
  const { data } = await callAI({ ...githubQuestionsPrompt(repoData), jsonOnly: true });
  return {
    repo: repoData,
    summary: data.summary || '',
    categories: data.categories || { Architecture: [], Implementation: [], 'Testing & Tradeoffs': [] }
  };
}

module.exports = { analyzeGithubRepo };
