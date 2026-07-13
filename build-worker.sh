#!/bin/bash
# XRayMOD Worker Build + Obfuscation
# browser-no-eval target avoids Cloudflare Error 1101

set -e

echo "Building worker..."
npx wrangler deploy --dry-run --outdir=/tmp/xraymod-build 2>&1 | tail -3

# Verify no node: imports
if grep -q "node:stream\|node:events\|node:crypto" /tmp/xraymod-build/index.js; then
  echo "ERROR: node: imports found! Check dependencies."
  exit 1
fi

echo "Obfuscating..."
npx javascript-obfuscator /tmp/xraymod-build/index.js \
  --output worker.js \
  --target browser-no-eval \
  --compact true \
  --control-flow-flattening false \
  --dead-code-injection false \
  --string-array true \
  --string-array-encoding 'rc4' \
  --string-array-threshold 1 \
  --string-array-rotate true \
  --string-array-shuffle true \
  --string-array-wrappers-count 2 \
  --string-array-wrappers-type 'function' \
  --string-array-index-shift true \
  --transform-object-keys true

rm -rf /tmp/xraymod-build

# Final verification
node -e "
const fs = require('fs');
const code = fs.readFileSync('worker.js', 'utf8');
const checks = {
  'eval()': code.includes('eval('),
  'node:stream': code.includes('node:stream'),
  'node:events': code.includes('node:events'),
  'cloudflare:sockets': code.includes('cloudflare:sockets'),
};
const failed = Object.entries(checks).filter(([k, v]) => v);
if (failed.length) {
  console.error('FAILED:', failed.map(([k]) => k).join(', '));
  process.exit(1);
}
console.log('All checks passed. Size:', code.length, 'bytes');
"
