/**
 * Two-Tier Adaptive Follow-up Logic (blueprint 3C.21) + Pushback (3B.12)
 * -----------------------------------------------------------------------
 * A short/vague spoken answer gets a gentle open-ended probe; a substantive
 * answer gets a specific follow-up referencing the candidate's exact words.
 * Separately, we ask a dedicated pushback prompt on substantive answers to
 * decide whether a skeptical-interviewer challenge is warranted.
 */

const { callAI } = require('./aiAdapter');
const { adaptiveFollowUpPrompt, pushbackPrompt } = require('../utils/prompts');

async function getNextFollowUp({ lastAnswerTranscript, shortHistory, persona }) {
  const wordCount = (lastAnswerTranscript || '').trim().split(/\s+/).filter(Boolean).length;

  const { data: _unused, text } = await callAI({
    ...adaptiveFollowUpPrompt({ lastAnswerTranscript, wordCount, shortHistory, persona }),
    jsonOnly: false,
  });

  return { followUpText: (text || '').trim(), tier: wordCount < 12 ? 'gentle_probe' : 'specific_followup' };
}

async function maybePushback({ claim, persona }) {
  if (!claim || claim.trim().split(/\s+/).length < 12) {
    // Too short to reasonably contain a debatable technical/strategic claim.
    return { pushback: null };
  }
  const { text } = await callAI({ ...pushbackPrompt({ claim, persona }), jsonOnly: false });
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.toUpperCase().includes('NO_PUSHBACK')) return { pushback: null };
  return { pushback: trimmed };
}

module.exports = { getNextFollowUp, maybePushback };
