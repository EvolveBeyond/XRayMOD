# Security Policy

## Supported versions

| Version | Supported |
|:--------|:----------|
| `5.1.x` / `main` (latest) | ✅ |
| Tagged releases `v1.9.12+` | ✅ |
| `v1.x` (pre–SECURE PATH) | ⚠️ upgrade strongly recommended |
| Older untagged snapshots | ❌ |

Always run the latest release tag when possible.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Contact the maintainer privately:

- Telegram: [@MRROBOT_DT](https://t.me/MRROBOT_DT)

Please include:

1. Description of the issue
2. Impact (auth bypass, data leak, RCE, panel discovery, etc.)
3. Reproduction steps
4. Affected commit / tag / install method
5. Any suggested fix (optional)

You should receive an initial response within **72 hours**.  
Please do not publicly disclose until a fix is released or you are told disclosure is OK.

## What never belongs in this repository

| Never commit | Why |
|:-------------|:----|
| Cloudflare API tokens | Full account control |
| Production D1 `database_id` | Account linkage |
| Panel passwords / session cookies | Account takeover |
| `.env` / live `config.json` secrets | Leak risk |
| Private keys (`*.pem`, `*.key`) | Cryptographic compromise |
| Real user traffic logs | Privacy / legal risk |
| Live **SECURE PATH** / panel URLs | Enables scanners |

`wrangler.toml` in the repository is a **template** (placeholder IDs).  
The installer rewrites local config during deploy.

## How the one-line installer handles secrets

1. You paste the Cloudflare token **only in your terminal** (interactive prompt).
2. Token is sent **only** to Cloudflare APIs (`api.cloudflare.com`) and never to third parties controlled by this project.
3. Local metadata under `~/.xraymod/` should store **non-secret** deploy metadata only — not long-lived API tokens.
4. Panel password is used for bootstrap and must not be committed.

## Gen 1.9.12 security model (operators)

| Control | Behavior |
|:--------|:---------|
| **SECURE PATH** | Compulsory random UUID prefix for panel / API / sub / portal / assets |
| **Silent 404** | Unauthorized routes return plain 404 (default), not branded HTML |
| **CF email login** | Bind Cloudflare account email as admin username (Admin Dashboard) |
| **Disguise** | Enabled by default; canary paths log scanner probes |
| **CORS** | Same-origin only |
| **Health** | Unauthenticated heartbeat has no product fingerprint |
| **Kill switch** | Pause proxy egress without exposing the panel |

## Hardening recommendations for operators

- Create a **scoped** Cloudflare API token (Workers edit only), not Global API Key
- Rotate tokens if pasted into chat, screenshots, or tickets
- **Never share** the SECURE PATH / panel URL publicly
- Bind Cloudflare email + enable admin 2FA
- Restrict who can access your Cloudflare account email
- Review Worker logs / audit for canary hits / brute force
- Use monthly traffic cap + kill switch if the Worker attracts abuse
- Prefer a custom domain over long-lived `workers.dev` when possible
- Prefer least-privilege DNS / zone access

## Application security principles

- Treat all request input as untrusted
- Do not return raw internal exception messages to clients in production
- Rate-limit authentication endpoints
- Prefer constant-time comparison for secrets where applicable
- Separate admin routes from public disguise surfaces
- Log security events without logging secrets

## Supply chain

- Review Dependabot PRs
- Pin GitHub Actions by SHA when possible in CI
- Do not pipe unreviewed remote scripts into shells on production admin machines without reading them

## Safe use notice

XRayMOD is software for deploying proxy infrastructure on your own Cloudflare account.  
You are responsible for complying with laws, Cloudflare terms, and acceptable-use policies in your jurisdiction.  
Do not use this project to attack networks you do not own or lack permission to test.

## Credits

Responsible disclosures will be acknowledged in release notes if the reporter wants credit.
