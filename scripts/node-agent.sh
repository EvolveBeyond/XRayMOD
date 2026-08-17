#!/usr/bin/env bash
# XRayMOD Node Agent — control-plane heartbeat + config pull.
# Data plane (Xray/sing-box) stays on this host; the Worker does not terminate VPN sessions.
#
# Usage:
#   bash scripts/node-agent.sh <panel-origin> <agent-token>
# Example:
#   bash scripts/node-agent.sh https://your-panel.workers.dev xrm_node_...
#
# Enroll the agent in the panel (Nodes → Enroll) and copy the one-time token.
chmod +x scripts/node-agent.sh

PANEL="${1:-}"
TOKEN="${2:-}"
INTERVAL="${NODE_AGENT_INTERVAL:-60}"

if [[ -z "$PANEL" || -z "$TOKEN" ]]; then
  echo "Usage: $0 <panel-origin> <agent-token>" >&2
  echo "  panel-origin  e.g. https://xraymod.example.workers.dev" >&2
  echo "  agent-token   xrm_node_… from panel enroll (shown once)" >&2
  exit 1
fi

PANEL="${PANEL%/}"
AUTH="Authorization: Bearer ${TOKEN}"
HOST="$(hostname -s 2>/dev/null || hostname || echo node)"

echo "XRayMOD Node Agent → ${PANEL}"
echo "Heartbeat every ${INTERVAL}s. Ctrl+C to stop."
echo "VPN/proxy runtime is NOT started by this script — run Xray/sing-box separately."
echo ""

while true; do
  hb="$(curl -sS -X POST "${PANEL}/api/agents/heartbeat" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"hostname\":\"${HOST}\",\"protocol_version\":1,\"capabilities\":[\"heartbeat\",\"config_pull\"]}" \
    || true)"
  cfg="$(curl -sS "${PANEL}/api/agents/config" -H "$AUTH" || true)"
  ts="$(date -u +%H:%M:%S)"
  echo "[${ts}] heartbeat: ${hb:0:180}"
  echo "[${ts}] config:    ${cfg:0:180}"
  sleep "$INTERVAL"
done
