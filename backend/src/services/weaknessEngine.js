/**
 * Weakness Tracker (blueprint 3B.19)
 * ----------------------------------
 * After a session finishes, look at its lowest-scoring answers, ask the AI
 * (one narrow call) to name the actual skill/topic behind the weakness, and
 * upsert those into the user's WeaknessTracker with an occurrence count and
 * lastSeen date. The Learning Plan generator (learningEngine.js) reads this.
 */

const WeaknessTracker = require('../models/WeaknessTracker');
const { callAI } = require('./aiAdapter');
const { weaknessTopicExtractPrompt } = require('../utils/prompts');

const LOW_SCORE_THRESHOLD = 5; // out of 10 finalScore (scores below 5/10 are flagged as weak)

async function updateWeaknessTracker(userId, session) {
  const lowScoring = session.questions
    .filter((q) => q.finalScore > 0 && q.finalScore < LOW_SCORE_THRESHOLD)
    .map((q) => ({ question: q.questionText, finalScore: q.finalScore, gapNotes: q.gapNotes }));

  if (lowScoring.length === 0) return null;

  const { data } = await callAI({ ...weaknessTopicExtractPrompt(lowScoring), jsonOnly: true });
  const topics = (data.weakTopics || []).slice(0, 5);
  if (topics.length === 0) return null;

  let tracker = await WeaknessTracker.findOne({ userId });
  if (!tracker) {
    tracker = new WeaknessTracker({ userId, weakTopics: [] });
  }

  const now = new Date();
  for (const topic of topics) {
    const existing = tracker.weakTopics.find((t) => t.topic.toLowerCase() === topic.toLowerCase());
    if (existing) {
      existing.occurrences += 1;
      existing.lastSeen = now;
    } else {
      tracker.weakTopics.push({ topic, occurrences: 1, lastSeen: now });
    }
  }

  await tracker.save();
  return tracker;
}

module.exports = { updateWeaknessTracker, LOW_SCORE_THRESHOLD };
