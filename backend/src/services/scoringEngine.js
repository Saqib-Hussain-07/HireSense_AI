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
  if (!answerTranscript || !answerTranscript.trim()) {
    return {
      rubricScores: { relevance: 0, structure: 0, technicalAccuracy: 0, businessThinking: 0, deliveryScore: 0, star: 0, creativity: 0 },
      finalScore: 0,
      idealAnswer: '',
      gapNotes: 'No response was recorded from the candidate.',
      evidenceQuotes: [],
      technicalFlags: [],
      starCheck: null,
      sentiment: 'neutral',
      engagement: 0,
      confidenceScore: 0,
      jargonHighlights: [],
      deliveryMeta: { fillerCount: 0, wpm: 0, wordCount: 0 }
    };
  }

  const delivery = computeDeliveryScore(answerTranscript, durationSeconds);

  const { data } = await callAI({
    ...rubricScoringPrompt({ question, answerTranscript, targetRole, company, mode, persona, sessionType }),
    jsonOnly: true,
    temperature: 0.2, // Consistent, repeatable assessment scoring (avoids creative drift)
  });

  // Defensive validation: clip LLM scores strictly to 0-10
  const relevance = Math.max(0, Math.min(10, data.scores?.relevance ?? 0));
  const structure = Math.max(0, Math.min(10, data.scores?.structure ?? 0));
  const technicalAccuracy = Math.max(0, Math.min(10, data.scores?.technicalAccuracy ?? 0));
  const businessThinking = Math.max(0, Math.min(10, data.scores?.businessThinking ?? 0));
  const starRaw = Math.max(0, Math.min(10, data.scores?.star ?? 0));
  const creativity = Math.max(0, Math.min(10, data.scores?.creativity ?? 0));

  let star = starRaw;
  let starCheck = null;
  const isBehavioral = sessionType === 'behavioral';
  if (isBehavioral) {
    starCheck = await detectStar(answerTranscript);
    const presentCount = ['situation', 'task', 'action', 'result'].filter((k) => starCheck[k]).length;
    star = Math.round((presentCount / 4) * 10);
  }

  const scores = {
    relevance,
    structure,
    technicalAccuracy,
    businessThinking,
    deliveryScore: delivery.deliveryScore,
    star,
    creativity,
  };

  // Compute weighted total using rubric weights
  const weightedTotal =
    relevance * 2 +
    structure * 1.5 +
    technicalAccuracy * 2 +
    businessThinking * 1 +
    delivery.deliveryScore * 1 +
    (isBehavioral ? star * 1 : 0) +
    creativity * 0.5;

  const maxScore = isBehavioral ? 90 : 80;
  // Scale score to 1 to 10
  const finalScore = Math.max(1, Math.min(10, Math.round((weightedTotal / maxScore) * 10)));

  return {
    rubricScores: scores,
    finalScore,
    idealAnswer: data.idealAnswer || '',
    gapNotes: data.gapNotes || '',
    evidenceQuotes: data.evidenceQuotes || [],
    technicalFlags: data.technicalFlags || [],
    starCheck,
    sentiment: data.sentiment || 'neutral',
    engagement: data.engagement || 70,
    confidenceScore: data.confidenceScore || 85,
    jargonHighlights: data.jargonHighlights || [],
    deliveryMeta: { fillerCount: delivery.fillerCount, wpm: delivery.wpm, wordCount: delivery.wordCount },
  };
}

module.exports = { computeDeliveryScore, scoreAnswer };
