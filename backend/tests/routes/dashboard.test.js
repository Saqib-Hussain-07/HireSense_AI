jest.mock('../../src/models/InterviewSession');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const InterviewSession = require('../../src/models/InterviewSession');
const dashboardRoutes = require('../../src/routes/dashboard');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);
  return app;
}

describe('GET /api/dashboard/stats', () => {
  const userId = '507f1f77bcf86cd799439011';
  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_key';
    token = jwt.sign({ userId }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires authentication', async () => {
    const res = await request(buildApp()).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });

  test('computes projected, lean, single-pass metrics correctly', async () => {
    const mockSessions = [
      {
        _id: 's1',
        createdAt: '2026-03-01T10:00:00.000Z',
        overallScore: 8,
        questions: [
          {
            finalScore: 8,
            rubricScores: {
              relevance: 8,
              structure: 7,
              technicalAccuracy: 9,
              businessThinking: 7,
              star: 8,
              creativity: 6,
              deliveryScore: 9,
            },
          },
          {
            finalScore: 8,
            rubricScores: {
              relevance: 8,
              structure: 9,
              technicalAccuracy: 7,
              businessThinking: 9,
              star: 8,
              creativity: 8,
              deliveryScore: 7,
            },
          },
        ],
      },
      {
        _id: 's2',
        createdAt: '2026-03-02T10:00:00.000Z',
        overallScore: 9,
        questions: [
          {
            finalScore: 9,
            rubricScores: {
              relevance: 9,
              structure: 8,
              technicalAccuracy: 9,
              businessThinking: 9,
              star: 9,
              creativity: 9,
              deliveryScore: 8,
            },
          },
        ],
      },
    ];

    const sortMock = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSessions),
    });
    InterviewSession.find = jest.fn().mockReturnValue({
      sort: sortMock,
    });

    const res = await request(buildApp())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Verified projection was requested
    expect(InterviewSession.find).toHaveBeenCalledWith(
      { userId, status: 'completed' },
      'createdAt overallScore questions.finalScore questions.rubricScores'
    );
    expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });

    expect(res.body.totalSessions).toBe(2);
    expect(res.body.scoreTrend).toEqual([
      { date: '2026-03-01T10:00:00.000Z', overallScore: 8, sessionId: 's1', verified: true },
      { date: '2026-03-02T10:00:00.000Z', overallScore: 9, sessionId: 's2', verified: true },
    ]);

    expect(res.body.deliveryTrend).toEqual([
      { date: '2026-03-01T10:00:00.000Z', deliveryScore: 8, sessionId: 's1', verified: true },
      { date: '2026-03-02T10:00:00.000Z', deliveryScore: 8, sessionId: 's2', verified: true },
    ]);

    expect(res.body.technicalTrend).toEqual([
      { date: '2026-03-01T10:00:00.000Z', technicalAccuracy: 8, sessionId: 's1', verified: true },
      { date: '2026-03-02T10:00:00.000Z', technicalAccuracy: 9, sessionId: 's2', verified: true },
    ]);

    expect(res.body.dimAverages.technicalAccuracy).toBe(8.3);
    expect(res.body.dimAverages.relevance).toBe(8.3);
    expect(res.body.dimAverages.deliveryScore).toBe(8);
  });

  test('skips corrupt out-of-bounds sessions (>10)', async () => {
    const mockSessions = [
      {
        _id: 'corrupt1',
        createdAt: '2026-03-01T10:00:00.000Z',
        overallScore: 85, // out of bounds legacy 0-100 scale
        questions: [{ finalScore: 85, rubricScores: {} }],
      },
      {
        _id: 'valid1',
        createdAt: '2026-03-02T10:00:00.000Z',
        overallScore: 7,
        questions: [{ finalScore: 7, rubricScores: { relevance: 7 } }],
      },
    ];

    InterviewSession.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSessions),
      }),
    });

    const res = await request(buildApp())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(1);
    expect(res.body.scoreTrend).toHaveLength(1);
    expect(res.body.scoreTrend[0].sessionId).toBe('valid1');
  });

  test('handles empty sessions list gracefully', async () => {
    InterviewSession.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(buildApp())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(0);
    expect(res.body.scoreTrend).toEqual([]);
    expect(res.body.deliveryTrend).toEqual([]);
    expect(res.body.technicalTrend).toEqual([]);
    expect(res.body.dimAverages.relevance).toBeNull();
  });
});
