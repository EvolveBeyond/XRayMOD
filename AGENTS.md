# AGENTS.md — XRayMOD operating manual

Living checklist for agents working in this fork. Follow phases in order. Report after each phase. Do **not** delete non-generated repo files unless the user explicitly says `approve cleanup`.

## Checkout pin (update when syncing)

| Field | Value |
|-------|-------|
| Branch | `sync/upstream-1.9.12` |
| Upstream remote | `upstream` → `https://github.com/EvolveBeyond/XRayMOD.git` |
| Adopted upstream tip | `fed637e` (`main`, product **1.9.12**) |
| Merge commit | `7431daf` |
| Canonical version source | [`worker/lib/version.ts`](worker/lib/version.ts) — `XRayMOD_VERSION` / `XRayMOD_SCHEMA_VERSION` / `XRayMOD_BUILD` |
| Product version | **1.9.12** (not 5.1.1) |

## Product intent

Migrate from a “VPN/proxy panel” mindset to a **Secure VPN Infrastructure Control Plane**:

- **Control plane**: Cloudflare Worker + D1 + panel UI (APIs, policy, subscriptions, onboarding).
- **Data plane**: user nodes / Xray / sing-box / gateways — **not** VPN traffic execution inside Workers.
- Cloudflare is an **Edge Provider** (security/control/edge endpoints), not the VPN runtime.
- Wizard is the **canonical** install/orchestrator; shell installers are deprecated primary path (mark, don’t delete without approval).
- Mini App / Telegram commerce / TWA stay **removed** (hard 404). Do not reintroduce from upstream merges.

## Non-negotiable rules

1. Read real execution paths before refactoring (`worker/` → router → API → D1).
2. Preserve local Lab / edge-ops / TWA-removal / login recovery unless explicitly superseded.
3. Prefer upstream dependency/security bumps when they don’t break Worker/UI builds.
4. No mass deletion of `installer/`, `backend/`, install scripts without cleanup audit + `approve cleanup`.
5. No claiming Cloudflare IPs are “clean”/residential or guaranteed to evade classification.
6. After every phase: build, test, inspect diff, update docs, report status.

## Report cadence

After each phase, report:

1. What changed (paths)
2. `npm run lint` / `npm run build:ui` / `npm test` result
3. Blockers / decisions needed
4. Next phase id

---

## Phased checklist

### Phase 0 — Upstream sync + version truth — DONE

- [x] Branch `sync/upstream-1.9.12` from fork tip
- [x] Merge `upstream/main` @ `fed637e`
- [x] Keep Lab + TWA removal; take upstream deps + remote API
- [x] Canonical version in `worker/lib/version.ts`
- [x] Lint + UI build + smoke tests green

### Phase 1 — Post-sync stabilize + architectural audit — DONE

- [x] Document current architecture → [`docs/architecture/current-state.md`](docs/architecture/current-state.md)
- [x] Confirm version identity 1.9.12 everywhere meaningful (`deploy-panel.sh` fixed)
- [x] Note merge overlays and known dual-stack (Worker vs `backend/` / `src/`)

### Phase 2 — Cleanup audit only (no deletes) — DONE (awaiting approval)

- [x] Inventory candidates → [`docs/architecture/cleanup-audit.md`](docs/architecture/cleanup-audit.md)
- [x] Classify candidates (no permanent deletes performed)
- [ ] **Stop** for user `approve cleanup` before any permanent deletes

### Phase 3 — Domain renames + Edge Provider abstraction — STARTED

- [x] Introduce Edge Provider interface; Cloudflare as first implementation (`worker/lib/edge-provider/`)
- [x] Wire self-update CF HTTP through `CloudflareEdgeProvider.request`
- [x] Expose `edge_provider` capability summary on admin dashboard API
- [ ] Broader domain renames (node/backend/cleanip/disguise) with compatibility shims
- [ ] Wizard plan-aware UI consuming capability reports

### Phase 4 — Node Agent model + control/data-plane boundary — NOT STARTED

- [ ] Define Node Agent contract (heartbeat, config pull, health)
- [ ] Keep proxy/data-plane off Worker; migrate “backend” concepts toward agents
- [ ] Secure control-plane auth between panel and nodes

### Phase 5 — Wizard as canonical orchestrator — NOT STARTED

- [ ] Stateful wizard steps; OAuth-preferred CF auth
- [ ] Versioned/verified deploy artifacts (not mutable branch tips)
- [ ] Deprecate shell installers as primary path (docs + UI), do not delete yet

### Phase 6 — Subscription / policy / security / dashboard — NOT STARTED

- [ ] Subscription redesign aligned to nodes + policies
- [ ] Security policy engine + security dashboard surfaces
- [ ] Replace “Clean IP” / disguise with honest edge/origin-protection semantics

### Phase 7 — Docs / CI / tests; obsolete installers marked — NOT STARTED

- [ ] Docs match architecture; CI covers Worker + UI
- [ ] Mark obsolete installers/backends; deletions only after `approve cleanup`
- [ ] Final verification against definition-of-done in migration spec

---

## What not to delete (without approval)

- `installer/`, `install.sh`, `install.ps1`, `install.cmd`, `backend/`, `wizard/` source
- Database schema/migrations, CI workflows, security files, wrangler deploy config
- Compatibility layers still referenced by production Worker
- Anything classified `UNKNOWN` in the cleanup audit

## Generated artifacts (may remove when rebuilding)

- `frontend/.next/`, `frontend/out/` (rebuild via `npm run build:ui`)
- `node_modules/`, `.wrangler/` local state, `__pycache__/`

## Default merge policy (future upstream pulls)

| Area | Policy |
|------|--------|
| Version strings | Upstream 1.x lineage via `worker/lib/version.ts` |
| Telegram / TWA / store | Keep **our removal** |
| Lab / edge-ops / login recovery | Keep **ours** |
| Dependencies | Prefer **upstream** bumps if build stays green |
| Remote API | Keep merged upstream remote key/API routes |

## Commands

```bash
npm run lint
npm run build:ui
npm test
```
