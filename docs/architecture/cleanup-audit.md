# Cleanup audit

**Date:** 2026-08-16  
**Branch:** `sync/upstream-1.9.12`  
**Policy:** Identify only. **Do not delete** non-generated paths until the user replies with explicit `approve cleanup` (and a DELETE list).

See [AGENTS.md](../../AGENTS.md) Phase 2 and migration §2.5.

---

## Definitely obsolete / removed product (keep 404 guards)

| Path | Type | Reason | Referenced by | Replacement | Risk if deleted |
|------|------|--------|---------------|-------------|-----------------|
| Former `telegram-bot/` | DEAD_CODE | Product removed | None (dir gone) | Hard 404 in `worker/index.ts` / router / static | N/A — already gone |
| Former `frontend/app/twa/**` | DEAD_CODE | Product removed | 404 guards only | Panel routes | N/A — already gone |
| Commerce / bot API routes | DEAD_CODE | Product removed | 404 for `/api/commerce` | None | Keep guards |

---

## Generated artifacts (safe to regenerate / ignore in git)

| Path | Type | Reason | Notes |
|------|------|--------|-------|
| `frontend/.next/` | GENERATED_ARTIFACT | Next build cache | Rebuild via `npm run build:ui` |
| `frontend/out/` | GENERATED_ARTIFACT | Static export consumed by Wrangler assets | Rebuild before deploy |
| `node_modules/` | GENERATED_ARTIFACT | npm install | — |
| `.wrangler/` | GENERATED_ARTIFACT | Local CF state | Do not commit |
| `installer/__pycache__/` | GENERATED_ARTIFACT | Python bytecode | — |
| `.rolling/` | GENERATED_ARTIFACT / EXPERIMENTAL | Rolling bundle scratch | Confirm before any delete |

---

## Competing / legacy runtimes (keep for migration)

| Path | Type | Reason | Referenced by | Replacement | Deletion risk |
|------|------|--------|---------------|-------------|----------------|
| `backend/` | LEGACY_BUT_POTENTIALLY_USEFUL | Alternate Python control API | Docs / historical | Worker APIs | **High** — may still be used by operators |
| `src/` (+ `src/LEGACY.md`) | DUPLICATE / LEGACY | Old Vite React app | Root tsconfig historically | `frontend/` | Medium — exclude from lint already |
| `components/`, `lib/` (repo root) | DUPLICATE / UNKNOWN | Appear leftover from Vite panel | Possibly `src/` | `frontend/components` | Medium — reference-check before delete |
| `wizard/` | LEGACY_BUT_POTENTIALLY_USEFUL | Wizard Worker script package | Install/docs | Evolve into Phase 5 orchestrator | **High** — intended primary path |
| `installer/` | OBSOLETE_INSTALLER (as *primary*) | Python CLI deploy still works | `install.sh`, README | Wizard | **High** without migration |
| `install.sh`, `install.ps1`, `install.cmd` | OBSOLETE_INSTALLER (as *primary*) | Shell onboarding | README / users | Wizard | **High** |
| `build-worker.sh`, `test-offline.sh` | UNKNOWN | Helper scripts | CI/local? | Document or fold into npm scripts | Medium |

---

## Data-plane on Worker (architectural debt — do not delete yet)

| Path | Type | Reason | Notes |
|------|------|--------|-------|
| `worker/proxy/**` | LEGACY_BUT_POTENTIALLY_USEFUL | In-Worker VLESS/Trojan/SS | Target: Node Agent data plane; needs migration plan |
| `worker/processors/**` | LEGACY_BUT_POTENTIALLY_USEFUL | Excluded from `tsc` include | Same |
| `worker/api/backends.ts` + `installer/backend-install.sh` | LEGACY_BUT_POTENTIALLY_USEFUL | Proto–Node Agent | Evolve, don’t rip |

---

## Docs / marketing drift

| Path | Type | Reason | Action |
|------|------|--------|--------|
| `ROADMAP.md` Phase 4 Telegram line | UNUSED_DOCUMENTATION (partial) | Struck through but roadmap still “panel” oriented | Update in Phase 7 |
| Stealth / “clean IP” copy in UI | UNKNOWN | Conflicts with honesty rules | Reword in Phase 6 — not a file delete |

---

## Keep (canonical production)

- `worker/**` (except eventual proxy retirement after agent parity)
- `frontend/app/**`, `frontend/components/**`, `frontend/lib/**`
- `worker/lib/version.ts`, schema, auth, subscription, lab, remote API
- `.github/workflows/**`, `SECURITY.md`, wrangler config templates
- `scripts/deploy-panel.sh`, `scripts/smoke-test.mjs`

---

## Proposed DELETE list (NOT approved)

```text
DELETE
(none — awaiting user `approve cleanup`)

DEPRECATE_ONLY
- install.sh / install.ps1 / install.cmd as primary onboarding (docs + wizard messaging)
- backend/ as production control plane
- src/ Vite app as production UI

REGENERATE_OK
- frontend/.next
- frontend/out (after build:ui)
```

---

## Reference-check notes (Phase 2)

Before any future deletion of `backend/`, `src/`, or root `components/`/`lib/`:

1. `rg` for imports and README links.
2. Confirm no release scripts package those trees.
3. Add deprecation notices for one release if still referenced.

---

## Gate

**Status:** Audit complete. Waiting for explicit user approval language:

`approve cleanup`

with an agreed DELETE subset before removing any non-generated file.
