# Changelog

All notable changes to XRayMOD are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Client-path Clean IP scan with ranked recommendations from the visitor network
- Dual-author credit: Askar Niroomand & Pakrohk

### Removed
- Telegram Mini App (`/twa/*`), commerce/store, Telegram bot integration, and `telegram-bot/`

### Changed
- Panel UI branding normalized to XRayMOD (removed internal theme codenames from user-facing chrome)
- README EN/FA: clearer install path and Cloudflare API token guide
- Panel Persian copy cleaned up (no casual assistant tone)

### Fixed
- Nested `/panel/*` routes loading `/_next` assets
- SECURE PATH login / CSS edge cases under disguise mode

### Planned
- Expanded automated tests (miniflare)
- Public OpenAPI/schema for worker admin API
- WARP / chain-proxy polish

---

## [1.9.12] - 2026-08-01

### Added
- **Compulsory SECURE PATH** — panel, API, subscription, user portal, and static assets only under `/{SECURE_PATH}/…`
- **Silent 404 fallback** (default) — no product brand on unauthorized routes
- **Admin Dashboard** (`/panel/admin`): update check, password reset, CF-email bind, custom domains, remote settings sync, kill switch
- **Custom domains (D tag)** — merged into subscriptions from Admin / Common settings
- **Remote settings sync** — pull settings from another XRayMOD panel (UUID / path / domains / secrets excluded)
- Cloudflare **email login binding** (`panel.cf_email` + enforce)
- Schema migration **v4** — enables disguise + 404 defaults on existing panels

### Changed
- Public `/api/*`, `/sub/*`, `/me/*`, `/_next/*` without SECURE PATH → **404**
- `/api/health` without admin session → `{ ok: true }` only (no brand / traffic)
- CORS locked to same-origin (removed `Access-Control-Allow-Origin: *`)
- Disguise **ON by default**; fallback skin `404`
- Subscription / portal URLs include SECURE PATH
- Package / panel version bumped to **1.9.12**

### Security
- Removes public fingerprint surfaces that led to panel discovery
- Login username can be forced to Cloudflare account email
- Kill switch remains available to pause proxy egress under abuse pressure

### Upgrade notes
1. `git pull` + re-run installer or `npm run deploy` (D1 preserved)
2. **Re-share all subscription links** (new path shape)
3. Bind Cloudflare email in Admin Dashboard
4. Clients: v2rayNG ≥ 2.2.3 (Hev TUN), sing-box ≥ 1.12.0

See also [CHANGELOG-1.9.12.md](CHANGELOG-1.9.12.md) for the operator-focused breakdown.

---

## [1.9.0] - 2026-07-30

### Added
- Next.js static asset export optimization for faster worker loading.
- Pre-compiled routing optimizations to minimize latency inside worker execution flow.

### Fixed
- Fixed static UI assets loading path issue when accessing panel under secure path in some custom domains.

---

## [1.8.0] - 2026-07-28

### Added
- Multilingual localization support foundations for dashboard.
- Dark theme/Light theme automatic switcher based on user agent settings.

### Changed
- Refactored database schema structures to support modular upgrade procedures (Schema migration v3).

---

## [1.7.0] - 2026-07-26

### Added
- Multi-node load balancing algorithm presets.
- Custom proxy headers manipulation options inside Settings panel.

### Fixed
- Resolved minor issue in subscription generation causing slow responses under high concurrently requested volumes.

---

## [1.6.0] - 2026-07-24

### Added
- Personal Server Mode (VPS mode) beta using FastAPI Backend.
- Unified installer with option to select CF Workers Mode vs Personal Server Mode.

### Changed
- Moved legacy install scripts under `scripts/legacy` directory to clean up repository root.

---

## [1.5.0] - 2026-07-22

### Added
- **Kill Switch & Monthly Cap** configurations inside panel database.
- **Login Rate Limiting** to block brute force attacks (5 attempts/min).
- **Mixed Protocol Mode** cycling support across `vless`, `trojan`, `ss`.
- **Per-Node Host Randomization** on subscription endpoint to prevent fingerprinting.

---

## [1.4.0] - 2026-07-21

### Added
- Offline mode test suite using Miniflare and local SQLite db.
- Schema migration v2 introducing robust settings key-value table.

### Changed
- Upgraded Next.js to v15 inside `frontend/` workspace directory.

---

## [1.3.0] - 2026-07-20

### Added
- Automatic backup download for user data from the panel sidebar.
- Admin activity logs (audit trails) viewer inside the settings.

---

## [1.2.0] - 2026-07-19

### Added
- Custom routing/disguise path configurations using wildcards.
- User status web portal styling customizations.

---

## [1.1.0] - 2026-07-18

### Added
- Support for sing-box client output in subscriptions (`?format=singbox`).
- Clash / Mihomo YAML output generator inside the subscription router.

---

## [1.0.0] - 2026-07-16

### Added
- Cloudflare Workers + D1 panel runtime
- VLESS / Trojan / VMess protocol support paths
- Admin panel UI (Next.js)
- User status portal
- Smart top-10 subscription generation
- Stealth skins / disguise modes
- Canary trap paths for scanners
- Backup & audit foundations
- ISP-aware clean IP helpers (where available)
- Kill switch and monthly traffic cap concepts
- 2FA + rate limiting for admin login
- One-command installers:
  - `install.sh` (Linux / macOS / WSL)
  - `install.ps1` / `install.cmd` (Windows)
- Bilingual README (English + Persian)
- MIT license
- SECURITY.md baseline

### Security
- Installer keeps Cloudflare API tokens out of the git repository
- Template `wrangler.toml` uses placeholder bindings only

### Notes
- First public open-source release cut for GitHub packaging maturity.

---

## Versioning policy

| Change type | Version bump | Examples |
|:------------|:-------------|:---------|
| Breaking API / config | MAJOR | Rename env vars, remove endpoints, compulsory SECURE PATH |
| New features | MINOR | New sub format, new disguise skin, Admin Dashboard |
| Fixes / docs / chores | PATCH | Installer cache fix, typo |

[Unreleased]: https://github.com/askarniroomand/XRayMOD/compare/v1.9.12...HEAD
[1.9.12]: https://github.com/askarniroomand/XRayMOD/releases/tag/v1.9.12
[1.0.0]: https://github.com/askarniroomand/XRayMOD/releases/tag/v1.0.0
