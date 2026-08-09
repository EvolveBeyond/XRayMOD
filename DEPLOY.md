# XRayMOD — Deploy & Runbook (v5.1.1)

## Architecture (unified)

```
frontend/          → Next.js 15 (canonical UI) → static export → frontend/out
worker/            → Cloudflare Worker (API + proxy + SECURE PATH + disguise + ASSETS)
wrangler.toml      → D1 + ASSETS binding
```

Legacy Vite SPA lives under `src/` and is **not** used by `npm run deploy`.

## Prerequisites

- Node 20+
- Cloudflare account + API token (Edit Cloudflare Workers)
- Account must **not** be disabled (`wrangler whoami` must succeed)

## Quick deploy

```bash
# 1. Install
npm install

# 2. Create D1 (once)
npx wrangler d1 create xraymod-db
# paste database_id into wrangler.toml

# 3. Build UI + deploy Worker
npm run deploy
```

Panel URL after first install / bootstrap:

```
https://xraymod.<account>.workers.dev/<SECURE_PATH>/panel
https://xraymod.<account>.workers.dev/<SECURE_PATH>/login
```

Subscription / user portal:

```
https://xraymod.<account>.workers.dev/<SECURE_PATH>/sub/<USER_UUID>
https://xraymod.<account>.workers.dev/<SECURE_PATH>/me/<USER_UUID>
```

> Bare `/panel`, `/api/*`, `/sub/*` without SECURE PATH return **404**.

Default seed login before you bind CF email: change password immediately.  
Prefer **Admin → Cloudflare email** as login username (Gen 5.1.1).

## Local development

```bash
npm run build:ui          # Next static export
npm run dev:worker        # wrangler dev --local
# or full:
npm run dev               # build UI + local worker

npm test                  # offline smoke
npm run test:e2e          # full API e2e on local wrangler (SECURE PATH aware)
```

## Installer WebUI

```bash
uv run installer/app.py
# open http://localhost:8000
```

## Environment vars (wrangler.toml / dashboard)

Most panel secrets live in **D1** (not CF env) after Gen 5.1.1.

| Var | Purpose |
|-----|---------|
| `PAGES_URL` | Optional remote Pages origin (if not using ASSETS) |
| `PANEL_RECOVERY` | `true` disables disguise (break-glass) |
| `DISGUISE_PAGE` | Default `404` (also `1101`, `nginx`, …) |
| `CRYPTO_KEY` | Override default crypto key (set in production) |

## Admin Dashboard

Inside `/{SECURE_PATH}/panel/admin`:

- Update check (GitHub releases)
- Password reset
- Cloudflare email bind
- Custom domains (D-tagged configs)
- Remote settings sync
- Kill switch / usage snapshot

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `User has been disabled` (9109) | Fix CF account at dash.cloudflare.com |
| 404 on `/panel` or `/api/health` | Expected — use `/{SECURE_PATH}/…` |
| 1101 / decoy on panel | Wrong SECURE PATH; use install output URL |
| Empty UI | Run `npm run build:ui` before deploy |
| Login cookie missing on localhost | Expected Secure cookies only on HTTPS; local uses non-Secure |
| Old sub links broken after upgrade | Re-share links that include SECURE PATH |
