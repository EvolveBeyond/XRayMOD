#!/usr/bin/env bash
# Build UI + worker bundle and publish GitHub release tag "rolling"
# for in-panel self-update downloads (worker.mjs + assets.tar.gz).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> npm install"
npm install --no-fund --no-audit
npm install --prefix frontend --no-fund --no-audit

echo "==> build UI"
npm run build:ui

if [[ ! -d frontend/out ]]; then
  echo "ERROR: frontend/out missing after build" >&2
  exit 1
fi

echo "==> pack assets.tar.gz"
rm -rf .rolling
mkdir -p .rolling
# Portable tar of static UI (paths relative → untar as /file…)
COPYFILE_DISABLE=1 tar -czf .rolling/assets.tar.gz -C frontend/out .
echo "    assets: $(wc -c < .rolling/assets.tar.gz) bytes"

echo "==> wrangler dry-run bundle"
npx wrangler deploy --dry-run --outdir=.rolling/bundle

MODULE=""
# Prefer ESM bundles from wrangler --outdir (often index.js)
for f in \
  .rolling/bundle/worker.mjs \
  .rolling/bundle/index.mjs \
  .rolling/bundle/index.js \
  .rolling/bundle/*.mjs \
  .rolling/bundle/*.js
do
  if [[ -f "$f" && "$(basename "$f")" != "README.md" ]]; then
    MODULE="$f"
    break
  fi
done
if [[ -z "$MODULE" ]]; then
  MODULE="$(find .rolling/bundle -type f \( -name '*.mjs' -o -name 'index.js' \) ! -name '*.map' | head -1 || true)"
fi
if [[ -z "$MODULE" || ! -f "$MODULE" ]]; then
  echo "ERROR: no worker module in .rolling/bundle" >&2
  ls -laR .rolling || true
  exit 1
fi

# Always publish as worker.mjs (self-update main_module)
cp "$MODULE" .rolling/worker.mjs
echo "==> module: $MODULE → worker.mjs ($(wc -c < .rolling/worker.mjs) bytes)"

if ! command -v gh >/dev/null; then
  echo "gh CLI missing — local bundle ready in .rolling/"
  exit 0
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh not authenticated — local bundle ready in .rolling/"
  exit 0
fi

REPO="${GITHUB_REPOSITORY:-askarniroomand/XRayMOD}"
SHA="$(git rev-parse HEAD)"
PRODUCT_VER="$(node -p "require('./package.json').version" 2>/dev/null || echo unknown)"
echo "==> publish GitHub release :rolling on $REPO @ $SHA (v$PRODUCT_VER)"
gh release delete rolling --repo "$REPO" -y 2>/dev/null || true
git tag -f rolling "$SHA"
git push -f "https://github.com/${REPO}.git" "refs/tags/rolling"
gh release create rolling \
  --repo "$REPO" \
  --target "$SHA" \
  --title "XRayMOD rolling bundle ${PRODUCT_VER}" \
  --notes "XRayMOD ${PRODUCT_VER} @ ${SHA} — worker + UI assets for in-panel self-update. D1-safe redeploy." \
  --latest=false \
  .rolling/worker.mjs \
  .rolling/assets.tar.gz

echo "OK: https://github.com/${REPO}/releases/tag/rolling"
