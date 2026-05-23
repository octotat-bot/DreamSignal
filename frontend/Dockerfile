# syntax=docker/dockerfile:1
#
# Dev-mode Vite container. Build context is the repo root so the
# `@shared` alias (-> ../shared from frontend/) resolves inside the
# container without a separate volume mount.
FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --no-audit --no-fund

COPY shared/ ./shared/
COPY frontend/ ./frontend/

WORKDIR /app/frontend
EXPOSE 5173

# --host 0.0.0.0 so the dev server is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
