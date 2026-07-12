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
- **Anti-detection disguise** system with fake Cloudflare error pages
- **Clean IP scanner** with per-ISP optimization for Iranian networks
- **gRPC + XHTTP** transport protocols beyond standard WebSocket
- **ECH + TLS Fragment** for advanced DPI bypass
- **Telegram bot** for full panel management from your phone
- **Backend mode** — users provide their own VPS for personal configs
- **Telegram Mini App** — responsive panel inside Telegram
- One-click deployment via installer script or wizard

---

## Features

### Core Proxy Engine
| Feature | Status |
|---------|--------|
| VLESS over WebSocket | ✅ |
| VLESS over gRPC (gun/multi) | ✅ |
| Trojan over WebSocket | ✅ |
| Shadowsocks over WebSocket | ✅ |
| WebSocket Early Data (0-RTT) | 🔜 |
| XHTTP transport | 🔜 |
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
| One-click wizard deployer | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare CDN                     │
├─────────────────────────────────────────────────────┤
│                  Cloudflare Worker                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ React SPA│  │ REST API │  │  Proxy Handler   │  │
│  │ (Static) │  │ (Router) │  │ (WS/gRPC/XHTTP) │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Disguise │  │ TG Bot   │  │  Clean IP System │  │
│  │  System  │  │ Webhook  │  │  ISP Detection   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│              Cloudflare D1 Database                  │
│         (users, protocols, configs, settings)        │
└─────────────────────────────────────────────────────┘
```

- **Single Worker deployment** serves both the React SPA and the API
- **D1 database** for persistent storage (zero cold-start queries)
- **Disguise layer** intercepts unauthorized requests before they reach the panel
- **Telegram bot** runs as a webhook endpoint on the same Worker
- **Clean IP system** fetches Cloudflare CIDR ranges and generates optimized IPs

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
6. Displays panel URL and admin credentials

### Wizard Deployment (For Resellers)

Deploy the wizard once, then deploy panels for others:

```bash
git clone https://github.com/EvolveBeyond/XRayMOD.git
cd XRayMOD/wizard
wrangler deploy
```

Open `https://xraymod-wizard.<subdomain>.workers.dev`, enter the user's Cloudflare API token, and click Deploy.

### Manual Deployment

```bash
git clone https://github.com/EvolveBeyond/XRayMOD.git
cd XRayMOD
npm install
```

Configure `wrangler.toml` with your D1 database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "xraymod-db"
database_id = "your-d1-database-id"
```

Deploy:

```bash
npm run deploy
```

Set `ADMIN_PASSWORD` in Worker environment variables, then access the panel at your Workers URL.

---

## Disguise System

The disguise system hides the panel behind secret paths and serves fake Cloudflare error pages to unauthorized visitors.

### How It Works

| Step | What Happens |
|------|-------------|
| 1. Secret paths | Set custom paths for admin, login, subscription |
| 2. Path remapping | Visiting `/x7k9m` transparently rewrites to `/admin` |
| 3. Decoy pages | Hitting `/admin` directly shows fake Error 1101 |
| 4. Fallback | Any random URL shows the decoy page |

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DISGUISE_PAGE` | `1101` or `nginx` | `1101` |
| `PANEL_RECOVERY` | Set `1` to bypass disguise | `false` |
| `ADMIN_PATH` | Override admin secret path | (from DB) |
| `LOGIN_PATH` | Override login secret path | (from DB) |
| `SUB_PATH` | Override subscription secret path | (from DB) |

**Recovery**: If locked out, set `PANEL_RECOVERY=1` in Worker env vars to access `/admin` directly.

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

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/cleanip/scan` | GET | Public | Generate random IPs for visitor's ISP |
| `/api/cleanip/apply` | POST | Admin | Save IPs to config |
| `/api/cleanip/list` | GET | Admin | List active clean IPs |

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

### Telegram Mini App

The panel automatically detects Telegram Mini App environment and:
- Initializes the WebApp SDK
- Enables back button navigation
- Applies safe area padding for notched devices
- Matches Telegram's dark theme

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

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/backends` | GET | Admin | List all backends |
| `/api/backends` | POST | Admin | Register a backend |
| `/api/backends/:id` | DELETE | Admin | Remove a backend |

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

