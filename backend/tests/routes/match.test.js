jest.mock('../../src/models/Resume');
jest.mock('../../src/models/JobDescription');
jest.mock('../../src/models/MatchReport');
jest.mock('../../src/services/aiAdapter');
jest.mock('../../src/services/atsScoringEngine');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Resume = require('../../src/models/Resume');
const JobDescription = require('../../src/models/JobDescription');
const MatchReport = require('../../src/models/MatchReport');
const { callAI } = require('../../src/services/aiAdapter');
const { computeAtsScore } = require('../../src/services/atsScoringEngine');
const matchRoutes = require('../../src/routes/match');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/match', matchRoutes);
  return app;
}

describe('POST /api/match (Match Report Caching and Upsert)', () => {
  const userId = '507f1f77bcf86cd799439011';
  const resumeId = '507f1f77bcf86cd799439022';
  const jdId = '507f1f77bcf86cd799439033';
  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_key';
    token = jwt.sign({ userId }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires authentication', async () => {
    const res = await request(buildApp()).post('/api/match').send({ resumeId, jdId });
    expect(res.status).toBe(401);
  });

  test('returns 400 when resumeId or jdId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  test('returns 404 when resume or JD is not found for this user', async () => {
    Resume.findOne = jest.fn().mockResolvedValue(null);
    JobDescription.findOne = jest.fn().mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jdId });
    expect(res.status).toBe(404);
  });

  test('generates fresh match report and upserts when no cached report exists', async () => {
    const mockResume = {
      _id: resumeId,
      userId,
      rawText: 'Experienced Node.js engineer',
      parsed: { skills: ['Node.js', 'React'] },
      save: jest.fn().mockResolvedValue(true),
    };
    const mockJd = {
      _id: jdId,
      userId,
      jobTitle: 'Backend Engineer',
      company: 'Tech Corp',
    };

    Resume.findOne = jest.fn().mockResolvedValue(mockResume);
    JobDescription.findOne = jest.fn().mockResolvedValue(mockJd);

    // Mock no existing report found
    const sortMock = jest.fn().mockResolvedValue(null);
    MatchReport.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    computeAtsScore.mockReturnValue({
      score: 85,
      scoreLabel: 'Strong Match for Backend Engineer',
      breakdown: { keywordMatch: 85 },
      missingKeywords: ['Docker'],
      matchedKeywords: ['Node.js'],
    });

    callAI.mockResolvedValue({
      data: {
        skillGaps: [{ skill: 'Docker', why: 'Required for container deployment', resources: [] }],
        missing: ['Docker'],
        strong: ['Node.js'],
      },
    });

    const mockUpsertedReport = {
      _id: 'mr1',
      userId,
      resumeId,
      jdId,
      matchPercent: 85,
    };
    MatchReport.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpsertedReport);

    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jdId });

    expect(res.status).toBe(201);
    expect(computeAtsScore).toHaveBeenCalled();
    expect(callAI).toHaveBeenCalled();
    expect(MatchReport.findOneAndUpdate).toHaveBeenCalledWith(
      { userId, resumeId, jdId },
      expect.objectContaining({
        $set: expect.objectContaining({ matchPercent: 85 }),
      }),
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expect(mockResume.save).toHaveBeenCalled();
  });

  test('returns cached report without re-scoring or calling AI if within TTL and inputs unchanged', async () => {
    const now = new Date();
    const mockResume = {
      _id: resumeId,
      userId,
      targetJdId: jdId,
      updatedAt: new Date(now.getTime() - 60000), // 1 min ago
      save: jest.fn().mockResolvedValue(true),
    };
    const mockJd = {
      _id: jdId,
      userId,
      jobTitle: 'Backend Engineer',
      updatedAt: new Date(now.getTime() - 60000), // 1 min ago
    };

    const mockCachedReport = {
      _id: 'mr1',
      userId,
      resumeId,
      jdId,
      matchPercent: 88,
      createdAt: new Date(now.getTime() - 30000), // 30s ago (fresh)
      updatedAt: new Date(now.getTime() - 30000),
    };

    Resume.findOne = jest.fn().mockResolvedValue(mockResume);
    JobDescription.findOne = jest.fn().mockResolvedValue(mockJd);

    const sortMock = jest.fn().mockResolvedValue(mockCachedReport);
    MatchReport.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jdId });

    expect(res.status).toBe(200);
    expect(res.body.matchPercent).toBe(88);
    // Verified: computeAtsScore and callAI were short-circuited!
    expect(computeAtsScore).not.toHaveBeenCalled();
    expect(callAI).not.toHaveBeenCalled();
    expect(MatchReport.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('bypasses cache and recomputes when forceRefresh: true is provided', async () => {
    const now = new Date();
    const mockResume = {
      _id: resumeId,
      userId,
      rawText: 'Experienced Node.js engineer',
      parsed: { skills: ['Node.js'] },
      save: jest.fn().mockResolvedValue(true),
    };
    const mockJd = {
      _id: jdId,
      userId,
      jobTitle: 'Backend Engineer',
      company: 'Acme',
    };

    const mockCachedReport = {
      _id: 'mr1',
      userId,
      resumeId,
      jdId,
      matchPercent: 70,
      createdAt: new Date(now.getTime() - 30000),
      updatedAt: new Date(now.getTime() - 30000),
    };

    Resume.findOne = jest.fn().mockResolvedValue(mockResume);
    JobDescription.findOne = jest.fn().mockResolvedValue(mockJd);

    const sortMock = jest.fn().mockResolvedValue(mockCachedReport);
    MatchReport.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    computeAtsScore.mockReturnValue({
      score: 90,
      scoreLabel: 'Strong Match',
      breakdown: {},
      missingKeywords: [],
      matchedKeywords: ['Node.js'],
    });

    callAI.mockResolvedValue({ data: { skillGaps: [], missing: [], strong: [] } });
    MatchReport.findOneAndUpdate = jest.fn().mockResolvedValue({ ...mockCachedReport, matchPercent: 90 });

    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jdId, forceRefresh: true });

    expect(res.status).toBe(200);
    expect(computeAtsScore).toHaveBeenCalled();
    expect(callAI).toHaveBeenCalled();
    expect(MatchReport.findOneAndUpdate).toHaveBeenCalled();
  });

  test('invalidates cache and recomputes if resume was modified after the cached report was generated', async () => {
    const now = new Date();
    const mockResume = {
      _id: resumeId,
      userId,
      rawText: 'Newly updated resume',
      parsed: { skills: ['Node.js', 'Kubernetes'] },
      updatedAt: new Date(now.getTime() - 5000), // modified 5 seconds ago
      save: jest.fn().mockResolvedValue(true),
    };
    const mockJd = {
      _id: jdId,
      userId,
      jobTitle: 'Backend Engineer',
      updatedAt: new Date(now.getTime() - 60000),
    };

    const mockCachedReport = {
      _id: 'mr1',
      userId,
      resumeId,
      jdId,
      matchPercent: 70,
      createdAt: new Date(now.getTime() - 20000), // generated 20s ago (older than resume.updatedAt)
      updatedAt: new Date(now.getTime() - 20000),
    };

    Resume.findOne = jest.fn().mockResolvedValue(mockResume);
    JobDescription.findOne = jest.fn().mockResolvedValue(mockJd);

    const sortMock = jest.fn().mockResolvedValue(mockCachedReport);
    MatchReport.findOne = jest.fn().mockReturnValue({ sort: sortMock });

    computeAtsScore.mockReturnValue({
      score: 95,
      scoreLabel: 'Exceptional Match',
      breakdown: {},
      missingKeywords: [],
      matchedKeywords: ['Kubernetes'],
    });

    callAI.mockResolvedValue({ data: { skillGaps: [], missing: [], strong: [] } });
    MatchReport.findOneAndUpdate = jest.fn().mockResolvedValue({ ...mockCachedReport, matchPercent: 95 });

    const res = await request(buildApp())
      .post('/api/match')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jdId });

    expect(res.status).toBe(200);
    expect(computeAtsScore).toHaveBeenCalled();
  });
});
