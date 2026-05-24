# syntax=docker/dockerfile:1
#
# Build context is the repo root (see docker-compose.yml) so we can
# include both backend/ and the shared/ contracts folder that the
# backend require()s at runtime.
FROM node:20-alpine

WORKDIR /app

# Install backend deps first for better layer caching.
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --no-audit --no-fund

# Shared API contracts — backend imports via `../../shared/contracts`.
COPY shared/ ./shared/
# Install zod inside shared so Node ESM resolution can find it when 
# contracts.js is dynamically imported by the backend.
RUN cd shared && npm install zod --no-audit --no-fund

COPY backend/ ./backend/
# Maintenance scripts (run as separate compose services, e.g. cleanup cron).
COPY scripts/ ./scripts/

RUN mkdir -p storage/audio storage/temp

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001

WORKDIR /app/backend
CMD ["node", "server.js"]
