# XRayMOD

**Secure VPN Infrastructure Control Plane** on Cloudflare Workers + D1.

XRayMOD is the **control plane**: admin APIs, policy, subscriptions, onboarding, and origin protection for the panel. **Data-plane** VPN/proxy traffic runs on your **Node Agents** (Xray / sing-box / gateways)—not inside Workers. Cloudflare is an **Edge Provider** (Workers, D1, edge endpoints), not a VPN runtime.

Cloudflare anycast addresses are **not** “clean”, residential, or guaranteed to evade classification.

> **Operator responsibility:** Comply with Cloudflare’s terms, local laws, and acceptable-use rules. This software is infrastructure tooling—not authorization to access networks you do not control.

---

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="MIT"/></a>
  <a href="https://github.com/askarniroomand/XRayMOD/releases"><img src="https://img.shields.io/github/v/release/askarniroomand/XRayMOD?style=flat-square&color=38bdf8" alt="Release"/></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="CF"/></a>
  <a href=".github/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/askarniroomand/XRayMOD/ci.yml?style=flat-square&label=CI" alt="CI"/></a>
</p>

| | |
|:--|:--|
| **Product version** | **1.9.12** ([`worker/lib/version.ts`](worker/lib/version.ts)) |
| **Canonical UI** | Next.js static export → Worker assets |
| **Canonical install** | In-panel Wizard + rolling release bundle |
| **Shell installers** | Deprecated compatibility path (kept, not deleted) |

---

## Architecture

```text
Clients / Admin browser
        │
        ▼
 Cloudflare Edge (Worker)
        │
        ├── SECURE PATH gate  → silent 404 without UUID
        ├── Admin API + Dashboard
        ├── Subscription + /me portal
        ├── Wizard / self-update
        └── D1 (users, policy, kvstore)
                │
                └── Node Agents (heartbeat, config pull) → Xray / sing-box
```

| Plane | Where | Role |
|:------|:------|:-----|
| Control | `worker/` + `frontend/` + D1 | Auth, users, subs, policy, onboarding |
| Data | Your VPS / Node Agent | Proxy protocols and user traffic |
| Edge | Cloudflare | Workers, D1, optional edge endpoints |

Details: [`docs/architecture/current-state.md`](docs/architecture/current-state.md) · [`AGENTS.md`](AGENTS.md)

---

## Features

- **Compulsory SECURE PATH** — panel, API, subscription, and portal only under a random UUID; bare `/panel` → 404
- **Admin dashboard** — users, nodes/agents, protocols, settings, Lab, origin protection
- **Node Agents** — enroll with `xrm_node_` bearer; heartbeat + config pull (`scripts/node-agent.sh`)
- **Wizard** — token/OAuth → plan capabilities → deploy **rolling** `worker.mjs` + UI assets
- **Security policy** — kill switch, optional disable in-Worker proxy, monthly caps
- **Subscriptions** — Base64 / Clash / sing-box; user status at `/{SECURE}/me/<uuid>`
- **Origin protection** — disguise skins + canary paths (panel camouflage, not VPN traffic hiding)
- **Self-update** — Admin pulls GitHub `rolling` release onto the same Worker (D1 preserved)
- **Honest edge copy** — no “clean IP / stealth VPN” claims for Cloudflare anycast

---

## Requirements

- Cloudflare account with Workers + D1
- API token with **Edit Cloudflare Workers** (scoped; never commit)
- Node.js **20+** and npm for operator / contributor deploys
- Optional: `gh` CLI to publish the rolling release

---

## Quick start

