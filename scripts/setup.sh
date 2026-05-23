#!/usr/bin/env bash
# =============================================================================
# Dream Signal — Setup Script
# Installs all dependencies for backend, ai-service, and frontend.
# Run once before starting the app for the first time.
# Usage: bash scripts/setup.sh   (run from the repo root)
# =============================================================================

set -euo pipefail

# ---------- Colours ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}━━━ $* ━━━${NC}"; }

# =============================================================================
# 1. PREREQUISITE CHECKS
# =============================================================================
header "Checking Prerequisites"

# Node.js
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install v20+ from https://nodejs.org"
fi
NODE_VER=$(node -e "process.exit(parseInt(process.versions.node) < 20 ? 1 : 0)" && echo "ok" || echo "old")
if [[ "$NODE_VER" == "old" ]]; then
  error "Node.js v20+ required. Current: $(node -v)"
fi
success "Node.js $(node -v)"

# Python 3
if ! command -v python3 &>/dev/null; then
  error "Python 3 not found. Install v3.11+ from https://python.org"
fi
success "Python $(python3 --version)"

# pip3
if ! command -v pip3 &>/dev/null; then
  error "pip3 not found. Install it alongside Python 3."
fi
success "pip3 $(pip3 --version | awk '{print $2}')"

# ffmpeg (required by faster-whisper for audio conversion)
if ! command -v ffmpeg &>/dev/null; then
  warn "ffmpeg not found — audio recording transcription will fail."
  warn "Install it with:  brew install ffmpeg"
else
  success "ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"
fi

# MongoDB (optional local — can use Atlas URI instead)
if command -v mongod &>/dev/null; then
  success "mongod $(mongod --version 2>&1 | head -1)"
else
  warn "Local mongod not found — make sure MONGODB_URI in backend/.env points to Atlas."
fi

# =============================================================================
# 2. STORAGE DIRECTORIES
# =============================================================================
header "Creating Storage Directories"

mkdir -p "$REPO_ROOT/storage/audio"
mkdir -p "$REPO_ROOT/storage/temp"
success "storage/audio  and  storage/temp  ready"

# =============================================================================
# 3. ENVIRONMENT FILE BOOTSTRAP
# =============================================================================
header "Checking .env Files"

check_env() {
  local path="$1"
  local label="$2"
  if [[ ! -f "$path" ]]; then
    warn "$label not found — creating from defaults. Fill in your API keys!"
  else
    success "$label exists"
  fi
}

check_env "$REPO_ROOT/backend/.env"    "backend/.env"
check_env "$REPO_ROOT/ai-service/.env" "ai-service/.env"
check_env "$REPO_ROOT/frontend/.env"   "frontend/.env"

# Warn if placeholder API keys are still present
if grep -q "YOUR_GEMINI_API_KEY" "$REPO_ROOT/ai-service/.env" 2>/dev/null; then
  warn "ai-service/.env still has placeholder GEMINI_API_KEY — update before running."
fi
if grep -q "YOUR_HUGGINGFACE_API_KEY" "$REPO_ROOT/ai-service/.env" 2>/dev/null; then
  warn "ai-service/.env still has placeholder HUGGINGFACE_API_KEY — update before running."
fi

# =============================================================================
# 4. BACKEND — npm install
# =============================================================================
header "Installing Backend Dependencies (Node.js)"

cd "$REPO_ROOT/backend"
npm install
success "backend/node_modules installed"

# =============================================================================
# 5. FRONTEND — npm install
# =============================================================================
header "Installing Frontend Dependencies (React + Vite)"

cd "$REPO_ROOT/frontend"
npm install
success "frontend/node_modules installed"

# =============================================================================
# 6. AI SERVICE — Python venv + pip install
# =============================================================================
header "Setting Up Python Virtual Environment (ai-service)"

cd "$REPO_ROOT/ai-service"

if [[ ! -d "venv" ]]; then
  python3 -m venv venv
  success "Created venv at ai-service/venv"
else
  success "venv already exists — skipping creation"
fi

# Activate and install
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt
deactivate

success "ai-service Python dependencies installed in venv"

# =============================================================================
# DONE
# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       Dream Signal setup complete! ✓             ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Next step:  ${CYAN}bash scripts/start.sh${NC}"
echo ""
echo -e "  ${YELLOW}Remember to add your API keys to ai-service/.env:${NC}"
echo -e "    GEMINI_API_KEY=...       → https://aistudio.google.com/app/apikey"
echo -e "    HUGGINGFACE_API_KEY=...  → https://huggingface.co/settings/tokens"
echo ""
