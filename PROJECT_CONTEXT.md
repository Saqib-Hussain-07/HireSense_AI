# HireSense AI — Build Reference (Phase 1: Core Voice MVP)

Condensed from the full blueprint. Read THIS file first in future turns instead of the original doc.

## What Phase 1 includes (build this now)
Auth · Profile · Resume upload/parse/ATS · JD analyzer · Match+skill gap · Interview generator ·
Full voice interview engine (TTS/STT, two-tier follow-ups, pushback, redo loop, timeout handling 45s/90s, session resume) ·
Rubric scoring w/ evidence quotes · Improved-answer diff · Session History & Replay · Dashboard w/ merged Delivery Score.

Explicitly OUT for Phase 1 (Phase 2+): STAR detection, Personas, GitHub analyzer, Weakness tracker, Learning plan,
JD-from-URL, Company question bank, Neutral Assessment Mode toggle (build schema field but not UI polish).

Explicitly REMOVED forever: Coding Interview module, Portfolio Builder, Leaderboard, Streak System, Battle Mode,
Standalone Voice Confidence Analyzer (pitch/energy), Recruiter Mode.

## Tech stack
- Frontend: React + Vite, Tailwind, React Router, React Query, Recharts
- Backend: Node.js + Express, WebSocket gateway for live voice turns, JWT auth
- DB: MongoDB (Mongoose). For local/dev without Atlas, fall back to in-memory Mongo or file-based store.
- AI reasoning: pluggable adapter — primary provider + fallback provider, narrow single-purpose prompts per call
- STT: Web Speech API (browser, primary) → Whisper API (fallback)
- TTS: ElevenLabs (primary) → browser SpeechSynthesis (fallback)
- File storage: Cloudinary (resumes) — stubbed with local disk storage for dev
- Resume parsing: pdf-parse / mammoth (docx) + LLM structuring pass

## Data models (Mongoose, simplified — see full field lists in blueprint if needed)
User, Resume, JobDescription, MatchReport, InterviewSession (core one — has questions[] with
answerTranscript, followUps[], rubricScores{relevance,structure,technicalAccuracy,businessThinking,
deliveryScore,star,creativity}, evidenceQuotes[], starCheck, idealAnswer, gapNotes, pushback, timedOut),
WeaknessTracker, LearningPlan.

## API routes (Phase 1 subset)
```
POST /api/auth/signup /login /google /forgot-password
GET/PUT /api/profile
POST /api/resume/upload   GET /api/resume/:id  GET /api/resume/versions
POST /api/jd/analyze
POST /api/match
POST /api/interview/generate
GET  /api/interview/:id
WS   /ws/interview/:id     (audio in -> transcript -> AI response -> TTS audio out)
POST /api/interview/:id/answer   (fallback non-WS)
POST /api/interview/:id/followup
POST /api/interview/:id/redo
POST /api/interview/:id/finish
GET  /api/history
GET  /api/dashboard/stats
```

## Key design rules to keep honoring
1. Every AI reasoning call is narrow/single-purpose (parse resume | extract JD | one follow-up | score one answer).
2. Reasoning model + STT + TTS each need primary/fallback adapter, session must never silently stall.
3. Delivery Score = transcript+timing derived only (filler words, WPM, sentence clarity) — NEVER claim pitch/energy analysis.
4. Session auto-saves after every turn -> supports resume on reload/reconnect.
5. Evidence-quote scoring: any score <70% of max must cite exact transcript phrase.
6. Timeout handling: 45s soft nudge, 90s auto-advance.
7. Two-tier follow-up: wordCount<12 or vague -> gentle open probe; else -> specific follow-up referencing their claim.

## Prompt templates
See blueprint section 9 (rubric scoring, adaptive follow-up, pushback, persona, STAR). Stored also in
backend/src/utils/prompts.js in this build.

