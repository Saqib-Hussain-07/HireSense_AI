/**
 * Learning Plan (blueprint 3B.20)
 * -------------------------------
 * Generates a 7-day study plan from the user's current WeaknessTracker,
 * prioritizing topics with the highest occurrence count (most persistent
 * weaknesses first). One narrow AI call, stored as the user's single
 * latest LearningPlan document (cached by topics fingerprint so AI calls
 * are only made when the user's weak topics change).
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

  const fingerprint = weakTopics.join('|');
  const existing = await LearningPlan.findOne({ userId });
  if (existing && existing.topicsFingerprint === fingerprint && existing.days?.length > 0) {
    return existing;
  }

  const { data } = await callAI({ ...learningPlanPrompt(weakTopics, targetRole), jsonOnly: true });
  const days = data.days || [];

  const plan = await LearningPlan.findOneAndUpdate(
    { userId },
    { userId, days, topicsFingerprint: fingerprint },
    { upsert: true, new: true }
  );
  return plan;
}

module.exports = { generateLearningPlan };
