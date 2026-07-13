/**
 * Company-specific interview packs (blueprint Phase 3)
 * ------------------------------------------------------
 * Pulls real questions from the Company Question Bank for the pack's
 * company first (most recent first), then tops up with AI-generated
 * questions (explicitly avoiding duplicates) to reach the target count.
 */

const CompanyQuestion = require('../models/CompanyQuestion');
const { callAI } = require('./aiAdapter');
const { packTopUpPrompt } = require('../utils/prompts');

async function buildQuestionsFromPack(pack, { targetCount = 6, type, difficulty, persona } = {}) {
  const effectiveType = type || pack.defaultType;
  const effectiveDifficulty = difficulty || pack.defaultDifficulty;
  const effectivePersona = persona || pack.defaultPersona;

  const bankQuestions = await CompanyQuestion.find({ company: new RegExp(`^${pack.company}$`, 'i') })
    .sort({ recency: -1 })
    .limit(targetCount);

  const questions = bankQuestions.map((q) => ({ questionText: q.questionText, source: 'company_bank' }));

  const remaining = targetCount - questions.length;
  if (remaining > 0) {
    const { data } = await callAI({
      ...packTopUpPrompt({
        company: pack.company,
        type: effectiveType,
        difficulty: effectiveDifficulty,
        persona: effectivePersona,
        existingQuestions: questions.map((q) => q.questionText),
        neededCount: remaining,
      }),
      jsonOnly: true,
    });
    for (const q of data.questions || []) {
      questions.push({ questionText: q, source: 'ai_generated' });
    }
  }

  return { questions, effectiveType, effectiveDifficulty, effectivePersona };
}

module.exports = { buildQuestionsFromPack };
