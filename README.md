<div align="center">

# XrayMOD

**Modular Proxy Management Panel on Cloudflare Workers**

[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)

[فارسی](README.fa.md)

</div>

---

## What is XrayMOD?

XrayMOD is a **serverless, self-hosted proxy management panel** that runs entirely on Cloudflare Workers. It provides a complete dashboard for managing VLESS, Trojan, and Shadowsocks proxy protocols with advanced anti-censorship features, clean IP optimization, and a modern dark UI.

**Zero infrastructure required** — no VPS, no domain, no Docker. Just deploy to Cloudflare and go.

### Key Differentiators

- Runs on Cloudflare's **free tier** with no external dependencies
- **Stealth architecture** — panel hidden behind UUID, all other pages show fake Error 1101
- **Clean IP scanner** with per-ISP optimization for Iranian networks
- **gRPC + XHTTP** transport protocols beyond standard WebSocket
- **ECH + TLS Fragment** for advanced DPI bypass
- **Telegram bot** for full panel management from your phone
- **Backend mode** — users provide their own VPS for personal configs
- **Telegram Mini App** — responsive panel inside Telegram
- One-click deployment via installer script or wizard

---

## How It Works

### Architecture

**Cloudflare CDN → Cloudflare Worker → D1 Database**

#### Request Flow

1. **UUID Check**
   - No UUID set → redirect to `/install`
   - Wrong/missing UUID → Error 1101 page
   - Correct UUID → strip prefix, continue

2. **Route Matching**
   - `/api/*` → REST API handlers
   - `/sub/:token` → subscription links
   - WebSocket → proxy traffic
   - Static SPA (from Pages)

3. **Disguise Fallback**
   - Unrecognized paths → Error 1101 page

#### Worker Modules

| Module | Description |
|--------|-------------|
| React SPA (Static) | Frontend dashboard |
| REST API (Router) | API route handlers |
| Proxy Handler | WS / gRPC / XHTTP transport |
| Disguise System | Error 1101 bypass |
| TG Bot Webhook | Telegram bot handler |
| Clean IP System | ISP detection + IP optimization |

#### Storage

- **Cloudflare D1 Database** — users, protocols, configs, kvstore

### The UUID Access System

After installation, your panel is accessible **only** through a unique UUID URL:

```
https://your-worker.workers.dev/<your-unique-uuid>/
```

**Every other page returns a fake Cloudflare Error 1101** — making your panel invisible to scanners, inspectors, and even Cloudflare's own team.

| What happens when... | Result |
|----------------------|--------|
| Visiting `/` (no UUID) | Error 1101 page |
| Visiting `/admin` | Error 1101 page |
| Visiting `/random-path` | Error 1101 page |
| Visiting `/<correct-uuid>/` | Your panel dashboard |
| API calls to `/api/*` | Always work (auth required) |
| Proxy traffic (WebSocket) | Always works |

---

## Quick Start

### One-Line Install (Recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main/install.sh)
```

The installer handles everything:
1. Checks prerequisites (curl, uv)
2. Downloads the deployment script
3. Prompts for your Cloudflare API token
4. Creates D1 database automatically
5. Deploys the Worker
6. **Shows your secret panel URL with UUID**

### What You Get

After installation, you'll receive:

| Item | Value |
|------|-------|
| Panel URL | `https://xxx.workers.dev/a1b2c3d4-...` |
| Admin user | `admin` |
| Admin pass | *(your chosen password)* |

**Save this URL!** It is the only way to access your panel. The UUID part (`a1b2c3d4-...`) is your secret — never share it.

### First Login

1. Open your panel URL in browser
2. Login with admin credentials
3. You'll see the dashboard with all management tools

### Changing Your Panel UUID

From within the panel, go to **Settings → Security** to generate a new UUID. The old URL will stop working immediately.

---

## Disguise System (Error 1101 Bypass)

The disguise system makes your panel **invisible** to anyone who doesn't know the UUID.

### How It Works

1. **UUID Gate** — Every request must include your UUID in the URL path
2. **Fake Error Pages** — Unauthorized visitors see a realistic Cloudflare Error 1101
3. **Secret Paths** — Optional: configure custom paths that remap to real routes

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Disguise Enabled | Toggle the entire system | `false` |
| Admin Secret Path | Custom path for admin access | — |
| Login Secret Path | Custom path for login | — |
| Subscription Secret Path | Custom path for subscriptions | — |
| Fallback Page | `1101` or `nginx` | `1101` |

### Recovery Mode

If locked out, set `PANEL_RECOVERY=1` in Worker environment variables to access `/admin` directly.

---

## Features

### Core Proxy Engine

| Feature | Status |
|---------|--------|
| VLESS over WebSocket | ✅ |
| VLESS over gRPC (gun/multi) | ✅ |
| Trojan over WebSocket | ✅ |
| Shadowsocks over WebSocket | ✅ |
| Traffic tracking per user | ✅ |
| Subscription link generation | ✅ |

