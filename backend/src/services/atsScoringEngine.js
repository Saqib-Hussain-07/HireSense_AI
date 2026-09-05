/**
 * ATS Scoring Engine
 * -------------------
 * Calculates a transparent, multi-dimensional ATS compatibility score:
 *   35%  Keyword/Skill Match      (deterministic — code)
 *   20%  Parseability/Formatting  (deterministic — code)
 *   20%  Quantified Impact        (deterministic regex — code)
 *   15%  Section Completeness     (deterministic — code)
 *   10%  Bullet/Language Quality  (LLM — qualitative evaluation)
 */

const ROLE_KEYWORD_BANKS = {
  frontend: [
    'javascript', 'typescript', 'react', 'next.js', 'vue', 'html', 'css',
    'tailwind', 'redux', 'webpack', 'vite', 'rest', 'graphql', 'responsive',
    'performance', 'git', 'testing', 'jest', 'accessibility', 'browser'
  ],
  backend: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust',
    'node', 'express', 'fastify', 'sql', 'postgresql', 'mysql', 'mongodb',
    'redis', 'docker', 'kubernetes', 'aws', 'git', 'linux', 'ci/cd',
    'rest', 'graphql', 'microservices', 'unit testing', 'api'
  ],
  devops: [
    'docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure', 'ci/cd',
    'github actions', 'jenkins', 'linux', 'ansible', 'monitoring',
    'prometheus', 'grafana', 'python', 'bash', 'security', 'infrastructure'
  ],
  data: [
    'python', 'sql', 'pandas', 'numpy', 'scikit-learn', 'pytorch',
    'tensorflow', 'spark', 'kafka', 'airflow', 'data modeling', 'etl',
    'aws', 'docker', 'git', 'statistics', 'machine learning'
  ],
  mobile: [
    'swift', 'kotlin', 'react native', 'flutter', 'ios', 'android',
    'mobile', 'rest', 'api', 'git', 'unit testing', 'ci/cd', 'sqlite'
  ],
  general: [
    'javascript', 'typescript', 'python', 'java', 'git', 'linux', 'docker',
    'sql', 'rest', 'api', 'aws', 'ci/cd', 'testing', 'agile', 'database',
    'architecture', 'debugging', 'performance', 'collaboration'
  ],
};

function resolveRoleCategory(targetRole = '') {
  const norm = targetRole.toLowerCase();
  if (norm.includes('front') || norm.includes('ui') || norm.includes('web')) return 'frontend';
  if (norm.includes('devops') || norm.includes('cloud') || norm.includes('sre') || norm.includes('infra')) return 'devops';
  if (norm.includes('data') || norm.includes('ml') || norm.includes('ai') || norm.includes('machine')) return 'data';
  if (norm.includes('mobile') || norm.includes('ios') || norm.includes('android')) return 'mobile';
  if (norm.includes('back') || norm.includes('software') || norm.includes('engineer') || norm.includes('full')) return 'backend';
  return 'general';
}

/**
 * 1. Keyword & Skill Match (35% weight)
 * Compares detected skills and resume text against role keyword requirements.
 */