### Preferred: ship an existing panel

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
# Config from first deploy: ~/.xraymod/config.json + cf_api_token
bash scripts/ship-panel.sh
```

Open:

```text
https://<worker>.workers.dev/<SECURE_PATH>/login
https://<worker>.workers.dev/<SECURE_PATH>/panel
```

### First panel on an account

```bash
export CLOUDFLARE_API_TOKEN="…"
export CLOUDFLARE_ACCOUNT_ID="…"
npx wrangler d1 create xraymod-db
bash scripts/deploy-panel.sh xraymod <d1_id>
```

Uses `worker.mjs` + UI assets via the Cloudflare API (`run_worker_first`). Avoid `wrangler deploy` from TypeScript source for production—some accounts hit real Error 1101.

### Rolling bundle (self-update / Wizard remote deploy)

```bash
bash scripts/publish-rolling.sh
```

Publishes `worker.mjs` + `assets.tar.gz` to the GitHub release tag [`rolling`](https://github.com/askarniroomand/XRayMOD/releases/tag/rolling).

Full runbook: [`DEPLOY.md`](DEPLOY.md)

---

## Cloudflare API token

1. [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. Template **Edit Cloudflare Workers** → tighten account scope
3. Copy once; store in a password manager
4. Use with installer / Wizard / `ship-panel.sh` only against Cloudflare APIs

Never paste tokens into Issues, PRs, chat, or git.

---

## After install

1. Sign in at `/{SECURE_PATH}/login`
2. Create a test user; import the subscription into your client
3. Open `/{SECURE_PATH}/me/<uuid>` for the status portal
4. Enroll a Node Agent under **Nodes** if you run data-plane on a VPS
5. Configure origin protection under **Stealth** / Admin as needed
6. Store SECURE PATH, hostname, and admin password offline

Bare `/panel`, `/api/*`, `/sub/*` **without** SECURE PATH return **404**.

---

## Deprecated shell installers

One-line scripts remain for compatibility only. Prefer Wizard + `ship-panel.sh`.

<details>
<summary>Windows / Unix one-liners (legacy)</summary>

**PowerShell:**

```powershell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
```

**Linux / macOS / WSL:**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)
```

</details>

---

## Project layout

```text
XRayMOD/
├── worker/           # Production Worker (API, router, policy, agents)
├── frontend/         # Next.js admin UI (static export)
├── scripts/          # ship-panel, deploy-worker-module, publish-rolling, node-agent
├── docs/             # Architecture & cleanup audit
├── installer/        # Legacy installer WebUI (deprecated primary path)
├── install.sh|.ps1   # Legacy one-line installers
├── wrangler.toml     # Bindings template
├── DEPLOY.md         # Operator runbook
├── AGENTS.md         # Agent / fork operating manual
└── LICENSE
```

Canonical runtime is **`worker/`**. Treat `backend/` and legacy Vite under `src/` as non-production unless you know otherwise.

---

## Development

```bash
npm install
npm install --prefix frontend
npm run lint          # tsc --noEmit
npm run build:ui      # frontend → frontend/out
npm test              # smoke tests
npm run dev:worker    # local wrangler (after UI build)
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · rolling publish: [`rolling-bundle.yml`](.github/workflows/rolling-bundle.yml)

---

## API surface (overview)

Admin routes require session auth and live under `/{SECURE_PATH}/api/…`.

| Area | Path prefix | Notes |
|:-----|:------------|:------|
| Auth | `/api/login`, `/api/logout` | Rate-limited |
| Users / configs / protocols | `/api/users`, `/api/configs`, … | Admin |
| Node Agents | `/api/agents` | Enroll / heartbeat / config |
| Wizard | `/api/wizard` | Setup, capabilities, deploy, OAuth PKCE |
| Admin / Lab | `/api/admin`, `/api/lab` | Update, policy, ops |
| Subscription | `/sub/<uuid>` | `?format=clash\|singbox` |
| Health | `/api/health` | Liveness behind SECURE PATH |

Inspect `worker/api/*` and panel network traffic for details. Public OpenAPI is not shipped yet.

---

## Security

- SECURE PATH is a secret URL component—treat it like a credential
- Prefer Cloudflare email bind / strong admin password; rotate on leak
- Report vulnerabilities privately (see [`SECURITY.md`](SECURITY.md))—do not open public issues with secrets
- In-Worker proxy can be disabled via security policy (`disable_in_worker_proxy`)

---

## FAQ

**Do I need a VPS?**  
Not for the control plane. You need nodes/agents if you terminate user proxy traffic off-Worker.

**Why 404 on `/panel`?**  
SECURE PATH is required. Use the full URL from install/bootstrap.

**How do I update a live panel?**  
`bash scripts/ship-panel.sh`, or Admin → self-update after `publish-rolling.sh`.

**Can I delete old installers?**  
Only after an explicit cleanup approval. See [`docs/architecture/cleanup-audit.md`](docs/architecture/cleanup-audit.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

```bash
git clone https://github.com/askarniroomand/XRayMOD.git
cd XRayMOD
npm install
# feature branch → PR against main
```

---

## License & authors

MIT — see [`LICENSE`](LICENSE).

| Author | GitHub |
|:-------|:-------|
| Askar Niroomand | [@askarniroomand](https://github.com/askarniroomand) |
| Pakrohk | [@Pakrohk](https://github.com/Pakrohk) |

Changelog: [`CHANGELOG.md`](CHANGELOG.md) · Roadmap: [`ROADMAP.md`](ROADMAP.md)
