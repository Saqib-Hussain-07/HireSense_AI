jest.mock('../../src/models/InterviewSession');
jest.mock('../../src/models/User');
jest.mock('../../src/models/MatchReport');
jest.mock('../../src/models/Resume');
jest.mock('../../src/models/JobDescription');
jest.mock('../../src/services/scoringEngine');
jest.mock('../../src/services/followUpEngine');
jest.mock('../../src/services/voiceAdapter');
jest.mock('../../src/services/aiAdapter');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const InterviewSession = require('../../src/models/InterviewSession');
const User = require('../../src/models/User');
const { scoreAnswer } = require('../../src/services/scoringEngine');
const interviewRoutes = require('../../src/routes/interview');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/interview', interviewRoutes);
  return app;
}

function tokenFor(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /api/interview/:id/answer', () => {
  test('scores the answer, updates the question, and advances currentQuestionIndex', async () => {
    const sessionDoc = {
      _id: 'sess1',
      mode: 'coaching',
      currentQuestionIndex: 0,
      questions: [{ questionText: 'Explain event loop', answerTranscript: '', finalScore: 0 }],
      save: jest.fn().mockResolvedValue(true),
    };
    InterviewSession.findOne.mockResolvedValue(sessionDoc);
    User.findById.mockResolvedValue({ targetRole: 'Backend Engineer' });

    scoreAnswer.mockResolvedValue({
      rubricScores: { relevance: 15, structure: 10, technicalAccuracy: 18, businessThinking: 5, deliveryScore: 8, star: 6, creativity: 3 },
      finalScore: 72,
      idealAnswer: 'A concise answer covering the call stack, task queue, and microtasks.',
      gapNotes: 'Missed microtasks vs macrotasks distinction.',
      evidenceQuotes: [],
      deliveryMeta: { fillerCount: 1, wpm: 130, wordCount: 40 },
    });

    const token = tokenFor('user1');
    const res = await request(buildApp())
      .post('/api/interview/sess1/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 0, answerTranscript: 'The event loop handles the call stack and task queue.', durationSeconds: 18 });

    expect(res.status).toBe(200);
    expect(scoreAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Explain event loop', targetRole: 'Backend Engineer', mode: 'coaching' })
    );
    expect(sessionDoc.questions[0].finalScore).toBe(72);
    expect(sessionDoc.save).toHaveBeenCalled();
    expect(res.body.currentQuestionIndex).toBe(1);
  });

  test('returns 401 without a valid auth token', async () => {
    const res = await request(buildApp()).post('/api/interview/sess1/answer').send({ questionIndex: 0, answerTranscript: 'hi' });
    expect(res.status).toBe(401);
  });

  test('returns 400 for an out-of-range questionIndex', async () => {
    InterviewSession.findOne.mockResolvedValue({ _id: 'sess1', questions: [], save: jest.fn() });
    const token = tokenFor('user1');
    const res = await request(buildApp())
      .post('/api/interview/sess1/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 5, answerTranscript: 'hi' });
    expect(res.status).toBe(400);
  });

  test('returns 404 when the session does not belong to this user / does not exist', async () => {
    InterviewSession.findOne.mockResolvedValue(null);
    const token = tokenFor('user1');
    const res = await request(buildApp())
      .post('/api/interview/sess1/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 0, answerTranscript: 'hi' });
    expect(res.status).toBe(404);
  });
});
