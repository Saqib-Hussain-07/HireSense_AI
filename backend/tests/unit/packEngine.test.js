jest.mock('../../src/models/CompanyQuestion');
jest.mock('../../src/services/aiAdapter');

const CompanyQuestion = require('../../src/models/CompanyQuestion');
const { callAI } = require('../../src/services/aiAdapter');
const { buildQuestionsFromPack } = require('../../src/services/packEngine');

function mockFind(results) {
  CompanyQuestion.find.mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(results),
  });
}

const basePack = {
  company: 'Google',
  defaultType: 'technical',
  defaultDifficulty: 'medium',
  defaultPersona: 'faang_engineer',
};

describe('buildQuestionsFromPack', () => {
  beforeEach(() => {
    callAI.mockReset();
    CompanyQuestion.find.mockReset();
  });

  test('uses bank questions only, with no AI top-up, when the bank already meets the target count', async () => {
    mockFind([
      { questionText: 'Q1 from bank' },
      { questionText: 'Q2 from bank' },
    ]);

    const { questions } = await buildQuestionsFromPack(basePack, { targetCount: 2 });

    expect(questions).toHaveLength(2);
    expect(questions.every((q) => q.source === 'company_bank')).toBe(true);
    expect(callAI).not.toHaveBeenCalled();
  });

  test('tops up with AI-generated questions when the bank is thin, avoiding duplicates', async () => {
    mockFind([{ questionText: 'Q1 from bank' }]);
    callAI.mockResolvedValue({ data: { questions: ['New Q2', 'New Q3'] } });

    const { questions, effectiveType, effectiveDifficulty, effectivePersona } = await buildQuestionsFromPack(basePack, { targetCount: 3 });

    expect(questions).toHaveLength(3);
    expect(questions[0].source).toBe('company_bank');
    expect(questions[1].source).toBe('ai_generated');
    expect(questions[2].source).toBe('ai_generated');
    expect(effectiveType).toBe('technical');
    expect(effectiveDifficulty).toBe('medium');
    expect(effectivePersona).toBe('faang_engineer');

    // The top-up prompt must have been told what's already selected, to avoid duplicates
    const promptArg = callAI.mock.calls[0][0].prompt;
    expect(promptArg).toContain('Q1 from bank');
  });

  test('respects explicit type/difficulty/persona overrides instead of pack defaults', async () => {
    mockFind([]);
    callAI.mockResolvedValue({ data: { questions: ['Q1', 'Q2'] } });

    const { effectiveType, effectiveDifficulty, effectivePersona } = await buildQuestionsFromPack(basePack, {
      targetCount: 2,
      type: 'behavioral',
      difficulty: 'hard',
      persona: 'strict_recruiter',
    });

    expect(effectiveType).toBe('behavioral');
    expect(effectiveDifficulty).toBe('hard');
    expect(effectivePersona).toBe('strict_recruiter');
  });
});
