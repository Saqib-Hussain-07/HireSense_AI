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

  test('combines the precomputed Delivery Score with the AI rubric response and normalizes finalScore to /100', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: {
          relevance: 18,
          structure: 12,
          technicalAccuracy: 16,
          businessThinking: 8,
          star: 8,
          creativity: 4,
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
    });

    expect(callAI).toHaveBeenCalledTimes(1);
    expect(result.rubricScores.deliveryScore).toBeGreaterThanOrEqual(0);
    expect(result.rubricScores.relevance).toBe(18);
    // 18+12+16+8+deliveryScore+8+4, normalized against a 90-point max, rounded
    const expectedRaw = 18 + 12 + 16 + 8 + result.rubricScores.deliveryScore + 8 + 4;
    expect(result.finalScore).toBe(Math.round((expectedRaw / 90) * 100));
    expect(result.idealAnswer).toBe('A tighter version of the answer.');
    expect(result.evidenceQuotes).toHaveLength(1);
  });

  test('propagates an AI failure instead of silently returning a fake score', async () => {
    callAI.mockRejectedValue(new Error('AI_UNAVAILABLE: both primary and fallback reasoning providers failed'));

    await expect(
      scoreAnswer({ question: 'q', answerTranscript: 'a', mode: 'coaching' })
    ).rejects.toThrow('AI_UNAVAILABLE');
  });

  test('runs STAR detection and folds its completeness into the star rubric slot when sessionType is behavioral', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: { relevance: 15, structure: 10, technicalAccuracy: 0, businessThinking: 5, star: 99, creativity: 3 },
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
    // 2 of 4 STAR components present -> star score should be 5 (2/4 * 10), NOT the AI's raw 99
    expect(result.rubricScores.star).toBe(5);
    expect(result.starCheck).toEqual({ situation: true, task: true, action: false, result: false, weakest: 'action' });
  });

  test('does NOT run STAR detection for non-behavioral session types', async () => {
    callAI.mockResolvedValue({
      data: {
        scores: { relevance: 15, structure: 10, technicalAccuracy: 18, businessThinking: 5, star: 7, creativity: 3 },
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
    expect(result.rubricScores.star).toBe(7); // untouched, from the AI response
    expect(result.starCheck).toBeNull();
  });
});
