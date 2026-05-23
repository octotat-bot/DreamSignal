#!/usr/bin/env bash
# =============================================================================
# Dream Signal — Production deploy (Docker Compose + Caddy TLS)
#
# Usage (on your VPS, from repo root):
#   cp deploy/.env.production.example .env.production
#   nano .env.production          # fill DOMAIN, MONGODB_URI, keys
#   bash scripts/deploy-prod.sh
#
# Requirements:
#   - Docker + Docker Compose v2
#   - Domain A record pointing at this server
#   - MongoDB Atlas cluster with this server's IP whitelisted
#   - At least 4 GB RAM (AI service loads Whisper + sentence-transformer)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.production"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Missing $ENV_FILE${NC}"
  echo "Copy deploy/.env.production.example → .env.production and fill in values."
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

missing=()
[[ -z "${DOMAIN:-}" ]] && missing+=("DOMAIN")
[[ -z "${MONGODB_URI:-}" ]] && missing+=("MONGODB_URI")
[[ -z "${JWT_SECRET:-}" ]] && missing+=("JWT_SECRET")
[[ -z "${GEMINI_API_KEY:-}" ]] && missing+=("GEMINI_API_KEY")

if ((${#missing[@]})); then
  echo -e "${RED}Missing required vars in .env.production:${NC} ${missing[*]}"
  exit 1
fi

if [[ "$JWT_SECRET" == *"replace_with"* ]] || ((${#JWT_SECRET} < 32)); then
  echo -e "${YELLOW}JWT_SECRET should be a random string of at least 32 characters.${NC}"
  exit 1
fi

echo -e "${BOLD}${GREEN}Deploying DreamSignal → https://${DOMAIN}${NC}"
echo ""

cd "$REPO_ROOT"

docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml pull caddy redis 2>/dev/null || true
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up --build -d

echo ""
echo -e "${GREEN}${BOLD}Deploy complete.${NC}"
echo ""
echo "  Site:    https://${DOMAIN}"
echo "  Health:  https://${DOMAIN}/api/health"
echo ""
echo "Useful commands:"
echo "  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f"
echo "  docker compose --env-file .env.production -f docker-compose.prod.yml ps"
echo ""
