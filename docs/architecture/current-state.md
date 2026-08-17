# Current architecture state

**Date:** 2026-08-18  
**Branch:** `main`  
**Product version:** 1.9.12 (`worker/lib/version.ts`)  
**Schema soft version:** `XRayMOD_SCHEMA_VERSION = '5'`

Control plane = Cloudflare Worker + D1 + panel UI. Data plane = Node Agents (Xray / sing-box). Cloudflare is an Edge Provider, not a VPN runtime.

---

## Production runtime

| Layer | Location | Role |
|-------|----------|------|
| Worker entry | `worker/index.ts` | `fetch` + cron; hard-404 `/twa` `/bot` `/api/commerce` |
| Router | `worker/router.ts` | Schema → optional in-Worker proxy (policy-gated) → secure-path → APIs |
| Storage | D1 | Users, configs, protocols, kvstore, backends, remote_api_keys, agent records in kvstore |
| Static UI | `frontend/out` | Next.js export |
| Edge Provider | `worker/lib/edge-provider/` | Cloudflare API + capability reports |
| Node Agents | `worker/api/agents.ts` | Enroll / heartbeat / config pull / health |
| Security policy | `worker/lib/security-policy.ts` | Kill switch, in-Worker proxy disable, caps |

**In-Worker proxy** (`worker/proxy/`) remains for compatibility. Set `disable_in_worker_proxy` on the admin dashboard to return HTTP 501 for WS/gRPC/XHTTP upgrades.

---

## Domain aliases (compatibility)

| Legacy | Canonical meaning |
|--------|-------------------|
| backend | Legacy VPS row; listed beside Node Agents |
| cleanip | Edge endpoint latency probe (not “clean/residential”) |
| disguise / stealth | Origin protection for the panel UI |

---

## Onboarding

Canonical: Wizard (`/install`, `/api/wizard`) using **rolling** GitHub release assets.  
Deprecated primary: `install.sh` / `install.ps1` / `install.cmd` / `installer/` (kept until `approve cleanup`).

---

## Next

Destructive file removal still needs explicit `approve cleanup`. See [`cleanup-audit.md`](cleanup-audit.md).
