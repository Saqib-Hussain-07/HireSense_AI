# ─── HireSense AI Backend Dockerfile ───────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules (if any)
RUN apk add --no-cache curl

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production
ENV PORT=5000

# Copy node modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Create upload directory and set ownership to node user
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
