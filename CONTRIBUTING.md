# Contributing to HireSense AI

Welcome to HireSense AI! This guide is designed to get you up and running quickly with local setup, repository architecture, and our core engineering principles.

For the full specification, comprehensive data models, and prompt references, see [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

---

## 1. Quick Mental Model

HireSense AI is a voice-first interview coaching and resume intelligence platform:
- **Frontend**: React 18, Vite, Tailwind CSS, TanStack Query, Web Speech API.
- **Backend**: Node.js 20+, Express, WebSocket (`ws`), Mongoose / MongoDB.
- **Authentication**: Clerk JWTs validated directly via JWKS and mapped to MongoDB users.
- **AI Reasoning**: Pluggable adapter (`Gemini 2.5 Flash` primary, `Groq Llama-3.3-70b` fast fallback).

---

## 2. 5-Minute Local Setup

### Prerequisites
- **Node.js**: >= 18 (Node 20+ recommended)
- **MongoDB**: Local `mongod` or MongoDB Atlas URI

### Setup Steps

```bash
# 1. Install root, backend, and frontend dependencies
npm install

# 2. Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env:
# - MONGO_URI (e.g., mongodb://127.0.0.1:27017/hiresense)
# - GEMINI_API_KEY / GROQ_API_KEY
# - CLERK_ISSUER / CLERK_SECRET_KEY / VITE_CLERK_PUBLISHABLE_KEY

# 3. Start local development servers (Frontend :5173, Backend :5000)
npm run dev

# 4. Verify test suites and frontend build
npm test --workspace=backend
npm run build --workspace=frontend
```

---

## 3. Where Things Live

```
HireSense AI/
├── backend/
│   ├── src/
│   │   ├── config/             # DB pool tuning (src/config/db.js)
│   │   ├── middleware/         # Auth verification (src/middleware/auth.js)
│   │   ├── models/             # Indexed Mongoose models (User, InterviewSession, Resume, MatchReport...)
│   │   ├── routes/             # Express endpoints (interview, resume, jd, match, history, dashboard...)
│   │   ├── services/
│   │   │   ├── aiAdapter.js        # Gemini/Groq fallback chain
│   │   │   ├── atsScoringEngine.js # 100% deterministic ATS benchmark formula
│   │   │   ├── clerkAuth.js        # JWKS verification & user upsert
│   │   │   ├── scoringEngine.js    # Turn evaluation & rubric scoring
│   │   │   ├── wsGateway.js        # WebSocket voice gateway & positional updates
│   │   │   └── githubEngine.js     # Concurrent GitHub repo analyzer
│   │   └── utils/prompts.js    # Grounded prompt templates
│   └── tests/                  # Unit and route integration test suites
│
└── frontend/
    └── src/
        ├── components/         # Shell, navigation, ProtectedRoute, PageHeader
        ├── context/            # AuthContext (resolved via getAuthToken)
        ├── hooks/              # useInterviewSocket, useVoice, useClerkBridge
        ├── lib/api.js          # REST client and WebSocket URL builder
        └── pages/              # Dashboard, Setup, VoiceInterview, Resume, JD, Match, History...
```

---

## 4. Core Engineering Principles

When writing or modifying code in HireSense AI, always follow these rules:

### A. One AI Call Per Turn (Turn Evaluation Principle)
- When scoring an interview answer in `src/services/scoringEngine.js`, **never trigger chained sequential AI calls**.
- A single LLM prompt resolves:
  1. 5-dimension rubric scores (1–5 discrete ratings scaled to 0–10).
  2. Evidence quotes and specific constructive feedback.
  3. STAR structure detection for behavioral questions.
  4. Adaptive follow-up questions and debatable claim pushbacks.

### B. Deterministic Scoring Over LLM Guesswork
- **ATS Benchmarks** (`src/services/atsScoringEngine.js`): Keyword matching, formatting parseability, quantified metric density, and bullet strength are computed strictly in deterministic code, not by prompting an LLM to guess a score.
- LLMs are reserved strictly for unstructured qualitative feedback (e.g. suggesting study resources or personalized tips).

### C. Database & Query Performance
- **Compound Indexes**: Every user-scoped query pattern is backed by compound indexes (e.g. `{ userId: 1, createdAt: -1 }`, `{ userId: 1, status: 1, createdAt: -1 }`). Never introduce an unindexed collection scan.
- **Positional Updates**: Turn-by-turn interview answers are updated via MongoDB positional operators (`updateOne({ _id, 'questions._id': qId }, { $set: ... })`) to avoid rewriting entire documents on every turn.
- **Lean Queries**: Always use `.lean()` and targeted field projections (`.select(...)`) when querying documents that contain large text or transcript blobs.

### D. Single Token Source of Truth
- Session tokens are obtained directly on-demand via `getAuthToken()` (from Clerk's session manager).
- Avoid caching or mirroring tokens in parallel storage keys like `localStorage`.

---

## 5. Testing & Verification

Before opening a pull request, ensure all tests pass and the production bundle builds cleanly:

```bash
# Run all backend unit and route integration tests
npm test --workspace=backend

# Run frontend production build
npm run build --workspace=frontend
```

---

## 6. Additional Resources

- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)**: Exhaustive product blueprint, schemas, and API design specifications.
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Production deployment instructions for Render, Railway, Docker, and Vercel.
