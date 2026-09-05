/**
 * Every function returns { system, prompt } for use with aiAdapter.callAI.
 * Keep each prompt narrow & single-purpose (blueprint rule #1).
 */

function resumeAnalyzePrompt(rawText, targetRole) {
  return {
    system: 'You are an advanced ATS (applicant tracking system) and resume parser. Return JSON only, no conversational text.',
    prompt: `Resume raw text:\n"""${rawText}"""\n\nTarget role: ${targetRole || 'general'}\n\nPerform a comprehensive ATS analysis and parsing. Return JSON matching this exact schema:
{
  "parsed": {
    "skills": ["skill1", "skill2"],
    "education": [{"degree": "degree details", "school": "school name", "year": "graduation year"}],
    "experience": [{"role": "job title", "company": "company name", "years": "years employed", "highlights": ["achievement 1"]}],
    "projects": [{"name": "project name", "description": "project description"}],
    "certifications": ["certification name"]
  },
  "atsScore": 85, // Integer between 0 and 100
  "missingKeywords": ["keyword1", "keyword2"],
  "weakBullets": [
    { "original": "original bullet point", "suggested": "optimized bullet point with action verbs and quantifiable metrics" }
  ]
}`,
  };
}

function jdExtractPrompt(rawText) {
  return {
    system: 'You extract structured requirements from job descriptions. Return JSON only.',
    prompt: `Job description:
"""${rawText}"""

Return JSON only:
{
  "jobTitle": "Extracted job title",
  "company": "Extracted company name",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHave": ["preferred skill 1", "preferred skill 2"],
  "softSkills": ["soft skill 1"],
  "experienceLevel": "e.g., Mid-level, Senior",
  "responsibilities": ["duty 1"]
}

Make sure to separate preferred, "nice to have", or optional skills into "niceToHave", and mandatory skills into "requiredSkills".`,
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
function rubricScoringPrompt({ question, answerTranscript, targetRole, company, mode, persona, sessionType }) {
  const personaPrefix = persona ? `${personaSystemPrompt(persona)}\n\n` : '';
  const isBehavioral = sessionType === 'behavioral';
  return {
    system: `${personaPrefix}You are an expert interviewer scoring one answer against a grounded assessment rubric. Return JSON only, with no markdown preamble.`,
    prompt: `You are evaluating this candidate's interview answer.

Question: ${question}
Candidate Answer (transcribed): "${answerTranscript}"
Role Context: ${targetRole || 'General Engineering'}, Company: ${company || 'Technology Company'}
Mode: ${mode}

Evaluate each dimension strictly on a 1 to 5 integer scale using these clear qualitative bands:
- 1 (Poor): Fundamentally incorrect, off-topic, evasive, or unorganized.
- 2 (Needs Improvement): Partial answer, notable conceptual/technical errors, or weak justification.
- 3 (Competent): Correct core answer, standard knowledge, clear and appropriate structure.
- 4 (Strong): Well-organized, technically accurate, addresses practical tradeoffs or real-world constraints.
- 5 (Exceptional): Comprehensive mastery, deep technical precision, clear strategic perspective.

Categories to grade (integers 1 to 5):
- relevance: How directly and completely the answer addresses the specific question asked.
- structure: Logical organization, narrative clarity, and pacing.
- technicalAccuracy: Correctness of technical concepts, tools, or principles mentioned.
- businessThinking: Commercial awareness, user/business impact, or scalability tradeoffs.
${isBehavioral ? '- star: STAR method structure compliance (Situation, Task, Action, Result).\n' : ''}- creativity: Innovative thinking, custom tradeoffs, or alternatives discussed.

${mode === 'neutral_assessment' ? 'Omit encouraging language entirely; report only factual scores, gaps, and evidence.' : ''}

Feedback & Evidence:
- sentiment: "confident" | "hesitant" | "anxious" | "neutral"
- idealAnswer: 2-3 concise sentences demonstrating an exemplary answer.
- gapNotes: 1-2 bullet points highlighting specific technical or conceptual omissions.
- evidenceQuotes: 1-2 key quotes from the transcript with the criterion they demonstrate.
- jargonHighlights: 0-2 phrases where casual wording could be elevated with precise terminology.

Return JSON only in this exact schema:
{ 
  "scores": {
    "relevance": 3,
    "structure": 3,
    "technicalAccuracy": 3,
    "businessThinking": 3,
    ${isBehavioral ? '"star": 3,\n    ' : ''}"creativity": 3
  },
  "sentiment": "confident",
  "idealAnswer": "2-3 concise sentences of ideal response",
  "gapNotes": "Specific technical omissions or areas to improve",
  "evidenceQuotes": [{"criterion": "technicalAccuracy", "quote": "exact phrase"}],
  "jargonHighlights": [{"wordOrPhrase": "casual phrase", "replacement": "precise industry term", "reason": "why"}]
}`,
  };
}

// Section 9.2
function adaptiveFollowUpPrompt({ lastAnswerTranscript, wordCount, shortHistory, persona, sentiment = 'neutral', engagement = 70 }) {
  const personaPrefix = persona ? `${personaSystemPrompt(persona)}\n\n` : '';
  return {
    system: `${personaPrefix}You generate ONE spoken follow-up question for a live voice interview. Return only the question text, nothing else.`,
    prompt: `Candidate said (transcribed): "${lastAnswerTranscript}"
Word count: ${wordCount}
Candidate Sentiment: ${sentiment}
Candidate Engagement Level: ${engagement}/100
Previous Q&A in this session: ${JSON.stringify(shortHistory)}

Follow these adaptive conversational rules:
1. FALLBACK FOR AMBIGUOUS/SHORT REPLIES: If the candidate transcript is extremely short (< 4 words like "I don't know", "skip", "no", "yes"), empty, or highly ambiguous, do NOT penalize them with a hard question. Ask a gentle, encouraging spoken prompt to guide them (e.g., "No worries at all, we can take it step-by-step. What comes to mind when you think about...").
2. PACING ADJUSTMENT:
   - If sentiment is 'anxious' or 'hesitant': slow down, speak supportively, and ask a gentler follow-up.
   - If sentiment is 'confident' or 'defensive' and engagement is high (>= 80): ask a challenging, deep question testing architectural tradeoffs or limits of their strategy.
3. CONTEXTUAL RELEVANCE: Build directly on their exact response instead of asking generic scripted questions. Do not repeat previous questions.

Return only the follow-up question text (this is read aloud by TTS).`,
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
  const langList = (languages || []).map(l => typeof l === 'string' ? l : l.name).join(', ') || 'unknown';
  return {
    system: 'You generate a detailed analysis and interview questions probing a candidate about their own real project/code. Return JSON only.',
    prompt: `Repository: ${repoName}
Description: ${description || 'none provided'}
Primary languages: ${langList}
README excerpt: """${(readmeExcerpt || '').slice(0, 2000)}"""

Perform a technical analysis of this repository and:
1. Explain what this project does and its core architecture.
2. Group the interview questions into three categories: "Architecture", "Implementation", and "Testing & Tradeoffs".
3. Return a list of 6 deep questions (2 per category).

Return JSON matching this schema:
{
  "summary": "Clear, concise technical summary of what the project does and its architecture",
  "categories": {
    "Architecture": ["q1", "q2"],
    "Implementation": ["q3", "q4"],
    "Testing & Tradeoffs": ["q5", "q6"]
  }
}`,
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
  resumeAnalyzePrompt,
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
