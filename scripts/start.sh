#!/usr/bin/env bash
# =============================================================================
# Dream Signal — Start Script
# Launches all three services concurrently in one terminal.
#   - AI Microservice  → http://localhost:8000
#   - Express Backend  → http://localhost:5001
#   - React Frontend   → http://localhost:5173
#
# Usage:  bash scripts/start.sh   (run from the repo root)
# Stop:   Ctrl+C  (gracefully kills all three)
# =============================================================================

set -uo pipefail

# ---------- Colours ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# PIDs for cleanup
AI_PID=0
BACKEND_PID=0
FRONTEND_PID=0

# ---------- Prefixed log helpers ----------
log_ai()       { while IFS= read -r line; do echo -e "${MAGENTA}[AI-SVC]${NC}   $line"; done; }
log_backend()  { while IFS= read -r line; do echo -e "${CYAN}[BACKEND]${NC}  $line"; done; }
log_frontend() { while IFS= read -r line; do echo -e "${BLUE}[FRONTEND]${NC} $line"; done; }

# ---------- Graceful shutdown ----------
cleanup() {
  echo ""
  echo -e "${YELLOW}${BOLD}Shutting down Dream Signal services...${NC}"

  [[ $AI_PID       -ne 0 ]] && kill "$AI_PID"       2>/dev/null && echo -e "${MAGENTA}[AI-SVC]${NC}   stopped (PID $AI_PID)"
  [[ $BACKEND_PID  -ne 0 ]] && kill "$BACKEND_PID"  2>/dev/null && echo -e "${CYAN}[BACKEND]${NC}  stopped (PID $BACKEND_PID)"
  [[ $FRONTEND_PID -ne 0 ]] && kill "$FRONTEND_PID" 2>/dev/null && echo -e "${BLUE}[FRONTEND]${NC} stopped (PID $FRONTEND_PID)"

  wait 2>/dev/null
  echo -e "${GREEN}All services stopped. Goodbye.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
echo -e ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║        DREAM SIGNAL — Starting Up...          ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Backend node_modules
if [[ ! -d "$REPO_ROOT/backend/node_modules" ]]; then
  echo -e "${YELLOW}[WARN]${NC}  backend/node_modules missing — run: bash scripts/setup.sh"
  exit 1
fi

# Frontend node_modules
if [[ ! -d "$REPO_ROOT/frontend/node_modules" ]]; then
  echo -e "${YELLOW}[WARN]${NC}  frontend/node_modules missing — run: bash scripts/setup.sh"
  exit 1
fi

# Python venv
if [[ ! -d "$REPO_ROOT/ai-service/venv" ]]; then
  echo -e "${YELLOW}[WARN]${NC}  ai-service/venv missing — run: bash scripts/setup.sh"
  exit 1
fi

# API keys warning (non-fatal)
if grep -q "YOUR_GEMINI_API_KEY" "$REPO_ROOT/ai-service/.env" 2>/dev/null; then
  echo -e "${YELLOW}[WARN]${NC}  GEMINI_API_KEY is still a placeholder in ai-service/.env"
fi
if grep -q "YOUR_HUGGINGFACE_API_KEY" "$REPO_ROOT/ai-service/.env" 2>/dev/null; then
  echo -e "${YELLOW}[WARN]${NC}  HUGGINGFACE_API_KEY is still a placeholder in ai-service/.env"
fi

# =============================================================================
# 1. AI MICROSERVICE (FastAPI)
# =============================================================================
echo -e "${MAGENTA}[AI-SVC]${NC}   Starting FastAPI on http://localhost:8000 ..."

(
  cd "$REPO_ROOT/ai-service"
  source venv/bin/activate
  exec uvicorn main:app --host 127.0.0.1 --port 8000 --reload 2>&1
) | log_ai &
AI_PID=$!

# =============================================================================
# 2. EXPRESS BACKEND
# =============================================================================
echo -e "${CYAN}[BACKEND]${NC}  Starting Express on http://localhost:5001 ..."

(
  cd "$REPO_ROOT/backend"
  exec npm run dev 2>&1
) | log_backend &
BACKEND_PID=$!

# =============================================================================
# 3. REACT FRONTEND
# =============================================================================
echo -e "${BLUE}[FRONTEND]${NC} Starting Vite on http://localhost:5173 ..."

(
  cd "$REPO_ROOT/frontend"
  exec npm run dev 2>&1
) | log_frontend &
FRONTEND_PID=$!

# =============================================================================
# READY BANNER (after a brief settle delay)
# =============================================================================
sleep 3
echo ""
echo -e "${GREEN}${BOLD}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}${BOLD}│  Dream Signal is running!                        │${NC}"
echo -e "${GREEN}${BOLD}│                                                  │${NC}"
echo -e "${GREEN}${BOLD}│  Frontend  →  http://localhost:5173              │${NC}"
echo -e "${GREEN}${BOLD}│  Backend   →  http://localhost:5001/api          │${NC}"
echo -e "${GREEN}${BOLD}│  AI Svc    →  http://localhost:8000/health       │${NC}"
echo -e "${GREEN}${BOLD}│                                                  │${NC}"
echo -e "${GREEN}${BOLD}│  Press Ctrl+C to stop all services               │${NC}"
echo -e "${GREEN}${BOLD}└─────────────────────────────────────────────────┘${NC}"
echo ""

# Keep the script alive — forward all log streams until Ctrl+C
wait
