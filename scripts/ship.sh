#!/usr/bin/env bash
set -euo pipefail

# ── ship.sh ─────────────────────────────────────────────────────────
# Deploy web to EAS Hosting + build local iOS production IPA
# Usage: ./scripts/ship.sh
# ─────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.."

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

step() { echo -e "\n${CYAN}▸ $1${RESET}"; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }
fail() { echo -e "${RED}✘ $1${RESET}"; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────
step "Preflight checks"
command -v eas >/dev/null 2>&1 || fail "eas-cli not found. Run: npm i -g eas-cli"
command -v npx >/dev/null 2>&1 || fail "npx not found"

VERSION=$(node -e "const c = require('./app.config.js'); console.log((typeof c === 'function' ? c() : c).expo?.version ?? c.version ?? 'unknown')" 2>/dev/null || echo "unknown")
echo -e "${DIM}App version: ${VERSION}${RESET}"

# ── Step 1: Export web ───────────────────────────────────────────────
step "Exporting web bundle"
npx expo export -p web
ok "Web export complete"

# ── Step 2: Deploy to EAS Hosting (prod) ─────────────────────────────
step "Deploying to EAS Hosting (production)"
eas deploy --prod 2>&1 | tee deploy.log
ok "Web deployed to EAS Hosting"

# ── Step 3: OTA update production channel ────────────────────────────
step "Publishing OTA update (production channel)"
eas update --channel production --message "v${VERSION} ship"
ok "OTA update published"

# ── Step 4: Build iOS production locally ─────────────────────────────
step "Building iOS production IPA (local)"
TIMESTAMP=$(date +%s%3N)
IPA_NAME="build-${TIMESTAMP}.ipa"

SENTRY_DISABLE_PLUGIN=1 \
SENTRY_DISABLE_AUTO_UPLOAD=true \
SENTRY_ALLOW_FAILURE=true \
NODE_ENV=production \
eas build --local -p ios --profile production --output "${IPA_NAME}"

ok "iOS build complete → ${IPA_NAME}"

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Ship complete · v${VERSION}${RESET}"
echo -e "${DIM}  Web:  see deploy.log for URL${RESET}"
echo -e "${DIM}  iOS:  ./${IPA_NAME}${RESET}"
echo -e "${GREEN}════════════════════════════════════════${RESET}"
