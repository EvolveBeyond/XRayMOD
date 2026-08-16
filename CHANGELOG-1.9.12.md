# XRayMOD 1.9.12 — operator notes

Canonical release notes live in **[CHANGELOG.md](./CHANGELOG.md)** under `[1.9.12]`.

This file is a short operator checklist for the Gen 1.9.12 anti-ban / SECURE PATH upgrade.

## Why panels were found / banned

| Risk | Old | 1.9.12 |
|------|-----|-------|
| Scanners | Public `/api`, `/sub`, `/_next` | Compulsory **SECURE PATH** |
| Fingerprints | Branded health JSON | Silent `{ ok: true }` / 404 |
| Root probing | Branded HTML | Default **silent 404** |
| Login | Guessable `admin` | Optional **CF email** bind |
| Abuse | Always-on proxy | Kill switch + monthly cap |

## Entry URLs

```
https://YOUR.workers.dev/{SECURE_PATH}/panel
https://YOUR.workers.dev/{SECURE_PATH}/login
https://YOUR.workers.dev/{SECURE_PATH}/sub/{USER_UUID}
https://YOUR.workers.dev/{SECURE_PATH}/me/{USER_UUID}
```

## Upgrade

1. `git pull` + installer or `npm run deploy`
2. Re-share subscription links
3. Admin → bind Cloudflare email
4. Clients: v2rayNG ≥ 2.2.3 (Hev TUN), sing-box ≥ 1.12.0
