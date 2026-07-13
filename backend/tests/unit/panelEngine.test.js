jest.mock('../../src/services/aiAdapter');
const { callAI } = require('../../src/services/aiAdapter');
const { generatePanelQuestions } = require('../../src/services/panelEngine');

describe('generatePanelQuestions', () => {
  beforeEach(() => callAI.mockReset());

  test('calls the generator once per persona and interleaves the results round-robin', async () => {
    callAI
      .mockResolvedValueOnce({ data: { questions: ['A1', 'A2', 'A3'] } }) // persona A (gets ceil(6/2)=3)
      .mockResolvedValueOnce({ data: { questions: ['B1', 'B2', 'B3'] } }); // persona B

    const questions = await generatePanelQuestions({
      resumeParsed: {},
      jdParsed: {},
      type: 'technical',
      difficulty: 'medium',
      panelPersonas: ['strict_recruiter', 'faang_engineer'],
      mode: 'coaching',
      totalCount: 6,
    });

    expect(callAI).toHaveBeenCalledTimes(2);
    expect(questions).toEqual([
      { questionText: 'A1', persona: 'strict_recruiter' },
      { questionText: 'B1', persona: 'faang_engineer' },
      { questionText: 'A2', persona: 'strict_recruiter' },
      { questionText: 'B2', persona: 'faang_engineer' },
      { questionText: 'A3', persona: 'strict_recruiter' },
      { questionText: 'B3', persona: 'faang_engineer' },
    ]);
  });

  test('handles an odd total count (persona A gets the extra question)', async () => {
    callAI
      .mockResolvedValueOnce({ data: { questions: ['A1', 'A2'] } }) // ceil(3/2) = 2
      .mockResolvedValueOnce({ data: { questions: ['B1'] } }); // 3-2 = 1

    const questions = await generatePanelQuestions({
      resumeParsed: {}, jdParsed: {}, type: 'hr', difficulty: 'easy',
      panelPersonas: ['friendly_mentor', 'startup_founder'], mode: 'coaching', totalCount: 3,
    });

    expect(questions).toHaveLength(3);
    expect(questions[questions.length - 1]).toEqual({ questionText: 'A2', persona: 'friendly_mentor' });
  });

  test('gracefully handles one persona returning fewer questions than the other', async () => {
    callAI
      .mockResolvedValueOnce({ data: { questions: ['A1', 'A2', 'A3'] } })
      .mockResolvedValueOnce({ data: { questions: ['B1'] } }); // model under-delivered

    const questions = await generatePanelQuestions({
      resumeParsed: {}, jdParsed: {}, type: 'technical', difficulty: 'hard',
      panelPersonas: ['faang_engineer', 'strict_recruiter'], mode: 'coaching', totalCount: 6,
    });

    // Should not throw, and should include all questions actually returned
    expect(questions.map((q) => q.questionText)).toEqual(['A1', 'B1', 'A2', 'A3']);
  });
});
