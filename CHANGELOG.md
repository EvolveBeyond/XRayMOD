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

## [5.1.1] - 2026-08-01

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
- Package / panel version bumped to **5.1.1**

### Security
- Removes public fingerprint surfaces that led to panel discovery
- Login username can be forced to Cloudflare account email
- Kill switch remains available to pause proxy egress under abuse pressure

### Upgrade notes
1. `git pull` + re-run installer or `npm run deploy` (D1 preserved)
2. **Re-share all subscription links** (new path shape)
3. Bind Cloudflare email in Admin Dashboard
4. Clients: v2rayNG ≥ 2.2.3 (Hev TUN), sing-box ≥ 1.12.0

See also [CHANGELOG-5.1.1.md](CHANGELOG-5.1.1.md) for the operator-focused breakdown.

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

[Unreleased]: https://github.com/askarniroomand/XRayMOD/compare/v5.1.1...HEAD
[5.1.1]: https://github.com/askarniroomand/XRayMOD/releases/tag/v5.1.1
[1.0.0]: https://github.com/askarniroomand/XRayMOD/releases/tag/v1.0.0
