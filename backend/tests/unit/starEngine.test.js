jest.mock('../../src/services/aiAdapter');
const { callAI } = require('../../src/services/aiAdapter');
const { detectStar } = require('../../src/services/starEngine');

describe('detectStar', () => {
  beforeEach(() => callAI.mockReset());

  test('short/empty transcripts are short-circuited without an AI call', async () => {
    const result = await detectStar('too short');
    expect(result).toEqual({ situation: false, task: false, action: false, result: false, weakest: 'situation' });
    expect(callAI).not.toHaveBeenCalled();
  });

  test('parses a full STAR classification from the AI response', async () => {
    callAI.mockResolvedValue({
      data: { situation: true, task: true, action: true, result: false, weakest: 'result' },
    });

    const transcript =
      'At my last job we had a production outage during a big sale. I was responsible for restoring service quickly. I rolled back the last deploy and scaled up the database read replicas.';
    const result = await detectStar(transcript);

    expect(result.situation).toBe(true);
    expect(result.task).toBe(true);
    expect(result.action).toBe(true);
    expect(result.result).toBe(false);
    expect(result.weakest).toBe('result');
  });

  test('coerces missing/undefined fields to false rather than throwing', async () => {
    callAI.mockResolvedValue({ data: { situation: true } });
    const transcript = 'A reasonably long answer describing some situation without much else said at all here.';
    const result = await detectStar(transcript);
    expect(result.task).toBe(false);
    expect(result.action).toBe(false);
    expect(result.result).toBe(false);
  });
});