### Auto-Generated Parameters

Subscription links automatically include:
- **ECH** parameters when enabled in settings
- **TLS Fragment** parameters when enabled
- **Clean IP** addresses when configured
- **Backend VPS** address when user has a registered backend

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | Authenticate user |
| `/api/logout` | POST | Logout user |

### Management (Admin)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nodes` | GET/POST | List or add nodes |
| `/api/users` | GET/POST | List or create users |
| `/api/users/:id` | PUT | Update user |
| `/api/protocols` | GET/POST | List or add protocols |
| `/api/configs` | GET/POST | List or create configs |
| `/api/settings` | GET/PUT | Read or update settings |
| `/api/cleanip/*` | GET/POST | Clean IP management |
| `/api/backends` | GET/POST/DELETE | Backend management |

### Public
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/sub/:token` | GET | User subscription |
| `/bot` | POST | Telegram webhook |

---

## Project Structure

```
XrayMOD/
├── worker/                  # Cloudflare Worker source (TypeScript)
│   ├── index.ts             # Entry point
│   ├── router.ts            # Request routing + disguise
│   ├── auth.ts              # Session management
│   ├── schema.ts            # D1 schema + default protocols
│   ├── types.ts             # TypeScript interfaces
│   ├── disguise.ts          # Error 1101 bypass system
│   ├── telegram.ts          # Telegram bot webhook handler
│   ├── utils.ts             # ISP detection, CIDR IPs, helpers
│   ├── api/                 # API route handlers
│   │   ├── login.ts         #   Authentication
│   │   ├── users.ts         #   User CRUD
│   │   ├── settings.ts      #   Settings management
│   │   ├── cleanip.ts       #   Clean IP scanning
│   │   └── backends.ts      #   Backend/VPS registration
│   ├── proxy/               # Transport handlers
│   │   ├── index.ts         #   WebSocket proxy engine
│   │   ├── vless.ts         #   VLESS protocol parser
│   │   ├── trojan.ts        #   Trojan protocol parser
│   │   ├── shadowsocks.ts   #   Shadowsocks handler
│   │   ├── grpc.ts          #   gRPC frame handling
│   │   └── xhttp.ts         #   XHTTP transport detection
│   └── subscription.ts      # Subscription link generation
├── src/                     # React frontend (Vite + Tailwind v4)
│   ├── App.tsx              # Main application (2400+ lines)
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind theme + safe area
├── components/ui/           # shadcn/ui components
├── installer/               # Deployment scripts
│   ├── install.py           # Python installer
│   └── backend-install.sh   # VPS backend installer
├── wizard/                  # One-click deployer
├── worker.js                # Compiled Worker bundle
├── wrangler.toml            # Cloudflare configuration
└── README.md                # This file
```

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ADMIN_PASSWORD` | Yes | Admin panel password | — |
| `TG_BOT_TOKEN` | No | Telegram bot token from @BotFather | — |
| `DISGUISE_PAGE` | No | Decoy page type: `1101` or `nginx` | `1101` |
| `PANEL_RECOVERY` | No | Set `1` to bypass disguise | `false` |
| `ADMIN_PATH` | No | Override admin secret path | — |
| `LOGIN_PATH` | No | Override login secret path | — |
| `SUB_PATH` | No | Override subscription secret path | — |
| `EXTERNAL_SERVER_URL` | No | External Node.js server URL | — |

---

## Troubleshooting

### Worker Won't Deploy
- Verify Wrangler authentication: `wrangler whoami`
- Confirm D1 database ID in `wrangler.toml`
- Install dependencies: `npm install`

### API Returns 401
- Ensure `ADMIN_PASSWORD` is set in Worker env vars
- Clear browser cookies and retry
- Verify the password matches

### Subscription Link Not Working
- Confirm user status is `active`
- Verify the UUID is correct in the URL
- Check the user's expiry date hasn't passed

### Locked Out by Disguise
- Set `PANEL_RECOVERY=1` in Worker environment variables
- Access the panel using your configured secret path

### Telegram Bot Not Responding
- Verify `TG_BOT_TOKEN` is set correctly
- Confirm webhook is registered: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
- Check the bot token matches what you entered in Settings

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
