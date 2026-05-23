#!/usr/bin/env bash
# =============================================================================
# Dream Signal — Stop Script
# Kills any services still listening on ports 5001, 5173, and 8000.
# Useful if start.sh was interrupted without a clean Ctrl+C.
# Usage: bash scripts/stop.sh   (run from the repo root)
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

kill_port() {
  local port=$1
  local label=$2
  local pid
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pid" ]]; then
    kill -9 "$pid" 2>/dev/null && echo -e "${GREEN}[STOPPED]${NC} $label (port $port, PID $pid)"
  else
    echo -e "${YELLOW}[SKIP]${NC}    $label — nothing running on port $port"
  fi
}

echo ""
echo -e "Stopping Dream Signal services..."
echo ""

kill_port 8000 "AI Microservice (FastAPI)"
kill_port 5001 "Express Backend"
kill_port 5173 "React Frontend (Vite)"

echo ""
echo -e "${GREEN}Done.${NC}"
echo ""
