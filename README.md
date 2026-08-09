<p align="center">
  <img src="docs/assets/banner.svg" alt="XRayMOD — stealth proxy panel on Cloudflare Workers" width="100%"/>
</p>

<p align="center">
  <strong>Open-source · Serverless · Stealth-aware</strong><br/>
  Modern <b>VLESS / Trojan / VMess</b> control plane on <b>Cloudflare Workers + D1</b><br/>
  <sub>Admin dashboard · User status portal · Smart subscription · Disguise skins · One-line install</sub>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/releases"><img src="https://img.shields.io/github/v/release/askarniroomand/XRayMOD?style=for-the-badge&color=38bdf8" alt="Release"/></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="CF"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TS"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/actions"><img src="https://img.shields.io/github/actions/workflow/status/askarniroomand/XRayMOD/ci.yml?style=for-the-badge&label=CI" alt="CI"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/stargazers"><img src="https://img.shields.io/github/stars/askarniroomand/XRayMOD?style=for-the-badge&color=eab308" alt="Stars"/></a>
  <a href="https://t.me/MRROBOT_DT"><img src="https://img.shields.io/badge/Telegram-@MRROBOT__DT-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="TG"/></a>
</p>

<p align="center">
  <a href="#-english"><b>English</b></a> ·
  <a href="README.fa.md"><b>فارسی</b></a> ·
  <a href="#-quick-start-5-minutes"><b>Quick start</b></a> ·
  <a href="#-create-a-cloudflare-api-token"><b>API token</b></a> ·
  <a href="#-features"><b>Features</b></a> ·
  <a href="SECURITY.md"><b>Security</b></a> ·
  <a href="CONTRIBUTING.md"><b>Contributing</b></a>
</p>

---

<a id="-english"></a>

# XRayMOD

**XRayMOD** is an open-source, serverless control plane for managing proxy users and subscription links on **Cloudflare Workers** with **D1** storage.

You get a practical admin UI, a user-facing status page, smart subscription bundles, and optional disguise surfaces — without renting a VPS for the panel itself.

> **Operator responsibility:** Comply with Cloudflare’s terms, local laws, and acceptable-use rules. This is infrastructure software — not permission to attack networks you do not control.

---

## Why operators use it

| Pain | What XRayMOD does |
|:-----|:------------------|
| VPS cost & babysitting for a small panel | Runs on Cloudflare Workers + D1 (edge, pay-as-you-go) |
| Panel scanners & path guessing | Compulsory **SECURE PATH** (random UUID); bare `/panel` → silent **404** |
| End users asking “how much traffic left?” | Public `/{SECURE}/me/<uuid>` portal with QR & copy |
| Weak subscription UX | Top-10 smart bundle: direct + clean IPs + CF ports + fingerprints |
| Hostile / filtered networks | Disguise skins + canary traps |

---

## Features

| | Feature | Detail |
|:--:|:--------|:-------|
| 🥷 | **Compulsory SECURE PATH** | Panel / API / sub / portal only under a random UUID |
| 🛡 | **Admin dashboard** | Users · update check · CF-email login · custom domains · kill switch |
| 🧪 | **Advanced Lab UI** | Speed ops · smart sub · whitelabel · stealth · ops in one screen |
| 🌙 | **Nightly Auto Clean-IP** | Cron refreshes Top-N country IPs per ISP (MTN/MCI/…) |
| ❤️ | **Edge health-check** | Dead clean IPs probed and removed from the subscription |
| 🎮 | **Speed profiles** | Gaming / YouTube / Stable — ports, fingerprints, country pools |
| 🎟 | **Guest sub (24h) + QR** | Temporary share links that expire automatically |
| 🇮🇷 | **Split routing** | Iran → DIRECT for Clash Meta / sing-box |
| 🔁 | **Failover tags** | `[P1]` Direct → `[P2]` 🇩🇪 Germany … for client priority |
| 🎨 | **Whitelabel** | Brand name, colors, domain, sub banner for resellers |
| 🕳 | **Pro canary** | Scanner hits with ASN/IP · one-click block list |
| 🧩 | **Fragment / Reality presets** | One-click anti-filter client hints |
| 💾 | **Backup / Restore + rollback** | Single JSON backup · Worker version rollback |
| 🕸 | **Weighted domains + multi-node** | Rotate custom domains · register multiple Workers |
| 📡 | **Flagged clean IPs** | Country emoji on each subscription config name |
| 🔐 | **Admin hardening** | CF email login · 2FA · rate limiting · SECURE PATH |
| ⚡ | **One-line install** | Windows PowerShell/CMD · Linux · macOS · WSL |
| 📱 | **Client-ready** | v2rayNG ≥2.2.3 · sing-box ≥1.12 · Hiddify · Streisand · Clash |

