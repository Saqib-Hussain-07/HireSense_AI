jest.mock('../../src/models/InterviewSession');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const InterviewSession = require('../../src/models/InterviewSession');
const historyRoutes = require('../../src/routes/history');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/history', historyRoutes);
  return app;
}

describe('GET /api/history', () => {
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
    const res = await request(buildApp()).get('/api/history');
    expect(res.status).toBe(401);
  });

  test('returns paginated, lean sessions with defaults when no query params are passed', async () => {
    const mockSessions = [
      { _id: 's1', type: 'technical', persona: 'interviewer', overallScore: 85, createdAt: new Date() },
    ];

    InterviewSession.countDocuments = jest.fn().mockResolvedValue(1);

    const leanMock = jest.fn().mockResolvedValue(mockSessions);
    const selectMock = jest.fn().mockReturnValue({ lean: leanMock });
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

    InterviewSession.find = jest.fn().mockReturnValue({ sort: sortMock });

    const res = await request(buildApp())
      .get('/api/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(InterviewSession.countDocuments).toHaveBeenCalledWith({ userId });
    expect(InterviewSession.find).toHaveBeenCalledWith({ userId });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(20);
    expect(selectMock).toHaveBeenCalledWith('-questions.answerAudioUrl -questions.questionAudioUrl');
    expect(leanMock).toHaveBeenCalled();

    expect(res.body).toEqual({
      sessions: expect.any(Array),
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0]._id).toBe('s1');
  });

  test('correctly calculates skip and clamps limits to upper/lower bounds', async () => {
    InterviewSession.countDocuments = jest.fn().mockResolvedValue(120);

    const leanMock = jest.fn().mockResolvedValue([]);
    const selectMock = jest.fn().mockReturnValue({ lean: leanMock });
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

    InterviewSession.find = jest.fn().mockReturnValue({ sort: sortMock });

    // Request with limit 200 (should clamp to 50) and page 3 (skip = (3-1)*50 = 100)
    const res = await request(buildApp())
      .get('/api/history?page=3&limit=200')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(skipMock).toHaveBeenCalledWith(100);
    expect(limitMock).toHaveBeenCalledWith(50);
    expect(res.body.page).toBe(3);
    expect(res.body.limit).toBe(50);
    expect(res.body.total).toBe(120);
    expect(res.body.totalPages).toBe(3);
  });

  test('clamps negative or zero page and limit to safe minimum values', async () => {
    InterviewSession.countDocuments = jest.fn().mockResolvedValue(0);

    const leanMock = jest.fn().mockResolvedValue([]);
    const selectMock = jest.fn().mockReturnValue({ lean: leanMock });
    const limitMock = jest.fn().mockReturnValue({ select: selectMock });
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });

    InterviewSession.find = jest.fn().mockReturnValue({ sort: sortMock });

    const res = await request(buildApp())
      .get('/api/history?page=-2&limit=-5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(skipMock).toHaveBeenCalledWith(0); // page=1, limit=1 -> skip=0
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.total).toBe(0);
    expect(res.body.totalPages).toBe(1);
  });
});
