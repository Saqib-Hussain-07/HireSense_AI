/**
 * Panel Interview Mode (blueprint Phase 3)
 * -----------------------------------------
 * Two personas in one session. We generate roughly half the question set
 * "in the voice" of each persona (via interviewGeneratePrompt, called once
 * per persona) and interleave them round-robin, tagging each question with
 * which persona owns it. Scoring/follow-up/pushback for a given question
 * then use that question's persona instead of a single session-wide one.
 */

const { callAI } = require('./aiAdapter');
const { interviewGeneratePrompt } = require('../utils/prompts');

async function generatePanelQuestions({ resumeParsed, jdParsed, type, difficulty, panelPersonas, mode, totalCount = 6 }) {
  const [personaA, personaB] = panelPersonas;
  const countA = Math.ceil(totalCount / 2);
  const countB = totalCount - countA;

  const [resultA, resultB] = await Promise.all([
    callAI({ ...interviewGeneratePrompt({ resumeParsed, jdParsed, type, difficulty, persona: personaA, mode, count: countA }), jsonOnly: true }),
    countB > 0
      ? callAI({ ...interviewGeneratePrompt({ resumeParsed, jdParsed, type, difficulty, persona: personaB, mode, count: countB }), jsonOnly: true })
      : Promise.resolve({ data: { questions: [] } }),
  ]);

  const questionsA = (resultA.data.questions || []).map((q) => ({ questionText: q, persona: personaA }));
  const questionsB = (resultB.data.questions || []).map((q) => ({ questionText: q, persona: personaB }));

  // Interleave round-robin: A, B, A, B, ...
  const interleaved = [];
  const max = Math.max(questionsA.length, questionsB.length);
  for (let i = 0; i < max; i++) {
    if (questionsA[i]) interleaved.push(questionsA[i]);
    if (questionsB[i]) interleaved.push(questionsB[i]);
  }
  return interleaved;
}

module.exports = { generatePanelQuestions };