## Build status log (update as we go)
- [x] Workspace + this context file created
- [x] Backend scaffold (package.json, server, db config w/ graceful in-memory-warning fallback)
- [x] Mongoose models (User, Resume, JobDescription, MatchReport, InterviewSession, WeaknessTracker, LearningPlan)
- [x] Auth (signup/login/google/forgot-password stub, JWT)
- [x] Resume upload/parse/ATS (multer + pdf-parse/mammoth + AI structuring)
- [x] JD analyzer (paste text; URL import returns 501 Phase-2-stub)
- [x] Match + skill gap
- [x] Interview generator
- [x] Voice interview engine (WS gateway /ws/interview/:id + aiAdapter + voiceAdapter, 45s/90s timeout handling, session resume via currentQuestionIndex)
- [x] Rubric scoring engine (scoringEngine.js: transcript-derived Delivery Score + AI rubric call)
- [x] Two-tier follow-up + pushback engine (followUpEngine.js)
- [x] History/Dashboard routes
- All backend files pass `node --check` syntax validation.
- [x] Frontend scaffold (React+Vite+Tailwind, dark "on-air" studio theme)
- [x] Frontend: auth pages (Login/Signup) + AuthContext + ProtectedRoute
- [x] Frontend: Resume upload/ATS page, JD analyzer page, Match & skill-gap page
- [x] Frontend: Interview setup page (type/difficulty/persona/mode picker)
- [x] Frontend: Voice interview session page — WebSocket hook + Web Speech API
      STT hook + TTS (backend ElevenLabs call w/ browser SpeechSynthesis fallback),
      live transcript preview, redo, follow-up/pushback/silence-nudge UI
- [x] Frontend: Session report page (rubric scores, evidence quotes, ideal answers)
- [x] Frontend: History page, Dashboard/Overview page with Recharts trends
- `npm run build` verified clean on frontend; backend boots and /api/health
  responds correctly with graceful Mongo-unavailable warning (not a crash).
- [x] Packaged to /mnt/user-data/outputs/hiresense-ai and delivered to user

## What's NOT done yet (good next steps, Phase 1 gaps)
- No real MongoDB/Gemini/ElevenLabs credentials wired in — needs a `.env` with
  real keys to go fully live (see README "What you need to fill in").
- Whisper STT fallback path exists server-side (voiceAdapter.speechToTextFallback)
  but the client doesn't yet upload an audio blob to it when Web Speech API is
  unsupported — currently only degrades gracefully with a warning message.
- Auth: no refresh tokens, no real forgot-password email delivery (stubbed).
- Google OAuth requires a real GOOGLE_CLIENT_ID configured on both ends.

