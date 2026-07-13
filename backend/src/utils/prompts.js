/**
 * Every function returns { system, prompt } for use with aiAdapter.callAI.
 * Keep each prompt narrow & single-purpose (blueprint rule #1).
 */

function resumeParsePrompt(rawText) {
  return {
    system: 'You extract structured data from resumes. Return JSON only, no preamble.',
    prompt: `Resume raw text:\n"""${rawText}"""\n\nReturn JSON only:\n{"skills":[],"education":[{"degree":"","school":"","year":""}],"experience":[{"role":"","company":"","years":"","highlights":[]}],"projects":[{"name":"","description":""}],"certifications":[]}`,
  };
}

function atsScorePrompt(parsedResume, targetRole) {
  return {
    system: 'You are an ATS (applicant tracking system) scoring engine. Return JSON only.',
    prompt: `Parsed resume: ${JSON.stringify(parsedResume)}\nTarget role: ${targetRole || 'general'}\n\nScore this resume 0-100 for ATS-friendliness and keyword coverage. Return JSON only:\n{"atsScore":0,"missingKeywords":[],"weakBullets":[{"original":"","suggested":""}]}`,
  };
}

function jdExtractPrompt(rawText) {
  return {
    system: 'You extract structured requirements from job descriptions. Return JSON only.',
    prompt: `Job description:\n"""${rawText}"""\n\nReturn JSON only:\n{"requiredSkills":[],"niceToHave":[],"softSkills":[],"experienceLevel":"","responsibilities":[]}`,
  };
}

function matchReportPrompt(parsedResume, parsedJD) {
  return {
    system: 'You compare a candidate resume against a job description. Return JSON only.',
    prompt: `Resume: ${JSON.stringify(parsedResume)}\nJD: ${JSON.stringify(parsedJD)}\n\nReturn JSON only:\n{"matchPercent":0,"missing":[],"strong":[],"skillGaps":[{"skill":"","why":"","resources":[],"estHours":0}]}`,
  };
}

function interviewGeneratePrompt({ resumeParsed, jdParsed, type, difficulty, persona, mode, count = 6 }) {
  return {
    system: `You generate interview questions biased toward the candidate's actual skill gaps and JD priorities. Persona: ${persona}. Mode: ${mode}. Return JSON only. IMPORTANT: the "questions" array must contain plain strings only — do NOT return objects, scores, or metadata.`,
    prompt: `Resume: ${JSON.stringify(resumeParsed)}\nJD: ${JSON.stringify(jdParsed)}\nType: ${type}\nDifficulty: ${difficulty}\nGenerate ${count} interview questions as plain spoken text.\nReturn JSON only — questions must be strings, NOT objects:\n{"questions":["Question text here?","Another question here?"]}`,
  };
}

// Section 9.1
function rubricScoringPrompt({ question, answerTranscript, targetRole, company, mode, persona }) {
  const personaPrefix = persona ? `${personaSystemPrompt(persona)}\n\n` : '';
  return {
    system: `${personaPrefix}You are scoring one interview answer against a fixed rubric. Return JSON only, no preamble.`,
    prompt: `You are scoring one interview answer against this rubric:
Relevance(20) Structure(15) TechnicalAccuracy(20) BusinessThinking(10)
DeliveryScore(10) STAR(10) Creativity(5)
[DeliveryScore is precomputed from transcript signals: filler word rate,
 words-per-minute, sentence clarity — pass it in, do not re-derive it here]

Question: ${question}
Candidate Answer (transcribed): ${answerTranscript}
Role Context: ${targetRole || ''}, Company: ${company || ''}
Mode: ${mode}

For each score below 70% of max, include the exact phrase from the
transcript that justifies the deduction.

If mode is neutral_assessment: omit encouraging language entirely,
report only factual scores, gaps, and evidence — no "good job" phrasing.

Return JSON only:
{ "scores": {"relevance":0,"structure":0,"technicalAccuracy":0,"businessThinking":0,"star":0,"creativity":0}, "finalScore": 0,
  "idealAnswer": "...", "gapNotes": "...",
  "evidenceQuotes": [{"criterion":"", "quote":""}],
  "technicalFlags": [{"claim":"", "correct":false, "explanation":""}] }`,
  };
}

// Section 9.2
function adaptiveFollowUpPrompt({ lastAnswerTranscript, wordCount, shortHistory, persona }) {
  const personaPrefix = persona ? `${personaSystemPrompt(persona)}\n\n` : '';
  return {
    system: `${personaPrefix}You generate ONE spoken follow-up question for a live voice interview. Return only the question text, nothing else.`,
    prompt: `Candidate said (transcribed): "${lastAnswerTranscript}"
Word count: ${wordCount}
Previous Q&A in this session: ${JSON.stringify(shortHistory)}

If word count < 12 or answer is vague/generic:
  -> Ask a gentle, open-ended spoken probe to get more detail
    ("Can you tell me a bit more about that?")
Else:
  -> Ask ONE specific spoken follow-up that references a claim or detail
    from their exact answer, probing tradeoffs/depth.
Do not repeat earlier questions. Return only the question text
(will be passed to TTS).`,
  };
}

