jest.mock('../../src/services/aiAdapter');
jest.mock('../../src/models/WeaknessTracker');
jest.mock('../../src/models/LearningPlan');

const { callAI } = require('../../src/services/aiAdapter');
const WeaknessTracker = require('../../src/models/WeaknessTracker');
const LearningPlan = require('../../src/models/LearningPlan');
const { generateLearningPlan } = require('../../src/services/learningEngine');

describe('generateLearningPlan', () => {
  beforeEach(() => {
    callAI.mockReset();
    WeaknessTracker.findOne.mockReset();
    LearningPlan.findOneAndUpdate.mockReset();
  });

  test('returns a helpful note and skips the AI call when there are no tracked weak topics', async () => {
    WeaknessTracker.findOne.mockResolvedValue(null);
    const result = await generateLearningPlan('user1', 'Backend Engineer');
    expect(result.days).toEqual([]);
    expect(result.note).toMatch(/finish a scored session/i);
    expect(callAI).not.toHaveBeenCalled();
  });

  test('prioritizes the top 5 weak topics by occurrence count and upserts the plan', async () => {
    WeaknessTracker.findOne.mockResolvedValue({
      weakTopics: [
        { topic: 'Docker', occurrences: 2 },
        { topic: 'System design', occurrences: 5 },
        { topic: 'Recursion', occurrences: 1 },
      ],
    });
    callAI.mockResolvedValue({ data: { days: [{ day: 'Mon', task: 'Study system design fundamentals' }] } });
    LearningPlan.findOneAndUpdate.mockResolvedValue({ userId: 'user1', days: [{ day: 'Mon', task: 'Study system design fundamentals' }] });

    const result = await generateLearningPlan('user1', 'Backend Engineer');

    // The prompt call should have received topics sorted by occurrence, highest first
    const promptArg = callAI.mock.calls[0][0].prompt;
    expect(promptArg.indexOf('System design')).toBeLessThan(promptArg.indexOf('Docker'));
    expect(promptArg.indexOf('Docker')).toBeLessThan(promptArg.indexOf('Recursion'));

    expect(LearningPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user1' },
      expect.objectContaining({ userId: 'user1' }),
      expect.objectContaining({ upsert: true, new: true })
    );
    expect(result.days).toHaveLength(1);
  });
});