---

## Tech stack

| Layer | Technology |
|:------|:-----------|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Language | TypeScript |
| Admin UI | Next.js (static export into Worker assets) |
| Installers | Bash · PowerShell |
| Tooling | Wrangler · npm |

```text
Internet → Cloudflare Edge (Worker)
              ├─ SECURE PATH gate (silent 404)
              ├─ Disguise / static responses
              ├─ Admin API + Admin Dashboard
              ├─ Subscription endpoints
              ├─ /{SECURE}/me user portal
              └─ D1 (users, settings, audit)
```

---

## Requirements

### Your machine
- Windows 10+, macOS 12+, or modern Linux
- Internet access to `api.cloudflare.com` and GitHub
- Ability to run **PowerShell** or **Bash**

### Cloudflare
- A Cloudflare account (Free plan is enough for many personal setups)
- Permission to create **Workers** and **D1** databases
- An **API token** with Workers edit rights (see next section)

### Optional (manual / contributor workflow)
- Node.js **20+**
- npm **10+**
- Wrangler **3+**

---

## Create a Cloudflare API token

The installer never uploads your token to this GitHub repo. It stays on your machine and is used only against Cloudflare APIs. Prefer a **scoped token**, not Global API Key.

### Step-by-step

1. Sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Open **My Profile** (top-right avatar) → **API Tokens**.  
   Direct link: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
3. Click **Create Token**.
4. Under **API token templates**, choose **Edit Cloudflare Workers** → **Use template**.  
   This is the recommended starter for XRayMOD.
5. Review (and tighten if you want):
   - **Account resources** → include only the account you will deploy to  
   - **Zone resources** → only if you will attach custom domains (otherwise you can leave as the template suggests)
6. Click **Continue to summary** → **Create Token**.
7. **Copy the token once** and store it in a password manager. Cloudflare will not show it again.
8. Paste it into the XRayMOD installer when prompted.

### What the token is used for

| Action | Why |
|:-------|:----|
| Create / update Worker | Host the panel + proxy edge |
| Create / bind D1 | Persist users & settings |
| Optional custom domain | Route your domain to the Worker |

### Safety checklist

- [ ] Do **not** paste the token into Issues, PRs, Discord, or Telegram groups  
- [ ] Do **not** commit it to git or put it in screenshots  
- [ ] Rotate the token if it ever leaks  
- [ ] Prefer revoking old tokens after you finish a one-off machine install  

> If Cloudflare shows account/payment errors, fix billing / account status first — `wrangler whoami` (or the installer) will fail until the account is healthy.

---

## Quick start (≈5 minutes)

### 1) Run the installer

**Windows PowerShell** (prompt starts with `PS`):

```powershell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
```

**Windows CMD**:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing 'https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1').Content"
```

**Linux / macOS / WSL**:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)
```

### 2) Answer three prompts

| Step | You enter | Notes |
|:----:|:----------|:------|
| 1 | Cloudflare API token | From the section above |
| 2 | Admin username | Prefer binding CF email later in the panel |
| 3 | Admin password | Use a long, unique password |

Everything else (Node tooling, clone, D1, UI build, Worker deploy, bootstrap) is automated. **Git is not required** on your machine for the one-line path.

### 3) Save the URLs the installer prints

| URL pattern | Purpose |
|:------------|:--------|
| `/{SECURE_PATH}/login` | Admin login — keep private |
| `/{SECURE_PATH}/panel` | Admin dashboard |
| `/{SECURE_PATH}/sub/<USER_UUID>` | Subscription (Base64 by default) |
| `/{SECURE_PATH}/me/<USER_UUID>` | User traffic / days / QR |
| `…/sub/<USER_UUID>?format=clash` | Clash / Mihomo YAML |
| `…/sub/<USER_UUID>?format=singbox` | sing-box JSON |