// Section 9.3
function pushbackPrompt({ claim, persona }) {
  const personaPrefix = persona ? `${personaSystemPrompt(persona)}\n\n` : '';
  return {
    system: `${personaPrefix}You are a skeptical interviewer deciding whether to push back on a claim. Return only the spoken pushback text, or the exact string NO_PUSHBACK if none is warranted.`,
    prompt: `Candidate claimed (transcribed): "${claim}"
If this claim is technically debatable or context-dependent, respond as
a skeptical interviewer would: challenge it directly in 1-2 spoken
sentences, then ask the candidate to defend or revise their position.
If the claim is solid, return exactly: NO_PUSHBACK`,
  };
}

// Section 9.4 - persona system prompt prefix
function personaSystemPrompt(persona) {
  const personas = {
    friendly_mentor: 'Friendly Mentor: encouraging tone, gives hints when candidate struggles.',
    strict_recruiter: 'Strict Recruiter: terse, formal, no hints, notes hesitation.',
    faang_engineer: 'FAANG Engineer: deep technical probing, cares about tradeoffs and scale.',
    startup_founder: 'Startup Founder: cares about ownership, speed, ambiguity handling.',
  };
  return `You are conducting this voice interview as: ${persona}.
${personas[persona] || ''}
Keep every spoken line natural and conversational — this is read aloud
by TTS, not displayed as text. Maintain persona tone in every question,
follow-up, and pushback.`;
}

// Section 9.5 (Phase 2, kept here for completeness)
function starDetectionPrompt(answerTranscript) {
  return {
    system: 'You classify sentences of a behavioral interview answer into STAR components. Return JSON only.',
    prompt: `Classify each sentence of this transcribed answer into
Situation/Task/Action/Result/None.
Answer: "${answerTranscript}"
Return which of S,T,A,R are present, and which is missing or weakest.
Return JSON only: {"situation":true,"task":true,"action":true,"result":false,"weakest":"result"}`,
  };
}

// Weakness Tracker support (blueprint 3B.19) — extracts real skill topic labels
// (e.g. "Docker", "distributed transactions") from a set of low-scoring answers,
// rather than just reusing generic rubric dimension names.
function weaknessTopicExtractPrompt(lowScoringQAs) {
  return {
    system: 'You extract 1-5 short, specific skill/topic labels a candidate should study, based on their weakest interview answers. Return JSON only.',
    prompt: `These are the candidate's lowest-scoring answers this session:
${JSON.stringify(lowScoringQAs)}

Return JSON only: {"weakTopics": ["Docker", "distributed transactions", "..."]}
Keep each topic label short (1-4 words), specific, and study-able (a real skill/tool/concept, not a vague rubric name like "technical accuracy").`,
  };
}

// Learning Plan (blueprint 3B.20) — day-by-day plan targeting weak topics.
function learningPlanPrompt(weakTopics, targetRole) {
  return {
    system: 'You create a short, practical day-by-day study plan for interview prep. Return JSON only.',
    prompt: `Candidate's weakest topics (most-occurring first): ${JSON.stringify(weakTopics)}
Target role: ${targetRole || 'general'}

Create a 7-day plan, one concrete task per day, prioritizing the most
frequent/recent weak topics first. Return JSON only:
{"days": [{"day":"Mon","task":""}, {"day":"Tue","task":""}, ...]}`,
  };
}

// GitHub Analyzer + Project Explainer (blueprint 3B.15)
function githubQuestionsPrompt({ repoName, description, readmeExcerpt, languages }) {
  return {
    system: 'You generate spoken interview questions probing a candidate about their own real project/code. Return JSON only.',
    prompt: `Repository: ${repoName}
Description: ${description || 'none provided'}
Primary languages: ${(languages || []).join(', ') || 'unknown'}
README excerpt: """${(readmeExcerpt || '').slice(0, 2000)}"""

Generate 5 spoken interview questions that probe the candidate's actual
understanding of this specific project — architecture choices, tradeoffs,
why they built it a certain way, what they'd change now. Avoid generic
questions that could apply to any project. Return JSON only:
{"questions": ["...", "..."]}`,
  };
}

// Interview Packs (blueprint Phase 3) — top up a company pack's real
// crowd-sourced questions with AI-generated ones when the bank is thin,
// explicitly avoiding duplicates of what's already been pulled in.
function packTopUpPrompt({ company, type, difficulty, persona, existingQuestions, neededCount }) {
  return {
    system: `You generate additional interview questions for a specific company, in the style of: ${persona}. Return JSON only.`,
    prompt: `Company: ${company}
Interview type: ${type}
Difficulty: ${difficulty}
Questions already selected for this session (do NOT repeat or closely paraphrase these):
${JSON.stringify(existingQuestions)}

Generate ${neededCount} NEW interview questions plausible for a ${company} ${type} interview at ${difficulty} difficulty.
Return JSON only: {"questions": ["...", "..."]}`,
  };
}

module.exports = {
  resumeParsePrompt,
  atsScorePrompt,
  jdExtractPrompt,
  matchReportPrompt,
  interviewGeneratePrompt,
  rubricScoringPrompt,
  adaptiveFollowUpPrompt,
  pushbackPrompt,
  personaSystemPrompt,
  starDetectionPrompt,
  weaknessTopicExtractPrompt,
  learningPlanPrompt,
  githubQuestionsPrompt,
  packTopUpPrompt,
};
