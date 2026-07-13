jest.mock('../../src/services/aiAdapter');
jest.mock('../../src/models/WeaknessTracker');

const { callAI } = require('../../src/services/aiAdapter');
const WeaknessTracker = require('../../src/models/WeaknessTracker');
const { updateWeaknessTracker } = require('../../src/services/weaknessEngine');

function makeSession(questions) {
  return { questions };
}

describe('updateWeaknessTracker', () => {
  beforeEach(() => {
    callAI.mockReset();
    WeaknessTracker.findOne.mockReset();
  });

  test('does nothing (no AI call, no save) when there are no low-scoring answers', async () => {
    const session = makeSession([{ finalScore: 85, questionText: 'q1' }, { finalScore: 0, questionText: 'q2' }]);
    const result = await updateWeaknessTracker('user1', session);
    expect(result).toBeNull();
    expect(callAI).not.toHaveBeenCalled();
  });

  test('creates a new tracker with extracted weak topics when none exists yet', async () => {
    WeaknessTracker.findOne.mockResolvedValue(null);
    callAI.mockResolvedValue({ data: { weakTopics: ['Docker', 'distributed transactions'] } });

    const saveMock = jest.fn().mockResolvedValue(true);
    WeaknessTracker.mockImplementation(function (doc) {
      Object.assign(this, doc);
      this.weakTopics = doc.weakTopics || [];
      this.save = saveMock;
    });

    const session = makeSession([{ finalScore: 40, questionText: 'q1', gapNotes: 'missed containers' }]);
    const tracker = await updateWeaknessTracker('user1', session);

    expect(callAI).toHaveBeenCalledTimes(1);
    expect(tracker.weakTopics).toHaveLength(2);
    expect(tracker.weakTopics[0].topic).toBe('Docker');
    expect(tracker.weakTopics[0].occurrences).toBe(1);
    expect(saveMock).toHaveBeenCalled();
  });

  test('increments occurrences for a topic that already exists (case-insensitive match)', async () => {
    const existingTracker = {
      weakTopics: [{ topic: 'docker', occurrences: 2, lastSeen: new Date('2026-01-01') }],
      save: jest.fn().mockResolvedValue(true),
    };
    WeaknessTracker.findOne.mockResolvedValue(existingTracker);
    callAI.mockResolvedValue({ data: { weakTopics: ['Docker'] } });

    const session = makeSession([{ finalScore: 30, questionText: 'q1' }]);
    const tracker = await updateWeaknessTracker('user1', session);

    expect(tracker.weakTopics).toHaveLength(1);
    expect(tracker.weakTopics[0].occurrences).toBe(3);
  });
});
