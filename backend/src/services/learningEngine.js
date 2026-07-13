/**
 * Learning Plan (blueprint 3B.20)
 * -------------------------------
 * Generates a 7-day study plan from the user's current WeaknessTracker,
 * prioritizing topics with the highest occurrence count (most persistent
 * weaknesses first). One narrow AI call, stored as the user's single
 * latest LearningPlan document (regenerated each time it's requested so
 * it always reflects the most recent weaknesses).
 */

const LearningPlan = require('../models/LearningPlan');
const WeaknessTracker = require('../models/WeaknessTracker');
const { callAI } = require('./aiAdapter');
const { learningPlanPrompt } = require('../utils/prompts');

async function generateLearningPlan(userId, targetRole) {
  const tracker = await WeaknessTracker.findOne({ userId });
  const weakTopics = (tracker?.weakTopics || [])
    .slice()
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5)
    .map((t) => t.topic);

  if (weakTopics.length === 0) {
    return { days: [], note: 'No weak topics tracked yet — finish a scored session first.' };
  }

  const { data } = await callAI({ ...learningPlanPrompt(weakTopics, targetRole), jsonOnly: true });
  const days = data.days || [];

  const plan = await LearningPlan.findOneAndUpdate(
    { userId },
    { userId, days },
    { upsert: true, new: true }
  );
  return plan;
}

module.exports = { generateLearningPlan };
