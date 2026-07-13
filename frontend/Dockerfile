# ─── HireSense AI — Frontend Dockerfile ──────────────────────────────────────
# Multi-stage build:
#   Stage 1 (builder) — Node.js + Vite produces the static dist/
#   Stage 2 (serve)   — nginx:alpine serves dist/ with SPA routing
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies separately from source
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

# Copy source and build
COPY . .
# VITE_API_URL is set at build time via --build-arg or docker-compose build args
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/hiresense.conf

# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
