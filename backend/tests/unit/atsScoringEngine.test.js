const {
  computeKeywordSkillMatch,
  computeFormattingParseability,
  computeQuantifiedImpact,
  computeSectionCompleteness,
  computeAtsScore,
} = require('../../src/services/atsScoringEngine');

describe('atsScoringEngine', () => {
  describe('computeKeywordSkillMatch (35% weight)', () => {
    test('rewards matching role keywords and detected skills', () => {
      const rawText = 'Proficient in Python, SQL, Docker, AWS, Git, and Linux. Built REST APIs using Node and Express.';
      const parsedSkills = ['Python', 'SQL', 'Docker', 'AWS', 'Node.js', 'Express', 'Git', 'Linux'];
      const result = computeKeywordSkillMatch(rawText, parsedSkills, 'Backend Engineer');

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.matchedCount).toBeGreaterThanOrEqual(6);
      expect(result.matchedKeywords).toContain('python');
      expect(result.matchedKeywords).toContain('docker');
    });

    test('flags missing role keywords when resume is sparse', () => {
      const rawText = 'I am a junior coder who loves computers.';
      const result = computeKeywordSkillMatch(rawText, [], 'Frontend Developer');

      expect(result.score).toBeLessThanOrEqual(30);
      expect(result.missingKeywords.length).toBeGreaterThanOrEqual(3);
      expect(result.missingKeywords).toContain('javascript');
    });
  });

  describe('computeFormattingParseability (20% weight)', () => {
    test('full points for optimal word count, valid email, phone, and links', () => {
      const rawText = `
        John Doe
        john.doe@example.com | (555) 123-4567 | github.com/johndoe
        Software Engineer with 5 years of experience designing high-throughput systems.
        ${'word '.repeat(400)}
      `;
      const result = computeFormattingParseability(rawText);

      expect(result.hasEmail).toBe(true);
      expect(result.hasPhone).toBe(true);
      expect(result.hasLinks).toBe(true);
      expect(result.score).toBe(100);
    });

    test('penalizes missing contact info and extreme brevity', () => {
      const rawText = 'Just three sentences. No contact details at all.';
      const result = computeFormattingParseability(rawText);

      expect(result.hasEmail).toBe(false);
      expect(result.hasPhone).toBe(false);
      expect(result.score).toBeLessThanOrEqual(30);
    });

    test('detects scanned/image PDFs when charsPerKB < 2 and flags parseability issue', () => {
      // 50 characters extracted from a 500 KB image-heavy/scanned PDF -> 0.1 chars/KB
      const sparseScannedText = 'Scanned document heading with only very few characters';
      const fileSizeBytes = 500 * 1024;
      const result = computeFormattingParseability(sparseScannedText, fileSizeBytes, 'application/pdf');

      expect(result.charsPerKB).toBeLessThan(2);
      expect(result.score).toBe(20);
      expect(result.issue).toMatch(/Likely a scanned\/image PDF/i);
    });

    test('validates healthy text density for text-based PDFs', () => {
      // 2500 characters extracted from a 50 KB text PDF -> ~50 chars/KB
      const richText = `
        Jane Developer
        jane@example.com | 555-123-4567 | github.com/janedev
        Experience:
        Senior Software Engineer building scalable microservices and data pipelines.
        Education:
        BS Computer Science.
        Skills:
        Python, JavaScript, React, Docker, Kubernetes, AWS, PostgreSQL, Redis, Linux, Git.
        ${'engineered reliable high-throughput microservices '.repeat(100)}
      `;
      const fileSizeBytes = 50 * 1024;
      const result = computeFormattingParseability(richText, fileSizeBytes, 'application/pdf');

      expect(result.charsPerKB).toBeGreaterThanOrEqual(2);
      expect(result.issue).toBeNull();
      expect(result.score).toBe(100);
    });
  });

  describe('computeQuantifiedImpact (20% weight)', () => {
    test('detects percentages, multipliers, dollar amounts, and metric scales in bullets', () => {
      const parsedExperience = [
        {
          highlights: [
            'Spearheaded caching initiative, reducing p99 latency by 35% across 50M daily requests.',
            'Scaled database cluster to handle 10x throughput with zero downtime.',
            'Generated $1.2M in annual cloud infrastructure cost savings.',
            'Mentored 4 junior engineers on distributed systems best practices.',
          ],
        },
      ];
      const result = computeQuantifiedImpact('', parsedExperience, []);

      // 3 of 4 bullets contain metrics -> 75% ratio -> 100 points
      expect(result.metricBulletsCount).toBeGreaterThanOrEqual(3);
      expect(result.score).toBe(100);
    });

    test('scores low when bullets have zero metrics or numbers', () => {
      const parsedExperience = [
        {
          highlights: [
            'Responsible for fixing bugs in the web app.',
            'Attended daily standup meetings and worked on features.',
            'Helped the team write code.',
          ],
        },
      ];
      const result = computeQuantifiedImpact('', parsedExperience, []);

      expect(result.metricBulletsCount).toBe(0);
      expect(result.score).toBeLessThanOrEqual(20);
    });
  });

  describe('computeSectionCompleteness (15% weight)', () => {
    test('awards full points when all 5 standard ATS sections are present', () => {
      const rawText = 'Contact: test@example.com, (555) 000-1111';
      const parsed = {
        experience: [{ role: 'Engineer', company: 'Acme' }],
        skills: ['JavaScript', 'Node.js', 'PostgreSQL', 'Docker'],
        education: [{ degree: 'BS Computer Science', school: 'MIT' }],
        projects: [{ name: 'Open Source App' }],
      };
      const result = computeSectionCompleteness(rawText, parsed);

      expect(result.score).toBe(100);
      expect(result.presentSections).toEqual(
        expect.arrayContaining(['contact', 'experience', 'skills', 'education', 'projects'])
      );
      expect(result.missingSections).toHaveLength(0);
    });

    test('identifies missing sections when resume lacks education or projects', () => {
      const rawText = 'Contact: test@example.com';
      const parsed = {
        experience: [{ role: 'Engineer', company: 'Acme' }],
        skills: ['JavaScript', 'Node.js', 'React'],
      };
      const result = computeSectionCompleteness(rawText, parsed);

      expect(result.missingSections).toContain('education');
      expect(result.missingSections).toContain('projects');
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('computeAtsScore (35/20/20/15/10 composition)', () => {
    test('correctly calculates weighted composite ATS score and breakdown', () => {
      const rawText = `
        Jane Doe
        jane.doe@example.com | 555-888-9999 | github.com/janedoe
        Experience:
        Senior Software Engineer at Stripe
        - Reduced payment latency by 28% for 10M daily transactions.
        - Architected Redis caching layer, saving $400K annually.
        Skills: Python, Go, PostgreSQL, Docker, Kubernetes, AWS, Redis, Kafka, Git, Linux, CI/CD
        Education: BS Computer Science, Stanford University
        Projects: Distributed task queue handling 5,000 tasks/sec.
        ${'word '.repeat(350)}
      `;

      const parsed = {
        skills: ['Python', 'Go', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Redis', 'Kafka', 'Git', 'Linux'],
        experience: [
          {
            role: 'Senior Software Engineer',
            company: 'Stripe',
            highlights: [
              'Reduced payment latency by 28% for 10M daily transactions.',
              'Architected Redis caching layer, saving $400K annually.',
            ],
          },
        ],
        education: [{ degree: 'BS Computer Science', school: 'Stanford University' }],
        projects: [{ name: 'Distributed task queue', description: 'Handles 5000 tasks/sec' }],
      };

      const result = computeAtsScore({
        rawText,
        parsed,
        targetRole: 'Backend Engineer',
        bulletQualityScore: 85,
      });

      expect(result.atsScore).toBeGreaterThanOrEqual(80);
      expect(result.breakdown.keywordSkillMatch.weight).toBe('35%');
      expect(result.breakdown.formattingParseability.weight).toBe('20%');
      expect(result.breakdown.quantifiedImpact.weight).toBe('20%');
      expect(result.breakdown.sectionCompleteness.weight).toBe('15%');
      expect(result.breakdown.bulletQuality.weight).toBe('10%');

      // Verify exact mathematical formula
      const expectedTotal = Math.round(
        result.breakdown.keywordSkillMatch.score * 0.35 +
        result.breakdown.formattingParseability.score * 0.20 +
        result.breakdown.quantifiedImpact.score * 0.20 +
        result.breakdown.sectionCompleteness.score * 0.15 +
        result.breakdown.bulletQuality.score * 0.10
      );
      expect(result.atsScore).toBe(expectedTotal);
    });
  });
});