> **Gen 5.1.1+:** Bare `/panel`, `/api/*`, `/sub/*` **without** the SECURE PATH return **404**. Always share links that include the UUID path. See [CHANGELOG-5.1.1.md](CHANGELOG-5.1.1.md).

---

## After install — first 10 minutes

1. Open `/{SECURE_PATH}/login` and sign in with the credentials you set.
2. Create a test user (traffic + expiry).
3. Copy the **subscription** link into Hiddify / v2rayNG / Clash / sing-box.
4. Open `/{SECURE_PATH}/me/<uuid>` in a browser to verify the status portal.
5. In Admin settings, pick a **disguise skin** and (recommended) bind **Cloudflare email** as login.
6. Store `SECURE_PATH`, Worker hostname, and admin password in your password manager.

---

## Manual install (developers)

<details>
<summary><b>Clone → D1 → build → deploy</b></summary>

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
npm install --prefix frontend
npm run build:ui
npx wrangler login
npx wrangler d1 create xraymod-db
# paste database_id into wrangler.toml
npx wrangler deploy
```

Bootstrap admin (first time):

```bash
curl -X POST "https://YOUR_WORKER.workers.dev/install" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourStrongPass123"}'
```

Then open:

```text
https://YOUR_WORKER.workers.dev/<SECURE_PATH>/login
https://YOUR_WORKER.workers.dev/<SECURE_PATH>/panel
```

More detail: [DEPLOY.md](./DEPLOY.md).

</details>

---

## Architecture

### High-level

```text
                    ┌──────────────────────────┐
   Clients          │   Cloudflare Network     │
   (v2rayNG, etc.)  │                          │
         │          │  Worker (router.ts)      │
         │          │    ├ processors/         │
         └─────────►│    ├ proxy/              │
                    │    ├ api/                │
   Admin browser ──►│    └ user-portal         │
                    │            │             │
                    │            ▼             │
                    │         D1 SQLite        │
                    └──────────────────────────┘
