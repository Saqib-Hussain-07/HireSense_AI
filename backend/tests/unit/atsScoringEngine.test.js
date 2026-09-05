const {
  quantifiedImpactScore,
  computeKeywordSkillMatch,
  computeFormattingParseability,
  computeQuantifiedImpact,
  computeSectionCompleteness,
  computeBulletQuality,
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

    test('quantifiedImpactScore calculates exact ratio of bullets with numbers, % or $', () => {
      const bullets = [
        'Reduced p99 latency by 35% across cluster',
        'Saved $1.2M in annual cloud costs',
        'Managed team of 6 engineers',
        'Responsible for documentation and bug fixes',
      ];
      // 3 out of 4 contain \d, %, or $
      expect(quantifiedImpactScore(bullets)).toBe(0.75);
      expect(quantifiedImpactScore([])).toBe(0);
      expect(quantifiedImpactScore(['No numbers here at all'])).toBe(0);
    });
  });

  describe('computeBulletQuality (10% weight)', () => {
    test('rewards high ratio of strong to weak bullets and penalizes high weak bullet counts', () => {
      const allBullets = [
        'Architected real-time messaging pipeline handling 100k events/sec',
        'Scaled Postgres cluster with zero downtime',
        'Built automated CI/CD pipelines in GitHub Actions',
        'Mentored 3 junior software engineers',
      ];
      const weakBullets = [
        {
          original: 'Mentored 3 junior software engineers',
          suggested: 'Mentored and coached 3 junior engineers, accelerating time-to-first-commit by 40%',
          note: 'Lacks measurable outcome for mentorship',
        },
      ];

      // 3 of 4 bullets strong -> ratio 0.75 -> score ~85
      const score = computeBulletQuality(allBullets, weakBullets);
      expect(score).toBeGreaterThanOrEqual(80);

      // All bullets weak -> 0 strong -> score 40
      const lowScore = computeBulletQuality(allBullets, [
        { original: 'b1' },
        { original: 'b2' },
        { original: 'b3' },
        { original: 'b4' },
      ]);
      expect(lowScore).toBeLessThanOrEqual(50);

      // No weak bullets -> 100
      const perfectScore = computeBulletQuality(allBullets, []);
      expect(perfectScore).toBe(100);
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

    test('derives bulletQuality deterministically in code when weakBullets are provided', () => {
      const rawText = `
        Alex Smith
        alex@example.com | 555-222-3333 | linkedin.com/in/alex
        Experience:
        Software Engineer
        - Architected streaming pipeline in Go handling 1M messages per second.
        - Optimized queries reducing latency by 45%.
        - Assisted with feature deployments.
        Education: BS Software Engineering
        Skills: Go, Python, Docker, Kubernetes, AWS, Postgres, Redis, Git, Linux, CI/CD
        Projects: Real-time dashboard
        ${'engineered scalable microservices '.repeat(100)}
      `;
      const parsed = {
        skills: ['Go', 'Python', 'Docker', 'Kubernetes', 'AWS', 'Postgres', 'Redis', 'Git', 'Linux'],
        experience: [
          {
            highlights: [
              'Architected streaming pipeline in Go handling 1M messages per second.',
              'Optimized queries reducing latency by 45%.',
              'Assisted with feature deployments.',
            ],
          },
        ],
        education: [{ degree: 'BS' }],
        projects: [{ name: 'Real-time dashboard' }],
      };
      const weakBullets = [
        {
          original: 'Assisted with feature deployments.',
          suggested: 'Automated feature deployments using ArgoCD, reducing release cycle time by 60%.',
          note: 'Lacks action verb and impact metric.',
        },
      ];

      // No bulletQualityScore passed — derived strictly from 2 strong / 1 weak bullets
      const result = computeAtsScore({
        rawText,
        parsed,
        targetRole: 'Backend Engineer',
        weakBullets,
      });

      // 2 strong out of 3 total -> ratio 0.67 -> bulletQuality score ~80
      expect(result.breakdown.bulletQuality.score).toBeGreaterThanOrEqual(75);
      expect(result.breakdown.bulletQuality.weight).toBe('10%');
      expect(result.atsScore).toBeGreaterThanOrEqual(75);
    });
  });

  describe('unified scoring formula (generic vs JD match)', () => {
    const rawText = `
      Jordan Lee | jordan@example.com | 555-111-2222
      Experience:
      Cloud Platform Engineer at Acme
      - Orchestrated Kubernetes clusters across 3 regions with 99.99% availability.
      - Automated infrastructure using Terraform, reducing provisioning time by 75%.
      - Migrated legacy services to AWS EKS, saving $150K in compute costs.
      Education: BS Computer Science
      Skills: Kubernetes, Terraform, AWS, Docker, Linux, Python
      Projects: Multi-cloud monitoring system
      ${'cloud infrastructure reliability engineering '.repeat(100)}
    `;

    const parsed = {
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'Linux', 'Python'],
      experience: [
        {
          highlights: [
            'Orchestrated Kubernetes clusters across 3 regions with 99.99% availability.',
            'Automated infrastructure using Terraform, reducing provisioning time by 75%.',
            'Migrated legacy services to AWS EKS, saving $150K in compute costs.',
          ],
        },
      ],
      education: [{ degree: 'BS' }],
      projects: [{ name: 'Multi-cloud monitoring system' }],
    };

    test('generic evaluation (jd: null) outputs Generic ATS Score label', () => {
      const result = computeAtsScore({
        rawText,
        parsed,
        targetRole: 'DevOps Engineer',
        jd: null,
      });

      expect(result.isJdSpecific).toBe(false);
      expect(result.scoreLabel).toBe('Generic ATS Score');
      expect(result.atsScore).toBeGreaterThanOrEqual(80);
      expect(result.breakdown.keywordSkillMatch.label).toBe('Keyword & Skill Match');
    });

    test('JD match evaluation (jd: {...}) outputs Match Score for [Job Title] and targets JD skills', () => {
      const jd = {
        _id: 'jd_12345',
        jobTitle: 'Senior Infrastructure Engineer',
        company: 'CloudScale',
        requiredSkills: ['Kubernetes', 'Terraform', 'AWS'],
        niceToHave: ['Go', 'Rust'],
      };

      const result = computeAtsScore({
        rawText,
        parsed,
        targetRole: 'DevOps',
        jd,
      });

      expect(result.isJdSpecific).toBe(true);
      expect(result.scoreLabel).toBe('Match Score for Senior Infrastructure Engineer (CloudScale)');
      expect(result.targetJdId).toBe('jd_12345');
      expect(result.breakdown.keywordSkillMatch.label).toBe('JD Skill & Keyword Match');

      // Candidate has Kubernetes, Terraform, AWS (all required matches)
      expect(result.breakdown.keywordSkillMatch.matchedKeywords).toEqual(
        expect.arrayContaining(['Kubernetes', 'Terraform', 'AWS'])
      );
      // Missing nice-to-have skills: Go, Rust
      expect(result.breakdown.keywordSkillMatch.missingKeywords).toEqual(
        expect.arrayContaining(['Go', 'Rust'])
      );
      expect(result.matchPercent).toBe(result.score);
    });
  });
});