function computeKeywordSkillMatch(rawText = '', parsedSkills = [], targetRole = 'general') {
  const category = resolveRoleCategory(targetRole);
  const keywords = ROLE_KEYWORD_BANKS[category] || ROLE_KEYWORD_BANKS.general;
  const lowerText = rawText.toLowerCase();

  const detectedSkillSet = new Set(
    (parsedSkills || []).map((s) => (typeof s === 'string' ? s.toLowerCase() : ''))
  );

  const matchedKeywords = [];
  const missingKeywords = [];

  for (const kw of keywords) {
    const isMatched =
      detectedSkillSet.has(kw) ||
      lowerText.includes(kw);

    if (isMatched) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  // 10+ matches represents full keyword coverage
  const coverageRatio = Math.min(1, matchedKeywords.length / 10);
  const coveragePoints = Math.round(coverageRatio * 70);

  // Bonus for unique detected skills from parsed data (up to 30 points)
  const uniqueSkillsCount = detectedSkillSet.size;
  const skillCountBonus = Math.min(30, Math.round((uniqueSkillsCount / 8) * 30));

  const score = Math.max(10, Math.min(100, coveragePoints + skillCountBonus));

  return {
    score,
    matchedCount: matchedKeywords.length,
    matchedKeywords,
    missingKeywords: missingKeywords.slice(0, 6),
  };
}

/**
 * 2. Parseability & Formatting (20% weight)
 * Checks text extraction cleanliness, word counts, contact fields, and absence of corrupted glyphs.
 */
function computeFormattingParseability(rawText = '') {
  const clean = (rawText || '').trim();
  if (!clean) {
    return { score: 0, wordCount: 0, hasEmail: false, hasPhone: false, hasLinks: false };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Length scoring (ideal resume is 350 to 1100 words)
  let lengthPoints = 10;
  if (wordCount >= 350 && wordCount <= 1100) {
    lengthPoints = 35;
  } else if ((wordCount >= 220 && wordCount < 350) || (wordCount > 1100 && wordCount <= 1500)) {
    lengthPoints = 25;
  } else if (wordCount >= 150) {
    lengthPoints = 15;
  }

  // Contact Info Parseability
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkRegex = /(?:linkedin\.com|github\.com|https?:\/\/|www\.)/i;

  const hasEmail = emailRegex.test(clean);
  const hasPhone = phoneRegex.test(clean);
  const hasLinks = linkRegex.test(clean);

  const contactPoints = (hasEmail ? 25 : 0) + (hasPhone ? 20 : 0) + (hasLinks ? 10 : 0);

  // Encoding & Special Character Cleanliness
  const badCharCount = (clean.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/g) || []).length;
  const encodingPoints = badCharCount === 0 ? 10 : badCharCount <= 5 ? 5 : 0;

  const score = Math.max(10, Math.min(100, lengthPoints + contactPoints + encodingPoints));

  return {
    score,
    wordCount,
    hasEmail,
    hasPhone,
    hasLinks,
    badCharCount,
  };
}

/**
 * 3. Quantified Impact (20% weight)
 * Uses deterministic regexes to verify numbers, percentages, multipliers, and scaled results.
 */
function computeQuantifiedImpact(rawText = '', parsedExperience = [], parsedProjects = []) {
  // Collect all experience highlights & project bullets
  const bullets = [];

  if (Array.isArray(parsedExperience)) {
    for (const exp of parsedExperience) {
      if (Array.isArray(exp.highlights)) {
        bullets.push(...exp.highlights);
      }
    }
  }

  if (Array.isArray(parsedProjects)) {
    for (const proj of parsedProjects) {
      if (proj.description) bullets.push(proj.description);
    }
  }

  // If parsed bullets are empty, fallback to lines starting with bullet indicators or verbs
  if (bullets.length === 0 && rawText) {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 25 && l.length <= 250);
    for (const line of lines) {
      if (/^[•\-*\u2022]\s+|^[A-Z][a-z]+ed\b/.test(line)) {
        bullets.push(line);
      }
    }
  }

  const metricPatterns = [
    /\b\d+(?:\.\d+)?%/g, // Percentages (e.g. 25%, 99.9%)
    /\b\d+(?:\.\d+)?x\b/gi, // Multipliers (e.g. 10x, 3x)
    /(?:\$|€|£|₹)\s?\d+(?:,\d{3})*(?:\.\d+)?[kKmMbB]?\b/g, // Dollar / Revenue
    /\b\d+(?:,\d{3})*\+?\s*(?:users|customers|queries|requests|qps|rps|tps|ms|seconds|minutes|hours|days|engineers|developers|clients|downloads|stars|nodes|servers|endpoints|gb|tb|mb)\b/gi,
    /\b(?:increased|decreased|reduced|grew|scaled|saved|improved|boosted|accelerated|cut|delivered)\b[^.!?\n]*?\b\d+/gi,
  ];

  function containsMetric(text) {
    return metricPatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
  }

  let totalBullets = bullets.length;
  let metricBulletsCount = 0;

  for (const bullet of bullets) {
    if (containsMetric(bullet)) {
      metricBulletsCount++;
    }
  }

  let score = 10;
  if (totalBullets > 0) {
    const ratio = metricBulletsCount / totalBullets;
    if (ratio >= 0.35) score = 100;
    else if (ratio >= 0.25) score = 85;
    else if (ratio >= 0.15) score = 70;
    else if (ratio >= 0.08) score = 50;
    else if (metricBulletsCount >= 1) score = 35;
    else score = 15;
  } else {
    // Fallback: scan full raw text for total metric occurrences
    let globalMetricMatches = 0;
    for (const pattern of metricPatterns) {
      pattern.lastIndex = 0;
      const matches = rawText.match(pattern);
      if (matches) globalMetricMatches += matches.length;
    }
    if (globalMetricMatches >= 5) score = 85;
    else if (globalMetricMatches >= 3) score = 70;
    else if (globalMetricMatches >= 1) score = 40;
    else score = 10;
  }

  return {
    score,
    totalBullets,
    metricBulletsCount,
  };
}

/**
 * 4. Section Completeness (15% weight)
 * Checks presence of canonical ATS resume sections: Contact, Experience, Skills, Education, Projects.
 */
