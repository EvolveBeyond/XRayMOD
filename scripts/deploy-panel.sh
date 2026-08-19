#!/usr/bin/env bash
# Deploy one panel Worker (UI + worker) with D1 preserved.
# Uses prebuilt worker.mjs (CF API) — NOT wrangler deploy from TS source (avoids real CF 1101).
# Usage: deploy-panel.sh <worker_name> <d1_id> [d1_name]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="${1:?worker name}"
D1_ID="${2:?d1 id}"
D1_NAME="${3:-${NAME}-db}"
TOKEN_FILE="${CLOUDFLARE_API_TOKEN_FILE:-$HOME/.xraymod/cf_api_token}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  if [[ -f "$TOKEN_FILE" ]]; then
    CLOUDFLARE_API_TOKEN="$(cat "$TOKEN_FILE")"
    export CLOUDFLARE_API_TOKEN
  else
    echo "Set CLOUDFLARE_API_TOKEN or $TOKEN_FILE" >&2
    exit 1
  fi
fi

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-93b4aea5be3136d502f904d2e0b4a063}"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

if [[ ! -d frontend/out ]]; then
  echo "==> build UI"
  npm run build:ui
fi

echo "==> deploy $NAME (D1=$D1_ID) via worker.mjs module"
python3 scripts/deploy-worker-module.py "$NAME" "$D1_ID" --account-id "$ACCOUNT_ID"

# wrangler d1 execute still needs a temp config with account_id + d1 binding
CFG="$ROOT/.wrangler-deploy.${NAME}.toml"
trap 'rm -f "$CFG"' EXIT
cp wrangler.toml "$CFG"
python3 - "$CFG" "$NAME" "$D1_ID" "$D1_NAME" "$ACCOUNT_ID" <<'PY'
import sys, re
path, name, d1_id, d1_name, account_id = sys.argv[1:6]
text = open(path).read()
if not re.search(r'(?m)^account_id\s*=', text):
    text = f'account_id = "{account_id}"\n' + text
text = re.sub(r'(?m)^name\s*=\s*.*$', f'name = "{name}"', text, count=1)
text = re.sub(r'(?m)^database_name\s*=\s*.*$', f'database_name = "{d1_name}"', text, count=1)
text = re.sub(r'(?m)^database_id\s*=\s*.*$', f'database_id = "{d1_id}"', text, count=1)
text = re.sub(r'(?m)^preview_database_id\s*=\s*.*$', f'preview_database_id = "{d1_id}"', text, count=1)
open(path, "w").write(text)
PY

NOW="$(python3 -c 'import time;print(int(time.time()*1000))')"
TOKEN_SQL="$(python3 -c 'import os;print(os.environ["CLOUDFLARE_API_TOKEN"].replace("'\''","'\'''\''"))')"
PRODUCT_VER="$(python3 -c "import re; m=re.search(r\"XRayMOD_VERSION = '([^']+)'\", open('worker/lib/version.ts').read()); print(m.group(1) if m else '1.9.12')")"

npx wrangler d1 execute "$D1_NAME" --remote --config "$CFG" --command \
  "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.cf_api_token', '${TOKEN_SQL}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.cf_account_id', '${ACCOUNT_ID}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.worker_name', '${NAME}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.d1_id', '${D1_ID}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.version', '${PRODUCT_VER}', ${NOW});" || echo "(warn) kvstore seed skipped"

echo "OK: deployed $NAME"
