# XrayMOD

A modular proxy management panel built on Cloudflare Workers with React, shadcn/ui, and Tailwind CSS v4.

[فارسی](README.fa.md)

## Overview

XrayMOD is a serverless proxy management panel that runs entirely on Cloudflare Workers. It provides a complete admin dashboard for managing proxy protocols (VLESS, Trojan, Shadowsocks), users, and subscription links.

## Features

- **Proxy Engine** — VLESS, Trojan, Shadowsocks over WebSocket with traffic tracking
- **Admin Panel** — Dashboard, node management, user management, protocol configuration
- **User Panel** — Subscription dashboard, marketplace, referral program, payment, profile
- **Modular Protocols** — Define new protocols via JSON schema + Xray config templates
- **Subscription Links** — Auto-generate configs for Clash, sing-box, V2RayNG, and base64
- **Dark Theme** — Emerald accent color scheme with responsive design
- **Optional Integrations** — Telegram Bot and TON Wallet (requires external server)
- **Wizard Deployer** — One-click deployment to other users' Cloudflare accounts

## Architecture

- **Cloudflare Worker** — Single deployment serving both the API and the React SPA
- **Static Assets** — Bundled React app served by the Worker
- **API Router** — Handles authentication, user/node/protocol management, settings, and subscriptions
- **Proxy Handler** — WebSocket upgrade for VLESS/Trojan/Shadowsocks traffic
- **D1 Database** — Stores users, protocols, configs, and key-value settings
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker                                      │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │ Static Assets│ │ API Router                       │  │
│  │ (React SPA)  │ │ /api/login, /api/logout          │  │
│  │              │ │ /api/users, /api/nodes           │  │
│  └─────────────┘  │ /api/protocols, /api/configs     │  │
│                    │ /api/settings, /api/health      │  │
│                    │ /sub/:token (subscription)      │  │
│                    │ /proxy/* (traffic handler)      │  │
│                    └─────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ D1 Database: users | protocols | configs | kvstore  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Manual Deployment

**Step 1: Create D1 Database**

1. Go to Cloudflare Dashboard → Workers & Pages → D1
2. Click **Create a database**
3. Name it `xraymod-db`
4. Copy the **Database ID**

**Step 2: Clone and Build**

```bash
git clone https://github.com/EvolveBeyond/XRayMOD.git
cd XRayMOD
npm install
```

**Step 3: Configure Wrangler**

Update `wrangler.toml` with your D1 database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "xraymod-db"
database_id = "your-d1-database-id-here"
```

**Step 4: Deploy**

```bash
npm run deploy
```

**Step 5: Set Admin Password**

In Cloudflare Dashboard → Workers → xraymod → Settings → Variables:

- `ADMIN_PASSWORD` — Your secure password

**Step 6: Access Your Panel**

Visit `https://xraymod.<your-subdomain>.workers.dev`

Default login: `admin` / `admin`

> Change the default password immediately!

### Option 2: Wizard Deployment (One-Click)

The Wizard allows deploying XRayMOD to other users' Cloudflare accounts using their API token.

**Setup Wizard:**

```bash
cd wizard
wrangler deploy
```

**Using the Wizard:**

1. Open `https://xraymod-wizard.<your-subdomain>.workers.dev`
2. Enter the target user's Cloudflare API token
3. Click **Deploy to Cloudflare**
4. Share the deployed URL with the user

**Required API Token Permissions:**

- `Account: Workers Scripts: Edit`
- `Account: D1: Edit`

## Conditional Features

Some features require a separate Node.js server:

- **Telegram Bot** — Disabled on base Worker, enabled with external server
- **TON Wallet** — Disabled on base Worker, enabled with external server
- **Custom JSON Configs** — Disabled on base Worker, enabled with external server

To enable, set `EXTERNAL_SERVER_URL` in environment variables.

## API Endpoints

- `POST /api/login` — Authenticate user (public)
- `POST /api/logout` — Logout user (authenticated)
- `GET /api/health` — Health check (public)
- `GET /api/nodes` — List nodes (admin)
- `POST /api/nodes` — Add node (admin)
- `GET /api/users` — List users (admin)
- `POST /api/users` — Create user (admin)
- `PUT /api/users/:id` — Update user (admin)
- `GET /api/protocols` — List protocols (admin)
- `POST /api/protocols` — Add protocol (admin)
- `GET /api/configs` — List configs (admin)
- `POST /api/configs` — Create config (admin)
- `GET /api/settings` — Get settings (admin)
- `PUT /api/settings` — Update settings (admin)
- `GET /sub/:token` — User subscription (public)

## Subscription Links

Access subscription at:

```
https://your-worker.workers.dev/sub/<user-uuid>
```

Supported formats (via `?format=` parameter):

- `base64` (default) — Base64-encoded URI list
- `clash` — Clash/Mihomo YAML config
- `singbox` — sing-box JSON config

## Project Structure

```
XRayMOD/
├── worker/              # Cloudflare Worker source
│   ├── index.ts         # Entry point
│   ├── router.ts        # Request routing
│   ├── auth.ts          # Authentication
│   ├── schema.ts        # D1 database schema
│   ├── types.ts         # TypeScript types
│   ├── api/             # API handlers
│   ├── proxy/           # Proxy traffic engine
│   └── subscription.ts  # Subscription generation
├── src/                 # React frontend
│   ├── App.tsx          # Main application
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind CSS v4 theme
├── components/ui/       # shadcn/ui components
├── wizard/              # One-click deployer
├── wrangler.toml        # Cloudflare config
└── ROADMAP.md           # Development roadmap
```

## Troubleshooting

### Worker Won't Deploy

- Verify Wrangler is logged in: `wrangler whoami`
- Check D1 database ID in `wrangler.toml`
- Ensure all dependencies are installed: `npm install`

### API Returns 401

- Ensure `ADMIN_PASSWORD` is set in environment variables
- Clear browser cookies and try again
- Check the password matches what you're entering

### Subscription Link Not Working

- Verify user has active status and valid expiry date
- Check the UUID is correct in the URL

## License

MIT