function computeSectionCompleteness(rawText = '', parsed = {}) {
  const lowerText = rawText.toLowerCase();

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  const hasContact = emailRegex.test(rawText) || phoneRegex.test(rawText);
  const hasExperience =
    (Array.isArray(parsed.experience) && parsed.experience.length > 0) ||
    /(?:work\s+experience|professional\s+experience|employment|work\s+history|experience)/i.test(lowerText);
  const hasSkills =
    (Array.isArray(parsed.skills) && parsed.skills.length >= 3) ||
    /(?:technical\s+skills|core\s+skills|skills|technologies|proficiencies)/i.test(lowerText);
  const hasEducation =
    (Array.isArray(parsed.education) && parsed.education.length > 0) ||
    /(?:education|academic|university|degree|bachelor|master|phd|b\.s|m\.s)/i.test(lowerText);
  const hasProjects =
    (Array.isArray(parsed.projects) && parsed.projects.length > 0) ||
    (Array.isArray(parsed.certifications) && parsed.certifications.length > 0) ||
    /(?:projects|personal\s+projects|open\s+source|portfolio|certifications)/i.test(lowerText);

  const sections = {
    contact: { present: hasContact, points: 20 },
    experience: { present: hasExperience, points: 25 },
    skills: { present: hasSkills, points: 20 },
    education: { present: hasEducation, points: 20 },
    projects: { present: hasProjects, points: 15 },
  };

  let score = 0;
  const presentSections = [];
  const missingSections = [];

  for (const [name, conf] of Object.entries(sections)) {
    if (conf.present) {
      score += conf.points;
      presentSections.push(name);
    } else {
      missingSections.push(name);
    }
  }

  return {
    score: Math.max(10, Math.min(100, score)),
    presentSections,
    missingSections,
  };
}

/**
 * Computes composite ATS Score:
 *   35%  Keyword/Skill Match      (deterministic)
 *   20%  Parseability/Formatting  (deterministic)
 *   20%  Quantified Impact        (deterministic)
 *   15%  Section Completeness     (deterministic)
 *   10%  Bullet/Language Quality  (LLM evaluation)
 */
function computeAtsScore({
  rawText = '',
  parsed = {},
  targetRole = 'general',
  bulletQualityScore = 75,
}) {
  const keywordMatch = computeKeywordSkillMatch(rawText, parsed?.skills, targetRole);
  const formatting = computeFormattingParseability(rawText);
  const impact = computeQuantifiedImpact(rawText, parsed?.experience, parsed?.projects);
  const completeness = computeSectionCompleteness(rawText, parsed);

  // Bullet Quality (LLM): clamp between 10 and 100
  const bulletQuality = Math.max(10, Math.min(100, Math.round(Number(bulletQualityScore) || 75)));

  const weightedTotal =
    keywordMatch.score * 0.35 +
    formatting.score * 0.20 +
    impact.score * 0.20 +
    completeness.score * 0.15 +
    bulletQuality * 0.10;

  const atsScore = Math.max(10, Math.min(100, Math.round(weightedTotal)));

  return {
    atsScore,
    breakdown: {
      keywordSkillMatch: {
        score: keywordMatch.score,
        weight: '35%',
        points: parseFloat((keywordMatch.score * 0.35).toFixed(1)),
        matchedCount: keywordMatch.matchedCount,
        missingKeywords: keywordMatch.missingKeywords,
      },
      formattingParseability: {
        score: formatting.score,
        weight: '20%',
        points: parseFloat((formatting.score * 0.20).toFixed(1)),
        wordCount: formatting.wordCount,
        hasEmail: formatting.hasEmail,
        hasPhone: formatting.hasPhone,
      },
      quantifiedImpact: {
        score: impact.score,
        weight: '20%',
        points: parseFloat((impact.score * 0.20).toFixed(1)),
        metricBulletsCount: impact.metricBulletsCount,
        totalBullets: impact.totalBullets,
      },
      sectionCompleteness: {
        score: completeness.score,
        weight: '15%',
        points: parseFloat((completeness.score * 0.15).toFixed(1)),
        presentSections: completeness.presentSections,
        missingSections: completeness.missingSections,
      },
      bulletQuality: {
        score: bulletQuality,
        weight: '10%',
        points: parseFloat((bulletQuality * 0.10).toFixed(1)),
      },
    },
    missingKeywords: keywordMatch.missingKeywords,
  };
}

module.exports = {
  computeKeywordSkillMatch,
  computeFormattingParseability,
  computeQuantifiedImpact,
  computeSectionCompleteness,
  computeAtsScore,
};
