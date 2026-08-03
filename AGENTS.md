# AGENTS.md

## Purpose
This file gives coding agents and contributors the minimum project context needed to make safe, consistent changes in this repository.

## Repository Overview
- **Project**: HireSense AI (voice-first AI interview coaching platform)
- **Monorepo**: npm workspaces with `backend` and `frontend`
- **Runtime**: Node.js `>=18`, npm `>=9`

## Key Paths
- `/home/runner/work/HireSense_AI/HireSense_AI/backend` — Express API, WebSocket services, Jest tests
- `/home/runner/work/HireSense_AI/HireSense_AI/frontend` — React + Vite app
- `/home/runner/work/HireSense_AI/HireSense_AI/.github/workflows/ci.yml` — CI workflow
- `/home/runner/work/HireSense_AI/HireSense_AI/README.md` — primary project documentation
- `/home/runner/work/HireSense_AI/HireSense_AI/DEPLOYMENT.md` — deployment reference

## Local Setup
From repository root:
1. `npm install`
2. Copy env templates:
   - `backend/.env.example` → `backend/.env`
   - `frontend/.env.example` → `frontend/.env` (if needed)
3. Start both services: `npm run dev`

## Build, Test, and Validation
From repository root:
- Run backend tests: `npm run test`
- Build frontend: `npm run build`
- Optional API key diagnostics: `npm run check:apis`

CI currently validates:
- Backend tests
- Frontend build

## Change Guidelines
- Keep changes minimal and scoped to the task.
- Follow existing module style:
  - Backend uses **CommonJS**.
  - Frontend uses **ES modules**.
- Do not commit secrets or real credentials.
- If behavior changes, update relevant docs (`README.md`, `DEPLOYMENT.md`, or route/service docs).
- Prefer adding/updating tests when backend logic changes.

## Safety Checklist for Agents
Before finalizing:
1. Confirm only intended files changed.
2. Run relevant validation commands for touched areas.
3. Ensure no secrets are introduced.
4. Summarize what changed and why.
