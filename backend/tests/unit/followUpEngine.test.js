jest.mock('../../src/services/aiAdapter');
const { callAI } = require('../../src/services/aiAdapter');
const { getNextFollowUp, maybePushback } = require('../../src/services/followUpEngine');

describe('getNextFollowUp (two-tier adaptive logic)', () => {
  beforeEach(() => callAI.mockReset());

  test('word count < 12 -> tiers as gentle_probe', async () => {
    callAI.mockResolvedValue({ text: 'Can you tell me a bit more about that?' });

    const { tier, followUpText } = await getNextFollowUp({
      lastAnswerTranscript: 'I used React for the frontend.',
      shortHistory: [],
    });

    expect(tier).toBe('gentle_probe');
    expect(followUpText).toContain('more about that');
  });

  test('word count >= 12 -> tiers as specific_followup', async () => {
    callAI.mockResolvedValue({ text: 'You mentioned caching with Redis — how did you handle cache invalidation?' });

    const substantiveAnswer =
      'We built a caching layer with Redis to reduce database load and improve response times across the API.';
    const { tier } = await getNextFollowUp({ lastAnswerTranscript: substantiveAnswer, shortHistory: [] });

    expect(tier).toBe('specific_followup');
  });
});

describe('maybePushback', () => {
  beforeEach(() => callAI.mockReset());

  test('short claims (<12 words) never trigger an AI call — short-circuited as not debatable', async () => {
    const result = await maybePushback({ claim: 'It just works.' });
    expect(result.pushback).toBeNull();
    expect(callAI).not.toHaveBeenCalled();
  });

  test('returns null when the model signals NO_PUSHBACK', async () => {
    callAI.mockResolvedValue({ text: 'NO_PUSHBACK' });
    const claim =
      'We chose PostgreSQL because our data is highly relational and we needed strong consistency guarantees for transactions.';
    const result = await maybePushback({ claim });
    expect(result.pushback).toBeNull();
  });

  test('returns the challenge text when the model pushes back on a debatable claim', async () => {
    callAI.mockResolvedValue({ text: "Isn't NoSQL usually the better fit for a write-heavy workload like that?" });
    const claim =
      'We used a single relational database for everything because it is always faster than any NoSQL alternative.';
    const result = await maybePushback({ claim });
    expect(result.pushback).toMatch(/NoSQL/);
  });
});