## Test coverage (done — 27/27 passing)
- Using Jest + Supertest, backend/tests/. No mongodb-memory-server (its binary
  download domain isn't in the allowed network list) — DB-touching route tests
  mock the Mongoose models directly with jest.mock instead of a real DB.
- [x] tests/unit/scoringEngine.test.js — computeDeliveryScore heuristic (empty
      transcript, ideal pace, heavy filler words, run-on sentences, and a check
      that it never reads anything but transcript+timing) + scoreAnswer (mocked
      aiAdapter: combines rubric + delivery score into finalScore/100, propagates
      AI failures instead of faking a score)
- [x] tests/unit/aiAdapter.test.js — primary success, fallback-on-primary-error,
      both-fail throws AI_UNAVAILABLE, fenced-JSON parsing, malformed-JSON throws
- [x] tests/unit/followUpEngine.test.js — word-count tiering (gentle_probe vs
      specific_followup), pushback short-circuit on short claims, NO_PUSHBACK
      handling, real pushback text passthrough
- [x] tests/routes/auth.test.js — signup success/duplicate-email/missing-field,
      login success/wrong-password/unknown-email (User model mocked)
- [x] tests/routes/interview.test.js — /answer route: scores + saves + advances
      index, 401 without token, 400 bad questionIndex, 404 unknown session
- Run with `npm test` inside backend/ (jest.config.js + tests/env.setup.js sets
  a consistent JWT_SECRET for route tests that sign/verify real tokens).
- Not yet covered: WS gateway (wsGateway.js) turn-by-turn behavior and the
  45s/90s silence timers — would need a ws test client + fake timers, good
  next increment. Frontend has no test suite yet either.

## Location
Project root: /home/claude/hiresense-ai (backend/, frontend/)
Mirror of deliverables goes to /mnt/user-data/outputs/hiresense-ai as we finish chunks.

---

# PHASE 2 — Differentiation (in progress)

Scope: STAR detection · Personas (already partially in Phase 1 setup UI/prompts,
now actually applied to session generation+scoring) · GitHub analyzer/project
explainer · Weakness tracker · Learning plan · JD-from-URL · Company question
bank · Neutral Assessment Mode (schema existed since Phase 1, now real UI+behavior).

## Phase 2 build status log
- [x] STAR detection — starEngine.js (detectStar), wired into scoringEngine.scoreAnswer
      only when sessionType === 'behavioral' (folds STAR completeness into the
      `star` rubric slot, 0-10); question.starCheck populated on /answer, /redo,
      and the WS gateway path; report page shows a STAR breakdown chip row
- [x] Personas — now actually injected (personaSystemPrompt prefix) into
      rubricScoringPrompt, adaptiveFollowUpPrompt, and pushbackPrompt (not just
      question generation as in Phase 1), threaded through routes + wsGateway
- [x] GitHub Analyzer + Project Explainer — githubEngine.js (GitHub REST API,
      no auth needed for public repos but GITHUB_TOKEN env var raises the rate
      limit) + POST /api/github/analyze + frontend GithubAnalyzerPage
- [x] Weakness Tracker — weaknessEngine.js extracts real skill/topic labels
      (not just rubric dimension names) from a session's <60-score answers via
      one narrow AI call, upserts occurrence counts; auto-runs on /finish;
      GET /api/weakness-tracker route
- [x] Learning Plan — learningEngine.js generates a 7-day plan from the top-5
      weak topics by occurrence; GET /api/learning-plan (regenerates each call)
- [x] JD-from-URL — real implementation now (was a 501 stub in Phase 1):
      node-fetch + cheerio strips the page to body text; degrades to a clear
      422 error telling the user to paste text if extraction comes back thin
      (e.g. JS-rendered career pages)
- [x] Company Question Bank — CompanyQuestion model + GET (filter by
      company/tag) + POST (submit) routes; Phase-2-honest scope note: this is
      NOT true crowdsourcing yet (no moderation/upvote pipeline), submissions
      are just flagged `source: 'user_submitted'` and shown as "unverified"
- [x] Neutral Assessment Mode — mode field + rubric prompt behavior already
      existed since Phase 1; verified/left as-is (persona prefix does not
      override the mode's "no encouraging language" instruction)
- [x] Backend tests for all of the above (see Test coverage section below)
- [x] Frontend UI: JD page now has a Paste/URL toggle; new GrowthPage (weakness
      tracker + learning plan combined view); new GithubAnalyzerPage; new
      CompanyQuestionsPage; SessionReportPage shows a STAR breakdown chip row
      when starCheck data is present; Shell nav updated with the new links
- `npm run build` verified clean on frontend (899 modules); backend test suite
  at 42/42 passing.
- [x] Repackaged + delivered

## Test coverage (Phase 2 additions — all passing)
- tests/unit/starEngine.test.js — short-circuit on tiny transcripts (no AI
  call), full STAR classification parsing, missing-field coercion to false
- tests/unit/scoringEngine.test.js (extended) — STAR detection runs and folds
  into the `star` rubric slot only for sessionType 'behavioral'; confirmed it
  does NOT run for technical/other types
- tests/unit/weaknessEngine.test.js — no-op when no low-scoring answers, new
  tracker creation, case-insensitive occurrence incrementing for existing topics
- tests/unit/learningEngine.test.js — no-topics-yet fallback note, correct
  occurrence-based topic prioritization ordering, upsert call shape
- tests/unit/githubEngine.test.js — bad URL rejection, full metadata+languages+
  README happy path, 404/403 error messages, README-fetch-failure is non-fatal
- Total backend suite: 42 tests / 9 suites, all passing, no real DB/API keys needed.

---

# PHASE 3 — Expansion (in progress)

Blueprint scope: Panel Interview Mode (two personas in one session) · Company-
specific interview packs · Recruiter mode (as a fully separate product surface,
if pursued at all — blueprint explicitly says "only after Phase 1+2 have real
users" and treats Recruiter Mode as optional/deferred, not a firm commitment).

## Decision on Recruiter Mode
NOT building this. The blueprint itself scopes it as "a separate B2B product
surface with different auth/data model; revisit only after B2C traction" and
Phase 3 repeats "if pursued at all." Building a real B2B surface means a second
auth model, a different data model (recruiter orgs, candidate pipelines,
permissions), and product decisions (pricing, seats) that don't exist yet.
Faking a thin "recruiter mode" toggle on the existing candidate-side schema
would misrepresent what was actually built. Documenting the decision here
instead of writing throwaway/misleading code.

## Phase 3 build status log
- [x] Panel Interview Mode — InterviewSession has `panelPersonas: [String]` +
      `questions[].persona`; panelEngine.js generates ~half the questions per
      persona and interleaves them round-robin; POST /api/interview/generate
      accepts `panelPersonas: [a, b]` instead of a single `persona`; scoring/
      follow-up/pushback (routes + wsGateway) all resolve effective persona as
      `q.persona || session.persona`, so panel and single-persona sessions
      share the same code path; WS `question` message now includes `persona`
      so the frontend can show which interviewer is asking; setup page has a
      Panel Mode toggle + second persona picker; voice session page shows the
      current persona label per question.
- [x] Company-specific interview packs — InterviewPack model (name, company,
      description, defaults) + GET/POST /api/packs + packEngine.js (pulls real
      Company Question Bank entries for that company first, tops up with AI-
      generated questions, avoiding duplicates) + POST /api/interview/generate-
      from-pack; frontend PacksPage (browse/filter/create/start session).
      Honest scope note carried over: no admin curation/moderation layer.
- [x] Recruiter Mode — deliberately NOT built; see "Decision on Recruiter Mode"
      above. Documented instead of faking a thin stub.
- [x] Backend tests: panelEngine.test.js (round-robin interleaving, odd counts,
      uneven persona output), packEngine.test.js (bank-only, AI top-up with
      dedup instructions, override precedence), routes/interviewPhase3.test.js
      (panel validation + session shape, pack 404 + session shape)
- [x] Frontend: Panel Mode toggle + persona-B picker on setup page; persona
      label shown live during voice sessions; new PacksPage with browse/create/
      start-session flow; Shell nav updated
- `npm run build` verified clean on frontend (900 modules); backend test suite
  at 52/52 passing across 12 suites.
- [x] Repackaged + delivered

## Test coverage (Phase 3 additions — all passing)
- tests/unit/panelEngine.test.js — 2 AI calls (one per persona), correct
  round-robin interleave order, odd-total-count handling (persona A gets the
  extra), graceful handling when one persona under-delivers questions
- tests/unit/packEngine.test.js — bank-only path skips the AI call entirely,
  thin-bank path tops up and tags sources correctly, dedup instructions are
  actually included in the top-up prompt, explicit type/difficulty/persona
  overrides beat pack defaults
- tests/routes/interviewPhase3.test.js — /generate rejects malformed
  panelPersonas (not exactly 2), builds session with correct panelPersonas +
  per-question persona tagging; /generate-from-pack 404s on missing pack,
  builds session from pack engine output and returns questionSources
- Total backend suite: 52 tests / 12 suites, all passing, no real DB/API keys needed.

---

# Where things stand after Phase 1 + 2 + 3
All blueprint-scoped work is done except Recruiter Mode (deliberately skipped,
see decision note above — it was explicitly optional/deferred in the source
blueprint too). The product now covers: full voice interview loop with
reliability patterns (Phase 1), differentiators like STAR/personas-in-depth/
GitHub analyzer/weakness tracking/learning plans/JD-from-URL/company question
bank (Phase 2), and Panel Mode + company packs (Phase 3). 52 backend tests
passing, frontend builds clean. Real API keys (Gemini/Groq/ElevenLabs/Mongo)
are still needed to run it fully live — see README "What you need to fill in".

---

# PHASE 4 — Frontend rebuild (in progress)

User wants the frontend restructured into a specific 4-screen flow, referencing
a "Meet Anaya" style landing page screenshot (dark bg, warm gold/amber accent,
serif display headline, 3 feature cards, a "before you begin" checklist box,
pill-shaped CTA button). Backend is NOT changing — this is frontend-only.

## Required flow (in this exact order)
1. **Landing page** (public, `/`) — marketing/explainer page. What the product
   is and does. NOT a login page. Modeled on the reference: eyebrow label,
   headline with serif display font + gold accent on second line, subhead,
   3 feature cards, a checklist card, pill CTA button that leads to login/signup.
2. **Login/Registration page** (`/login`, `/signup`) — existing auth pages,
   restyled to match the new visual language (serif headline, same tokens).
3. **Setup page** (protected, e.g. `/setup`) — ONE combined page: upload
   resume, paste/URL the JD, then "Set up your voice interview" (type/
   difficulty/persona/panel-mode/mode). Replaces the old separate Resume/JD/
   Match pages as the PRIMARY flow. On submit: upload resume -> analyze JD ->
   create match report (best-effort, non-blocking if it fails) -> generate
   interview session -> navigate to the interview page.
4. **Voice interview page** (protected, `/interview/:id`) — existing page,
   kept largely as-is (already matches the dark theme), just visually
   reconciled with the new design tokens if needed.

## Design tokens carried over / added
Reusing existing Tailwind tokens (ink/panel/onair/signal/alert/etc from
tailwind.config.js) since they already match the reference's dark+gold
aesthetic. ADDING a serif display font (Playfair Display) for hero headlines
to match the reference screenshot's serif "Meet Anaya" heading — existing
Space Grotesk stays for in-app headers, Playfair Display is landing-page-only.

## Secondary pages (Dashboard, History, Growth, GitHub analyzer, Company
Questions, Packs) — decision: KEPT, but demoted to secondary nav reachable
from inside the app shell (post-setup), not part of the required 4-step
critical path. Not rebuilding these visually in this pass unless asked.

## Phase 4 build status log
- [x] LandingPage.jsx (new, public route at `/`) — eyebrow label, circular
      avatar with pulse-dot online indicator, serif headline (2-line, 2nd
      line gold italic), subhead, 3 feature cards, "Before you begin"
      checklist card, pill CTA -> /signup, secondary link -> /login
- [x] Restyled Login.jsx / Signup.jsx — serif headline, "back to overview"
      link to `/`, redirect target changed from `/` to `/setup` post-auth
- [x] SetupPage.jsx (new) — single page, 3 numbered StepCards: upload resume
      -> paste/URL JD + analyze -> configure (type/difficulty/persona/mode);
      "I'm ready — let's begin" button disabled until resume+JD both present;
      on submit: uploads already done inline per-step, then best-effort
      match-report creation (non-blocking on failure) -> generate interview
      -> navigate to /interview/:id
- [x] Added Playfair Display serif font (index.html + tailwind.config.js
      `font-serif`) for landing/setup/auth headlines only; existing Space
      Grotesk/Inter/IBM Plex Mono tokens unchanged and still used everywhere else
- [x] App.jsx rewired: `/` = Landing (public), `/login` `/signup` = auth,
      `/setup` = new primary flow (protected, no shell), `/interview/:id` =
      voice session (protected, no shell) — these are the required 4 screens,
      in order. Old Dashboard/Resume/JD/Match/InterviewSetup(now "Advanced
      setup")/History/Growth/GitHub/CompanyQuestions/Packs pages all KEPT,
      moved to secondary routes reachable from the Shell nav post-login
      (Dashboard now lives at `/dashboard` instead of `/`)
- [x] Shell nav updated: "Overview" -> /dashboard, "New session" -> /setup
      (primary), old detailed wizard relabeled "Advanced setup" -> /interview/new
      (still has Panel Mode + match-report-driven generation, SetupPage does not)
- [x] Dashboard's "start a session" CTA repointed from /interview/new to /setup
- `npm run build` verified clean (902 modules, ~185KB gzipped JS)
- [x] Repackage + deliver

## Note on scope vs. the old InterviewSetupPage
SetupPage.jsx (new, primary /setup route) is intentionally simpler than the
old InterviewSetupPage.jsx (kept at /interview/new, relabeled "Advanced
setup" in nav) — it does NOT expose Panel Mode (2-persona) selection, only
single persona. If Panel Mode needs to be reachable from the primary flow
too, that's a small follow-up (copy the toggle from InterviewSetupPage into
SetupPage's step 3) rather than a redesign.

