/**
 * STAR Detection (blueprint 3B.14 / section 9.5)
 * ------------------------------------------------
 * Behavioral-question-only. Classifies a transcribed answer into which of
 * Situation/Task/Action/Result are present, and flags the weakest/missing one.
 * Narrow, single-purpose AI call per blueprint rule #1.
 */

const { callAI } = require('./aiAdapter');
const { starDetectionPrompt } = require('../utils/prompts');

async function detectStar(answerTranscript) {
  if (!answerTranscript || answerTranscript.trim().length < 15) {
    // Too short to meaningfully classify into STAR components.
    return { situation: false, task: false, action: false, result: false, weakest: 'situation' };
  }
  const { data } = await callAI({
    ...starDetectionPrompt(answerTranscript),
    jsonOnly: true,
    temperature: 0.1, // Deterministic boolean classification
  });
  return {
    situation: !!data.situation,
    task: !!data.task,
    action: !!data.action,
    result: !!data.result,
    weakest: data.weakest || null,
  };
}

module.exports = { detectStar };
