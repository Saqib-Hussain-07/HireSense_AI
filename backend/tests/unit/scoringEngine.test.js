jest.mock('../../src/services/aiAdapter');
jest.mock('../../src/services/starEngine');
const { callAI } = require('../../src/services/aiAdapter');
const { detectStar } = require('../../src/services/starEngine');
const { computeDeliveryScore, scoreAnswer } = require('../../src/services/scoringEngine');

describe('computeDeliveryScore', () => {
  test('empty transcript scores 0', () => {
    const result = computeDeliveryScore('', 30);
    expect(result.deliveryScore).toBe(0);
    expect(result.wordCount).toBe(0);
  });

  test('ideal-pace, filler-free, well-structured answer scores near max (10)', () => {
    // ~130 words at a 60s duration -> ~130 WPM, squarely in the 110-160 ideal band.
    const words = Array(130).fill('clarity').join(' ');
    const transcript = `${words}. This is a second clean sentence to end things. `;
    const result = computeDeliveryScore(transcript, 60);
    expect(result.deliveryScore).toBeGreaterThanOrEqual(8);
    expect(result.fillerCount).toBe(0);
  });

  test('heavy filler-word usage drags the score down', () => {
    const transcript = Array(20).fill('um like you know basically').join(' ');
    const result = computeDeliveryScore(transcript, 40);
    expect(result.fillerCount).toBeGreaterThan(0);
    expect(result.deliveryScore).toBeLessThan(6);
  });

  test('extremely long run-on sentence hurts clarity score', () => {
    const words = Array(80).fill('and then also').join(' '); // one giant sentence, no punctuation
    const result = computeDeliveryScore(words, 60);
    expect(result.deliveryScore).toBeLessThan(8);
  });

  test('never derives a score from anything but text/timing (no audio fields expected/used)', () => {
    // Sanity check on the public contract: the function only accepts
    // (transcript, durationSeconds) — passing extra "audio-ish" args should
    // have zero effect, proving the function has no signal-processing path.
    const transcript = 'A short clear answer with no filler words at all here.';
    const a = computeDeliveryScore(transcript, 20);
    const b = computeDeliveryScore(transcript, 20, { pitchVariance: 999, energy: 'high' });
    expect(a).toEqual(b);
  });
});

