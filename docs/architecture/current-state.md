# Current architecture state

**Date:** 2026-08-16  
**Branch:** `sync/upstream-1.9.12`  
**HEAD:** `7431daf` (merge of fork work + `upstream/main` @ `fed637e`)  
**Product version:** 1.9.12 (`worker/lib/version.ts`)  
**Schema soft version:** `XRayMOD_SCHEMA_VERSION = '4'`

This audit is Phase 1 of [AGENTS.md](../../AGENTS.md). It describes what runs today, not the target Secure Infrastructure Control Plane.

---

## Production runtime (canonical)

| Layer | Location | Role |
|-------|----------|------|
| Worker entry | `worker/index.ts` | `fetch` + cron; hard-404 for `/twa`, `/bot`, `/api/commerce` |
| Router | `worker/router.ts` | Schema ensure → disguise/secure-path → API routes → SPA/static |
| Storage | Cloudflare D1 (`Env.DB`) | Users, configs, protocols, kvstore, backends, remote_api_keys |
| Static UI | `frontend/out` via Wrangler `[assets]` | Next.js static export |
| Secrets/vars | `wrangler.toml` `[vars]` + D1 kvstore | `CRYPTO_KEY`, disguise, CF token (panel), etc. |

**Control plane:** Worker APIs under `/api/*` (session cookie auth) plus remote key API (`worker/api/remote*.ts`, `worker/remote-auth.ts`).

**Data plane today (mixed):**

- In-Worker protocol handlers under `worker/proxy/` (VLESS / Trojan / Shadowsocks / xhttp / grpc) — legacy “panel carries proxy” path.
- External “backends” via `worker/api/backends.ts` + `installer/backend-install.sh` — VPS bridge toward real node runtimes.

Target architecture (AGENTS Phase 4+) moves VPN execution fully off Worker; do not expand Worker data-plane without an explicit decision.

---

## Frontend

| Path | Notes |
|------|-------|
| `frontend/` | Next.js App Router, RTL Persian/English panel |
| Routes | `/login`, `/panel/*` (admin, users, nodes, protocols, config, cleanip, lab, network, stealth, settings, support) |
| Build | `npm run build:ui` → `frontend/out` |
| Removed | No `frontend/app/twa`; Mini App UI deleted |

Legacy Vite app under `src/` is marked legacy (`src/LEGACY.md`) and excluded from root `tsc` include.

---

## Auth & security surfaces

- Password hashing: PBKDF2 in `worker/auth.ts` (+ legacy SHA-256 migration).
- Sessions: cookie TTL in `worker/auth.ts`.
- TOTP helpers present in `worker/auth.ts`.
- Secure path / disguise: `worker/lib/secure-path.ts`, `worker/disguise.ts`, `DISGUISE_PAGE` (default `"404"`).
- Panel recovery flag: `PANEL_RECOVERY`.
- Field encryption: `worker/crypto.ts` (AES-GCM from `CRYPTO_KEY`).
- Self-update: `worker/lib/self-update.ts` (GitHub release assets → CF Workers API).

---

## Domain model (as implemented)

| Concept | Storage / API | Notes |
|---------|---------------|-------|
| Users | `users` table / `api/users` | Traffic limits, UUIDs, status |
| Nodes | UI + configs/protocols | “Nodes” UI coexists with protocol/config rows |
| Backends | `backends` table / `api/backends` | External server registration |
| Protocols | `protocols` + templates | Modular protocol JSON |
| Configs | `configs` | Generated client configs |
| Subscription | `worker/subscription.ts` | Base64 / Clash / sing-box style outputs |
| Clean IP | `api/cleanip`, `lib/cleanip-pool.ts`, cron edge-ops | ISP/scan oriented; honesty rewrite planned |
| Lab | `api/lab` | Fork-specific edge/lab tooling |
| Wizard | `api/wizard`, `wizard/` | Install/deploy orchestration (token-based today) |
| Remote API | `remote_api_keys`, `api/remote*` | Upstream-merged machine API |

---

## Deployment entrypoints (competing)

| Entrypoint | Status |
|------------|--------|
| Wizard (`wizard/`, `worker/api/wizard.ts`, `/install`) | Intended primary (AGENTS Phase 5) |
| `install.sh` / `install.ps1` / `install.cmd` | Still present; deprecate as primary |
| `installer/` (Python CLI deploy) | Still present; migration candidate |
| `scripts/deploy-panel.sh` | Operator helper for known CF account/panels |
| `backend/` (Python FastAPI-ish) | Legacy alternate runtime — not Wrangler production path |

---

## Scheduled work

`worker/lib/edge-ops.ts` via Worker cron (`runScheduledEdgeOps`): clean-IP / health style maintenance.

---

## CI / quality

- Root scripts: `npm run lint` (`tsc --noEmit` on `worker/**`), `npm run build:ui`, `npm test` (`scripts/smoke-test.mjs`).
- GitHub workflows under `.github/workflows`.
- `@types/node` pinned to `^22.14.0` after upstream `^26` broke WebCrypto `BufferSource` typings with Workers types.

---

## Local overlays kept through upstream sync

1. Lab / edge-ops / recommended sub / country flags / self-update / login `credentials_json` recovery.
2. Full Mini App / Telegram / commerce removal + hard 404.
3. Panel UI (bento/dashboard) retained with version **1.9.12**.
4. Upstream remote API + Dependabot dependency refresh taken in.

---

## Gaps vs Secure Infrastructure target

| Target | Current gap |
|--------|-------------|
| Edge Provider abstraction | Cloudflare calls are ad hoc (wizard, self-update, cleanip) |
| Node Agent | Backends ≈ install script, not agent protocol |
| Control/data-plane split | Worker still hosts proxy processors |
| Wizard orchestrator | Exists but not fully stateful/OAuth/versioned-artifact |
| Honest clean-IP / disguise | Marketing/stealth language still mixed in UI/docs |
| Single onboarding path | Shell + Python installer + wizard coexist |

---

## Next

Phase 2: [`cleanup-audit.md`](cleanup-audit.md) — classify redundancy; **no deletes** until user says `approve cleanup`.
