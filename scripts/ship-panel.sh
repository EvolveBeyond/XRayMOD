#!/usr/bin/env bash
# Build UI + deploy live panel from ~/.xraymod/config.json (worker.mjs API path).
# Usage: ship-panel.sh [--skip-build]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CFG="${XRAYMOD_CONFIG:-$HOME/.xraymod/config.json}"
if [[ ! -f "$CFG" ]]; then
  echo "Missing $CFG — run installer or create config first" >&2
  exit 1
fi

read -r WORKER D1 ACCOUNT <<<"$(python3 - "$CFG" <<'PY'
import json, sys
c = json.load(open(sys.argv[1]))
print(c.get("worker_name", "xraymod"), c.get("d1_id", ""), c.get("account_id", ""))
PY
)"

if [[ -z "$D1" ]]; then
  echo "config.json missing d1_id" >&2
  exit 1
fi

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> build UI"
  npm run build:ui
fi

if [[ -n "$ACCOUNT" ]]; then
  export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"
fi

echo "==> deploy $WORKER"
bash scripts/deploy-panel.sh "$WORKER" "$D1"

echo "OK: $(python3 -c "import json;print(json.load(open('$CFG')).get('panel_url',''))")"
