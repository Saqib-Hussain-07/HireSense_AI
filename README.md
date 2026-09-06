# HireSense AI

> **Voice-first AI interview coach** — Upload your CV and the job description,
> speak your interview answers aloud, and get a detailed rubric-scored report
> with evidence quotes and an improvement roadmap.

---

## Quick Start

### Option A — Docker Compose (Zero Dependency Setup)

The fastest way to spin up the entire stack including **MongoDB**, **Backend API**, and **Frontend App**:

```bash
# 1. Clone the repository
git clone <repo-url> hiresense-ai
cd hiresense-ai

# 2. Setup Docker environment variables
cp .env.docker.example .env
# Edit .env with your AI API keys (GEMINI_API_KEY, GROQ_API_KEY, etc.)

# 3. Start the entire container stack
docker compose up -d --build
# Or via npm script: npm run docker:up

# → Frontend (Web): http://localhost:3000
# → Backend (API):  http://localhost:5000/api/health
# → Database:       mongodb://localhost:27017
```

For hot-reload local development with Docker:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# Or: npm run docker:dev
```

---

### Option B — Local Node.js Development

```bash
# 1. Install all dependencies (root + workspaces)
npm install

# 2. Configure secrets
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys (see Environment Variables below)

# 3. Start both services (hot-reload)
npm run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:5000

# 4. (Optional) Verify all API keys are working
npm run check:apis
```

> See [DEPLOYMENT.md](DEPLOYMENT.md) for Docker, Render, Railway, and Vercel guides.

---

## User Flow

```
/ (Landing) → /signup or /login → /setup (CV + JD + Interview config) → /interview/:id (Live voice session) → /interview/:id/report
```

After login, a sidebar also gives access to: Dashboard · Resume Manager ·
JD Library · Match & Gaps · History & Replay · Growth Tracker ·
GitHub Analyzer · Company Question Bank · Interview Packs.

---

## Project Structure

```
HireSense AI/
├── .gitignore
├── .github/workflows/ci.yml   ← GitHub Actions CI
├── package.json                ← npm workspaces root
├── render.yaml                 ← One-click Render.com deploy
├── DEPLOYMENT.md               ← Full deployment guide
│
├── backend/                    ← Node.js + Express API + WebSocket
│   ├── .env.example            ← Required environment variables
│   ├── scripts/
│   │   └── checkApis.js        ← Diagnostic: verify all API keys
│   └── src/
│       ├── config/             ← Database connection
│       ├── middleware/         ← JWT auth
│       ├── models/             ← Mongoose schemas (8 models)
│       ├── routes/             ← Express route handlers (13 modules)
│       ├── services/           ← AI, voice, scoring, WebSocket engines
│       ├── utils/              ← Prompt templates
│       └── server.js           ← Entry point
│
└── frontend/                   ← React 18 + Vite + Tailwind CSS
    ├── .env.example            ← VITE_API_URL
    └── src/
        ├── components/         ← Shell, ProtectedRoute, PageHeader
        ├── context/            ← AuthContext
        ├── hooks/              ← useVoice, useInterviewSocket
        ├── lib/                ← API client
        └── pages/              ← All route pages
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas URI or local `mongod` |
| `JWT_SECRET` | Yes | Long random string (≥32 chars) |
| `GEMINI_API_KEY` | Yes | Primary AI reasoning (Google AI Studio) |
| `GROQ_API_KEY` | Yes | Fallback AI + Whisper STT |
| `ELEVENLABS_API_KEY` | No | TTS voice (browser fallback if missing) |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID |
| `CLOUDINARY_*` | No | Resume storage (local `uploads/` if missing) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth login |

---

## Architecture Highlights

- **Pluggable AI adapter** (`src/services/aiAdapter.js`) — tries Gemini first, falls back to Groq automatically on error/timeout. Every reasoning call is narrow and single-purpose.
- **Two-tier follow-ups** (`src/services/followUpEngine.js`) — vague answers get an open probe; strong answers get a specific follow-up referencing the candidate's words + a separate pushback check.
- **Voice engine** — Browser Web Speech API (STT primary, no key needed) + ElevenLabs TTS. Server-side Whisper fallback for browsers without STT support.
- **WebSocket gateway** (`src/services/wsGateway.js`) — stateful session per connection, 45s/90s silence nudge + auto-advance, session resume on reconnect.
- **Delivery Score** — computed from transcript + turn timing only (filler rate, WPM, clarity). No audio analysis — intentionally excluded per scope.

---

## Running Tests

```bash
npm run test
# or: cd backend && npm test
```

52 tests · 12 suites · fully mocked (no real DB/API calls):

| Suite | Coverage |
|---|---|
| `aiAdapter` | Primary/fallback provider chain |
| `scoringEngine` | Delivery score + rubric scoring + STAR |
| `followUpEngine` | Two-tier follow-up + pushback |
| `starEngine` | STAR classification (behavioral answers) |
| `weaknessEngine` | Weak-topic extraction + tracker upserts |
| `learningEngine` | Learning plan generation |
| `githubEngine` | Repo analysis + error handling |
| `panelEngine` | Panel mode question interleaving |
| `packEngine` | Interview pack sourcing + AI top-up |
| `auth.routes` | Signup/login integration |
| `interview.routes` | Answer scoring route |
| `interviewPhase3.routes` | Panel mode + pack-based generation |

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- Render.com (one-click via `render.yaml`)
- Railway
- Vercel (frontend) + Render (backend) split
- Environment variable reference
- Health check endpoint

---

## Documentation & Contributing

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — **Start here!** 5-minute setup steps, repository directory tour, and the core engineering principles (e.g. *One AI call per turn*, deterministic scoring, and indexed queries).
- **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** — Deep-dive architectural specification, historical data models, and prompt templates.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Production deployment instructions for Render, Railway, Docker, and Vercel.