### Anti-Censorship

| Feature | Status |
|---------|--------|
| ECH (Encrypted Client Hello) | ✅ |
| TLS Fragment (Shadowrocket/Happ) | ✅ |
| Clean IP scanning | ✅ |
| Per-ISP IP optimization | ✅ |
| Random IP generation from CIDR | ✅ |
| Disguise system (Error 1101 bypass) | ✅ |

### Management

| Feature | Status |
|---------|--------|
| Admin dashboard | ✅ |
| User panel | ✅ |
| Telegram bot management | ✅ |
| Backend/VPS registration | ✅ |
| Protocol configuration | ✅ |
| Subscription formats (base64/Clash/sing-box) | ✅ |
| Dark emerald theme | ✅ |
| Telegram Mini App | ✅ |

---

## Clean IP Scanner

Automatically generates and manages Cloudflare IPs optimized for your ISP.

### Supported ISPs

| ISP | ASN | Code |
|-----|-----|------|
| MTN / Irancell | 44244 | `mtn` |
| Hamrah-e Aval (MCI) | 197207 | `mci` |
| Rightel | 57218 | `rightel` |
| Shatel | 31549 | `shatel` |

### How to Use

1. Open **Clean IP** tab in the admin panel
2. Click **Scan IPs** — generates random Cloudflare IPs for your network
3. Review results, then click **Apply Best IPs**
4. Subscription links will use the optimized IPs as server addresses

---

## Telegram Bot

Manage your entire panel from Telegram with inline keyboard navigation.

### Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Copy the bot token
3. Go to Settings → Telegram Bot in the panel
4. Enter the bot token and your Telegram Chat ID
5. Save, then run:
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-panel.workers.dev/bot"
   ```

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Main menu with inline keyboard |
| `/status` | Server uptime, user count, protocol info |
| `/config` | Current protocol and security settings |
| `/sub` | Get your subscription link |
| `/users` | List registered users (admin) |
| `/help` | Command reference |

---

## Backend Mode

Allow users to provide their own VPS for personal proxy configs.

### How It Works

1. User clicks **Register** in Marketplace → Your Server
2. Enters their VPS IP address
3. Runs the install script on their VPS:
   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/main/installer/backend-install.sh) <panel-url> <user-uuid>
   ```
4. The script installs Xray-core with the user's UUID
5. Subscription links automatically route through the VPS

---

## Subscription Links

### Formats

| Format | Parameter | Description |
|--------|-----------|-------------|
| Base64 | `?format=base64` | Default — base64-encoded URI list |
| Clash/Mihomo | `?format=clash` | YAML config with proxy groups |
| sing-box | `?format=singbox` | JSON config with outbounds |

### Example

```
https://your-panel.workers.dev/sub/<user-uuid>?format=clash
```

---

## Project Structure

```
XrayMOD/
├── worker/                  # Cloudflare Worker source (TypeScript)
│   ├── index.ts             # Entry point
│   ├── router.ts            # Request routing + UUID gate + disguise
│   ├── auth.ts              # Session management
│   ├── schema.ts            # D1 schema + default protocols
│   ├── types.ts             # TypeScript interfaces
│   ├── disguise.ts          # Error 1101 bypass system
│   ├── telegram.ts          # Telegram bot webhook handler
│   ├── utils.ts             # ISP detection, CIDR IPs, helpers
│   ├── api/                 # API route handlers
│   ├── proxy/               # Transport handlers (VLESS, Trojan, SS, gRPC, XHTTP)
│   └── subscription.ts      # Subscription link generation
├── src/                     # React frontend (Vite + Tailwind v4)
├── components/ui/           # shadcn/ui components
├── installer/               # Deployment scripts
│   ├── install.py           # Python installer
│   └── backend-install.sh   # VPS backend installer
├── wizard/                  # One-click deployer
├── worker.js                # Compiled Worker bundle
└── wrangler.toml            # Cloudflare configuration
```

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ADMIN_PASSWORD` | Yes | Admin panel password | — |
| `TG_BOT_TOKEN` | No | Telegram bot token from @BotFather | — |
| `DISGUISE_PAGE` | No | Decoy page type: `1101` or `nginx` | `1101` |
| `PANEL_RECOVERY` | No | Set `1` to bypass disguise | `false` |

---

## Troubleshooting

### Locked Out by Disguise

Set `PANEL_RECOVERY=1` in Worker environment variables to access `/admin` directly.

### Lost Panel URL

If you lost your UUID URL, you can:
1. Deploy a fresh Worker
2. Or use `PANEL_RECOVERY=1` to access the old one

### Worker Won't Deploy

- Verify Wrangler authentication: `wrangler whoami`
- Confirm D1 database ID in `wrangler.toml`
- Install dependencies: `npm install`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for free internet. No traffic data is stored. The proxy belongs to you.**

</div>