describe('scoreAnswer', () => {
  beforeEach(() => {
    callAI.mockReset();
  });

  test('computes transparent finalScore from simple 5-dimension average and assigns named verdict', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: {
          relevance: 9,
          structure: 8,
          technicalAccuracy: 8,
          businessThinking: 8,
          creativity: 8,
        },
        idealAnswer: 'A tighter version of the answer.',
        gapNotes: 'Missed discussing tradeoffs.',
        evidenceQuotes: [{ criterion: 'technicalAccuracy', quote: 'it just works somehow' }],
        technicalFlags: [],
      },
      provider: 'primary',
    });

    const result = await scoreAnswer({
      question: 'Explain how a hash table works.',
      answerTranscript: 'A hash table maps keys to buckets using a hash function for average constant time lookups.',
      targetRole: 'Backend Engineer',
      mode: 'coaching',
      durationSeconds: 15,
      sessionType: 'technical',
    });

    expect(callAI).toHaveBeenCalledTimes(1);
    expect(result.rubricScores.deliveryScore).toBeGreaterThanOrEqual(0);
    expect(result.rubricScores.relevance).toBe(9);
    // 5 core dimensions: (9 + 8 + 8 + 8 + 8) / 5 = 41 / 5 = 8.2
    expect(result.dimensionAverage).toBe(8.2);
    expect(result.finalScore).toBe(8);
    expect(result.verdict).toBe('Hire');
    expect(result.idealAnswer).toBe('A tighter version of the answer.');
    expect(result.evidenceQuotes).toHaveLength(1);
  });

  test('propagates an AI failure instead of silently returning a fake score', async () => {
    callAI.mockRejectedValue(new Error('AI_UNAVAILABLE: both primary and fallback reasoning providers failed'));

    await expect(
      scoreAnswer({ question: 'q', answerTranscript: 'a', mode: 'coaching' })
    ).rejects.toThrow('AI_UNAVAILABLE');
  });

  test('unifies STAR detection from the rubric response into starCheck and computes star score without a redundant second call', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: { relevance: 3, structure: 3, technicalAccuracy: 3, businessThinking: 3, creativity: 3 },
        starCheck: { situation: true, task: true, action: false, result: false, weakest: 'action' },
        idealAnswer: '', gapNotes: '', evidenceQuotes: [], technicalFlags: [],
      },
    });

    const result = await scoreAnswer({
      question: 'Tell me about a time you dealt with conflict.',
      answerTranscript: 'Some behavioral answer here.',
      mode: 'coaching',
      sessionType: 'behavioral',
    });

    // Unified call supplies starCheck -> detectStar is NOT called (zero wasted calls)
    expect(detectStar).not.toHaveBeenCalled();
    // 2 of 4 STAR components present -> star score is 5 (2/4 * 10)
    expect(result.rubricScores.star).toBe(5);
    expect(result.starCheck).toEqual({ situation: true, task: true, action: false, result: false, weakest: 'action' });
  });

  test('falls back to detectStar if rubric response omits starCheck for a behavioral answer', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: { relevance: 3, structure: 3, technicalAccuracy: 3, businessThinking: 3, creativity: 3 },
        idealAnswer: '', gapNotes: '', evidenceQuotes: [], technicalFlags: [],
      },
    });
    detectStar.mockResolvedValue({ situation: true, task: true, action: false, result: false, weakest: 'action' });

    const result = await scoreAnswer({
      question: 'Tell me about a time you dealt with conflict.',
      answerTranscript: 'Some behavioral answer here.',
      mode: 'coaching',
      sessionType: 'behavioral',
    });

    expect(detectStar).toHaveBeenCalledWith('Some behavioral answer here.');
    expect(result.rubricScores.star).toBe(5);
    expect(result.starCheck).toEqual({ situation: true, task: true, action: false, result: false, weakest: 'action' });
  });

  test('does NOT run STAR detection for non-behavioral session types', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: { relevance: 15, structure: 10, technicalAccuracy: 18, businessThinking: 5, creativity: 3 },
        idealAnswer: '', gapNotes: '', evidenceQuotes: [], technicalFlags: [],
      },
    });

    const result = await scoreAnswer({
      question: 'Explain a hash table.',
      answerTranscript: 'A technical answer here.',
      mode: 'coaching',
      sessionType: 'technical',
    });

    expect(detectStar).not.toHaveBeenCalled();
    expect(result.rubricScores.star).toBe(0);
    expect(result.starCheck).toBeNull();
  });

  test('accurately scales discrete 1-5 grounded rubric scores to standard 0-10 scale', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: {
          relevance: 5, // 5 -> 10 (Exceptional)
          structure: 4, // 4 -> 8 (Strong)
          technicalAccuracy: 3, // 3 -> 6 (Competent)
          businessThinking: 2, // 2 -> 4 (Needs improvement)
          creativity: 1, // 1 -> 2 (Poor)
        },
        sentiment: 'confident',
        idealAnswer: 'Model answer.',
      },
    });

    const result = await scoreAnswer({
      question: 'Explain indexes in PostgreSQL.',
      answerTranscript: 'B-tree indexes speed up search by maintaining a balanced tree structure.',
      mode: 'coaching',
      sessionType: 'technical',
    });

    expect(result.rubricScores.relevance).toBe(10);
    expect(result.rubricScores.structure).toBe(8);
    expect(result.rubricScores.technicalAccuracy).toBe(6);
    expect(result.rubricScores.businessThinking).toBe(4);
    expect(result.rubricScores.creativity).toBe(2);
    // (10 + 8 + 6 + 4 + 2) / 5 = 30 / 5 = 6.0 -> finalScore: 6, verdict: Hold
    expect(result.dimensionAverage).toBe(6.0);
    expect(result.finalScore).toBe(6);
    expect(result.verdict).toBe('Hold');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
  });
});
