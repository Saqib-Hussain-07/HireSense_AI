/**
 * Scoring Engine
 * --------------
 * Computes the Delivery Score (merged communication+confidence metric,
 * blueprint 3A.11 / section 6) purely from transcript + turn timing —
 * filler word rate, words-per-minute, sentence clarity. NEVER derives
 * anything from audio pitch/energy/pause signal processing — that's the
 * explicitly removed "Standalone Voice Confidence Analyzer" (3D).
 *
 * Also wraps the rubric scoring AI call (section 9.1), passing in the
 * precomputed Delivery Score rather than asking the model to invent one.
 */

const { callAI } = require('./aiAdapter');
const { rubricScoringPrompt } = require('../utils/prompts');
const { detectStar } = require('./starEngine');

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically', 'actually', 'literally'];

function computeDeliveryScore(transcript, durationSeconds) {
  const trimmed = (transcript || '').trim();
  if (!trimmed) return { deliveryScore: 0, fillerCount: 0, wpm: 0, wordCount: 0 };

  const words = trimmed.split(/\s+/);
  const wordCount = words.length;
  const lowerText = trimmed.toLowerCase();

  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) fillerCount += matches.length;
  }

  const minutes = Math.max((durationSeconds || wordCount / 2.5) / 60, 0.05);
  const wpm = wordCount / minutes;

  // Simple, transparent scoring heuristic (0-10 to match rubric weight):
  // - Ideal conversational pace: 110-160 WPM -> full pace credit
  // - Filler rate penalty: >1 filler per 20 words starts costing points
  // - Sentence clarity proxy: average sentence length not too long/short
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = sentences.length ? wordCount / sentences.length : wordCount;

  let paceScore = 4; // out of 4
  if (wpm < 90 || wpm > 190) paceScore = 2;
  else if (wpm < 110 || wpm > 160) paceScore = 3;

  const fillerRatio = fillerCount / Math.max(wordCount, 1);
  let fillerScore = 3; // out of 3
  if (fillerRatio > 0.08) fillerScore = 0;
  else if (fillerRatio > 0.04) fillerScore = 1;
  else if (fillerRatio > 0.02) fillerScore = 2;

  let clarityScore = 3; // out of 3
  if (avgSentenceLen > 40 || avgSentenceLen < 4) clarityScore = 1;
  else if (avgSentenceLen > 30) clarityScore = 2;

  const deliveryScore = Math.min(10, paceScore + fillerScore + clarityScore);

  return { deliveryScore, fillerCount, wpm: Math.round(wpm), wordCount };
}

async function scoreAnswer({ question, answerTranscript, targetRole, company, mode, durationSeconds, persona, sessionType }) {
  const delivery = computeDeliveryScore(answerTranscript, durationSeconds);

  const { data } = await callAI({
    ...rubricScoringPrompt({ question, answerTranscript, targetRole, company, mode, persona }),
    jsonOnly: true,
  });

  const scores = {
    ...data.scores,
    deliveryScore: delivery.deliveryScore,
  };

  // STAR detection only applies to behavioral questions (blueprint 9.5) — running
  // it on technical/dsa/system_design answers would misclassify tradeoff
  // discussions as "no Situation/Task" and produce a misleading starCheck.
  let starCheck = null;
  if (sessionType === 'behavioral') {
    starCheck = await detectStar(answerTranscript);
    // fold STAR completeness into the rubric's existing `star` slot (max 10)
    // so it still feeds finalScore without adding a new weighted column.
    const presentCount = ['situation', 'task', 'action', 'result'].filter((k) => starCheck[k]).length;
    scores.star = Math.round((presentCount / 4) * 10);
  }

  const rawTotal =
    (scores.relevance || 0) +
    (scores.structure || 0) +
    (scores.technicalAccuracy || 0) +
    (scores.businessThinking || 0) +
    (scores.deliveryScore || 0) +
    (scores.star || 0) +
    (scores.creativity || 0);
  const finalScore = Math.round((rawTotal / 90) * 100);

  return {
    rubricScores: scores,
    finalScore,
    idealAnswer: data.idealAnswer || '',
    gapNotes: data.gapNotes || '',
    evidenceQuotes: data.evidenceQuotes || [],
    technicalFlags: data.technicalFlags || [],
    starCheck,
    deliveryMeta: { fillerCount: delivery.fillerCount, wpm: delivery.wpm, wordCount: delivery.wordCount },
  };
}

module.exports = { computeDeliveryScore, scoreAnswer };
