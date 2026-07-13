# ─── HireSense AI — Backend Dockerfile ───────────────────────────────────────
# Production-ready Node.js image using Alpine for minimal size.
# Multi-stage is not needed here (backend has no build step).
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install dependencies first (layer-cached separately from source code)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Ensure uploads directory exists (volume-mounted in production)
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

# Runtime configuration
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Health check — used by Docker Compose and Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