```

### Canonical source of truth

| Path | Role |
|:-----|:-----|
| `worker/` | **Production runtime** — routing, auth, sub, portal |
| `frontend/` | Admin panel UI |
| `installer/` + `install.*` | Bootstrap onto a Cloudflare account |
| `docs/` | Human documentation and assets |
| `backend/` | Legacy / optional Python experiments — **not** required for Workers deploy |

### Request flow (simplified)

1. Request hits Worker `fetch` (`worker/index.ts`)
2. Router classifies: install · static · API · subscription · proxy · portal
3. Auth middleware gates admin APIs
4. D1 reads/writes users and settings
5. Response is panel JSON/HTML, subscription payload, or a disguise page

---

## Project structure

```text
XRayMOD/
├── worker/                 # Cloudflare Worker (runtime source of truth)
│   ├── api/                # Admin/API route handlers
│   ├── processors/         # Request processors
│   ├── proxy/              # Protocol helpers
│   ├── lib/                # Shared worker utilities
│   ├── index.ts            # Worker entry
│   └── router.ts           # Routing
├── frontend/               # Next.js admin UI
├── installer/              # Installer support code
├── docs/                   # Documentation & assets
├── scripts/                # Smoke / e2e helpers
├── install.sh              # Unix installer
├── install.ps1             # Windows installer
├── wrangler.toml           # Template bindings
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
└── LICENSE
```

---

## Configuration

| Variable / setting | Where | Notes |
|:-------------------|:------|:------|
| API token | Installer prompt only | Never commit |
| D1 `database_id` | Local wrangler config after install | Template uses placeholders in git |
| Access UUID / SECURE PATH | Generated at deploy | Treat as a secret path |
| Admin credentials | Bootstrap install | Rotate if leaked |
| Disguise mode | Panel settings | Skin for unknown routes |
| Protocol options | Panel / API | VLESS · Trojan · VMess related settings |

See `.env.example` and [SECURITY.md](./SECURITY.md).

---

## API overview

Admin APIs are path-scoped behind the panel access UUID.

| Area | Methods | Notes |
|:-----|:--------|:------|
| Auth login/logout | POST | Rate-limited |
| Users CRUD | GET/POST/PATCH/DELETE | Admin session required |
| Settings | GET/PUT | Admin session required |
| Nodes / backends | GET/POST | Admin session required |
| Subscription | GET | User UUID; `format` query param |
| Health | GET | Liveness |

> Full OpenAPI export is on the roadmap. Until then, inspect `worker/api/*` and panel network calls.

---

## Roadmap

- [x] Workers + D1 panel core
- [x] `/me` status portal
- [x] Smart subscription bundle
- [x] One-line cross-platform install
- [ ] Public OpenAPI document
- [ ] Miniflare unit/integration tests in CI
- [ ] Signed release artifacts
- [ ] Multi-language panel UI packs
- [ ] Hardened error responses (no internal leakage)

See [ROADMAP.md](./ROADMAP.md) and [CHANGELOG.md](./CHANGELOG.md).

---

## Known issues

| Issue | Severity | Workaround |
|:------|:---------|:-----------|
| GitHub raw CDN can cache install scripts briefly | Medium | Re-run after a minute |
| Dual historical trees (`backend/` vs Worker) may confuse new contributors | Medium | Treat `worker/` as canonical |
| Limited automated tests in early public tags | Medium | Use smoke / e2e scripts; contribute tests |
| Some 500 paths may be too verbose | Low–Med | Prefer generic client errors |

Issues: https://github.com/askarniroomand/XRayMOD/issues

---

## FAQ

<details>
<summary><b>Is a VPS required?</b></summary>

No for the control plane. The panel runs on Cloudflare Workers + D1. Proxy backends/nodes are a separate concern depending on how you route user traffic.
</details>

<details>
<summary><b>Does the free Cloudflare plan work?</b></summary>

Yes for many personal setups. Watch Workers request limits and D1 quotas as you scale.
</details>

<details>
<summary><b>Where is my API token stored?</b></summary>

Only on your machine during install, sent only to Cloudflare APIs. Never commit it. See [SECURITY.md](./SECURITY.md).
</details>

<details>
<summary><b>Why do I get 404 on /panel?</b></summary>

Gen 5.1.1 requires the SECURE PATH UUID prefix. Use the full URL printed by the installer.
</details>

<details>
<summary><b>Can I use Hiddify / v2rayNG?</b></summary>

Yes. Import the subscription URL. Clash and sing-box formats are available via query parameters.
</details>

<details>
<summary><b>How do I report a security issue?</b></summary>

Privately via Telegram [@MRROBOT_DT](https://t.me/MRROBOT_DT) — do not open a public issue with secrets.
</details>

<details>
<summary><b>Is this legal?</b></summary>

Laws vary. You are solely responsible for lawful use and compliance with Cloudflare’s terms.
</details>

---

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
# open a feature branch, make changes, PR against main
```

Small docs PRs and tests are excellent first contributions.

---

## Changelog & versioning

- [CHANGELOG.md](./CHANGELOG.md)
- Semantic versioning: `MAJOR.MINOR.PATCH`
- GitHub Releases via tag `vX.Y.Z`

---

## License

MIT © Askar Niroomand & Pakrohk — see [LICENSE](./LICENSE).

---

## Authors

| | GitHub |
|:--|:-------|
| Askar Niroomand | [@askarniroomand](https://github.com/askarniroomand) |
| Pakrohk | [@Pakrohk](https://github.com/Pakrohk) |

---

## Contact

| Channel | Link |
|:--------|:-----|
| Authors | [@askarniroomand](https://github.com/askarniroomand) · [@Pakrohk](https://github.com/Pakrohk) |
| Telegram | [t.me/MRROBOT_DT](https://t.me/MRROBOT_DT) |
| Security | [SECURITY.md](./SECURITY.md) |
| Persian docs | [README.fa.md](./README.fa.md) |

---

<p align="center">
  <sub>XRayMOD · Cloudflare Workers + D1</sub>
</p>
