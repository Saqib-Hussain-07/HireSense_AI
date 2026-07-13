jest.mock('../../src/models/InterviewSession');
jest.mock('../../src/models/InterviewPack');
jest.mock('../../src/models/MatchReport');
jest.mock('../../src/models/Resume');
jest.mock('../../src/models/JobDescription');
jest.mock('../../src/models/User');
jest.mock('../../src/services/scoringEngine');
jest.mock('../../src/services/followUpEngine');
jest.mock('../../src/services/voiceAdapter');
jest.mock('../../src/services/aiAdapter');
jest.mock('../../src/services/panelEngine');
jest.mock('../../src/services/packEngine');
jest.mock('../../src/services/weaknessEngine');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const InterviewSession = require('../../src/models/InterviewSession');
const InterviewPack = require('../../src/models/InterviewPack');
const { generatePanelQuestions } = require('../../src/services/panelEngine');
const { buildQuestionsFromPack } = require('../../src/services/packEngine');
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

describe('POST /api/interview/generate (Panel Mode)', () => {
  test('rejects panelPersonas that is not exactly 2 entries', async () => {
    const res = await request(buildApp())
      .post('/api/interview/generate')
      .set('Authorization', `Bearer ${tokenFor('u1')}`)
      .send({ panelPersonas: ['friendly_mentor'] });
    expect(res.status).toBe(400);
    expect(generatePanelQuestions).not.toHaveBeenCalled();
  });

  test('builds a session from panel-generated questions, tagging panelPersonas and using panelPersonas[0] as legacy persona', async () => {
    generatePanelQuestions.mockResolvedValue([
      { questionText: 'Q1', persona: 'strict_recruiter' },
      { questionText: 'Q2', persona: 'faang_engineer' },
    ]);
    InterviewSession.create.mockResolvedValue({ _id: 'sess1', questions: [] });

    const res = await request(buildApp())
      .post('/api/interview/generate')
      .set('Authorization', `Bearer ${tokenFor('u1')}`)
      .send({ panelPersonas: ['strict_recruiter', 'faang_engineer'], type: 'technical', difficulty: 'medium' });

    expect(res.status).toBe(201);
    expect(InterviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        persona: 'strict_recruiter',
        panelPersonas: ['strict_recruiter', 'faang_engineer'],
        questions: [
          { questionText: 'Q1', persona: 'strict_recruiter' },
          { questionText: 'Q2', persona: 'faang_engineer' },
        ],
      })
    );
  });
});

describe('POST /api/interview/generate-from-pack', () => {
  test('404s when the pack does not exist', async () => {
    InterviewPack.findById.mockResolvedValue(null);
    const res = await request(buildApp())
      .post('/api/interview/generate-from-pack')
      .set('Authorization', `Bearer ${tokenFor('u1')}`)
      .send({ packId: 'nope' });
    expect(res.status).toBe(404);
  });

  test('builds a session using the pack engine output and returns question sources', async () => {
    InterviewPack.findById.mockResolvedValue({ _id: 'pack1', company: 'Google', defaultType: 'technical', defaultDifficulty: 'medium', defaultPersona: 'faang_engineer' });
    buildQuestionsFromPack.mockResolvedValue({
      questions: [
        { questionText: 'Bank Q', source: 'company_bank' },
        { questionText: 'AI Q', source: 'ai_generated' },
      ],
      effectiveType: 'technical',
      effectiveDifficulty: 'medium',
      effectivePersona: 'faang_engineer',
    });
    InterviewSession.create.mockResolvedValue({ _id: 'sess2' });

    const res = await request(buildApp())
      .post('/api/interview/generate-from-pack')
      .set('Authorization', `Bearer ${tokenFor('u1')}`)
      .send({ packId: 'pack1' });

    expect(res.status).toBe(201);
    expect(res.body.questionSources).toEqual(['company_bank', 'ai_generated']);
    expect(InterviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'technical',
        difficulty: 'medium',
        persona: 'faang_engineer',
        questions: [{ questionText: 'Bank Q' }, { questionText: 'AI Q' }],
      })
    );
  });
});
