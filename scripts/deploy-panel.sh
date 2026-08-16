#!/usr/bin/env bash
# Deploy one panel Worker (UI + worker) with D1 preserved.
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

if [[ ! -d frontend/out ]]; then
  echo "==> build UI"
  npm run build:ui
fi

# Keep config inside project so relative main/assets paths resolve
CFG="$ROOT/.wrangler-deploy.${NAME}.toml"
trap 'rm -f "$CFG"' EXIT
cp wrangler.toml "$CFG"
python3 - "$CFG" "$NAME" "$D1_ID" "$D1_NAME" <<'PY'
import sys, re
path, name, d1_id, d1_name = sys.argv[1:5]
text = open(path).read()
text = re.sub(r'(?m)^name\s*=\s*.*$', f'name = "{name}"', text, count=1)
text = re.sub(r'(?m)^database_name\s*=\s*.*$', f'database_name = "{d1_name}"', text, count=1)
text = re.sub(r'(?m)^database_id\s*=\s*.*$', f'database_id = "{d1_id}"', text, count=1)
text = re.sub(r'(?m)^preview_database_id\s*=\s*.*$', f'preview_database_id = "{d1_id}"', text, count=1)
open(path, "w").write(text)
PY

echo "==> deploy $NAME (D1=$D1_ID)"
npx wrangler deploy --config "$CFG"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-93b4aea5be3136d502f904d2e0b4a063}"
NOW="$(python3 -c 'import time;print(int(time.time()*1000))')"
# Escape token for SQL string literal
TOKEN_SQL="$(python3 -c 'import os;print(os.environ["CLOUDFLARE_API_TOKEN"].replace("'\''","'\'''\''"))')"

npx wrangler d1 execute "$D1_NAME" --remote --config "$CFG" --command \
  "INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.cf_api_token', '${TOKEN_SQL}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.cf_account_id', '${ACCOUNT_ID}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.worker_name', '${NAME}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.d1_id', '${D1_ID}', ${NOW});
INSERT OR REPLACE INTO kvstore (k, v, updated) VALUES ('panel.version', '1.9.12', ${NOW});" || echo "(warn) kvstore seed skipped"

echo "OK: deployed $NAME"
