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

  // Normalize score values:
  // If the model returned scores on a grounded 1-5 scale, map them to 0-10 (e.g. 1->2, 2->4, 3->6, 4->8, 5->10)
  const rawScores = data.scores || {};
  const numericValues = Object.values(rawScores).filter((v) => typeof v === 'number');
  const is5Scale = numericValues.length > 0 && numericValues.every((v) => v <= 5);

  const normalizeScore = (val) => {
    const num = Number(val) || 0;
    if (num <= 0) return 0;
    const scaled = is5Scale ? num * 2 : num;
    return Math.max(0, Math.min(10, Math.round(scaled)));
  };

  const relevance = normalizeScore(rawScores.relevance);
  const structure = normalizeScore(rawScores.structure);
  const technicalAccuracy = normalizeScore(rawScores.technicalAccuracy);
  const businessThinking = normalizeScore(rawScores.businessThinking);
  const creativity = normalizeScore(rawScores.creativity);

  let star = 0;
  let starCheck = null;
  const isBehavioral = sessionType === 'behavioral';
  if (isBehavioral) {
    if (data.starCheck && typeof data.starCheck === 'object') {
      starCheck = {
        situation: Boolean(data.starCheck.situation),
        task: Boolean(data.starCheck.task),
        action: Boolean(data.starCheck.action),
        result: Boolean(data.starCheck.result),
        weakest: data.starCheck.weakest || null,
      };
    } else if (typeof detectStar === 'function') {
      // Fallback only if the unified rubric call did not provide starCheck
      starCheck = await detectStar(answerTranscript);
    }

    if (starCheck) {
      const presentCount = ['situation', 'task', 'action', 'result'].filter((k) => Boolean(starCheck[k])).length;
      star = Math.round((presentCount / 4) * 10);
    } else if (rawScores.star !== undefined) {
      star = normalizeScore(rawScores.star);
    }
  }

  // 5 core rubric dimensions (all normalized to transparent 0-10 scale).
  // In behavioral interviews, structure is directly grounded in STAR method adherence.
  const effectiveStructure = isBehavioral && starCheck ? star : structure;

  const coreDimensions = [
    relevance,
    effectiveStructure,
    technicalAccuracy,
    businessThinking,
    creativity,
  ];

  const dimensionSum = coreDimensions.reduce((a, b) => a + b, 0);
  const dimensionAverage = dimensionSum / coreDimensions.length;

  // Transparent 1 to 10 final score directly from simple average (zero mode-dependent denominators)
  const finalScore = Math.max(1, Math.min(10, Math.round(dimensionAverage)));

  // Named transparent verdict thresholds (Hire >= 8.0 [4.0/5], Hold 6.0-7.9 [3.0-3.9/5], Pass < 6.0 [<3.0/5])
  const verdict = dimensionAverage >= 8.0 ? 'Hire' : dimensionAverage >= 6.0 ? 'Hold' : 'Pass';

  const scores = {
    relevance,
    structure: effectiveStructure,
    technicalAccuracy,
    businessThinking,
    deliveryScore: delivery.deliveryScore,
    star,
    creativity,
  };

  // Derive engagement and confidence deterministically if model omitted them
  const computedEngagement = Math.min(100, Math.max(15, Math.round((delivery.wordCount / 120) * 100)));
  const engagement = data.engagement ?? computedEngagement;

  const sentimentMap = { confident: 90, neutral: 75, hesitant: 55, anxious: 45 };
  const baseConfidence = sentimentMap[data.sentiment] || 75;
  const computedConfidence = Math.min(100, Math.round(baseConfidence * 0.7 + delivery.deliveryScore * 3));
  const confidenceScore = data.confidenceScore ?? computedConfidence;

  return {
    rubricScores: scores,
    finalScore,
    verdict,
    dimensionAverage: parseFloat(dimensionAverage.toFixed(1)),
    idealAnswer: data.idealAnswer || '',
    gapNotes: data.gapNotes || '',
    evidenceQuotes: data.evidenceQuotes || [],
    technicalFlags: data.technicalFlags || [],
    starCheck,
    sentiment: data.sentiment || 'neutral',
    engagement,
    confidenceScore,
    jargonHighlights: data.jargonHighlights || [],
    deliveryMeta: { fillerCount: delivery.fillerCount, wpm: delivery.wpm, wordCount: delivery.wordCount },
  };
}

module.exports = { computeDeliveryScore, scoreAnswer };
