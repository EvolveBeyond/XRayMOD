# Design Document — XRayMOD v2 Architecture

## Goal
Transform XRayMOD from CF Workers-only to a dual-mode system:
1. **CF Workers Mode** — proxy on edge, management API on worker (current, kept as-is)
2. **Personal Server Mode** — proxy on CF edge, management API + UI on VPS

Plus: FastAPI installer with WebUI, Next.js frontend, offline testing.

---

## Phase 1: FastAPI Installer + WebUI

### Files
```
installer/
├── app.py              # FastAPI main (startup, routes)
├── config.py           # ~/.xraymod/config.json management
├── cf_api.py           # Cloudflare API client (migrated from install.py)
├── deployer.py         # Deploy logic (CF Worker + VPS)
├── templates/
│   └── index.html      # Jinja2 WebUI
├── static/
│   ├── app.js          # Installer frontend logic
│   └── styles.css      # Dark emerald theme
├── install.py          # CLI fallback (legacy)
└── backend-install.sh  # VPS installer (existing)
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | WebUI |
| GET | `/api/status` | Install status |
| POST | `/api/verify-token` | Validate CF token |
| GET | `/api/accounts` | List CF accounts |
| POST | `/api/deploy` | Deploy to CF Worker |
| POST | `/api/deploy-server` | Deploy to VPS |
| GET | `/api/progress` | SSE progress stream |
| GET | `/health` | Health check |

### WebUI Features
- Welcome screen + mode selection (CF Worker / VPS)
- CF API Token form with visual guide
- Worker name + D1 database + admin password config
- Real-time progress (SSE)
- Offline test button (SQLite local)
- Result page: panel URL + password + subscription link

### Dependencies
```
fastapi
uvicorn[standard]
jinja2
httpx
aiosqlite
```

### Install Flow
1. User runs `uv run installer/app.py`
2. Browser opens `http://localhost:8000`
3. User selects mode, enters CF token
4. Installer creates D1 + deploys Worker (or sets up VPS)
5. Shows result with URL and credentials

---

## Phase 2: FastAPI Backend (VPS Mode)

### Files
```
backend/
├── main.py             # FastAPI app entry
├── config.py           # Settings + env
├── database.py         # SQLAlchemy async setup
├── models.py           # ORM models
├── auth.py             # Session + password (SHA-256)
├── routers/
│   ├── login.py        # POST /api/login
│   ├── logout.py       # POST /api/logout
│   ├── users.py        # CRUD /api/users
│   ├── nodes.py        # CRUD /api/nodes
│   ├── configs.py      # CRUD /api/configs
│   ├── protocols.py    # CRUD /api/protocols
│   ├── settings.py     # GET/PUT /api/settings
│   ├── cleanip.py      # Clean IP scanning
│   ├── backends.py     # Backend registration
│   └── wizard.py       # Wizard deployment
├── services/
│   ├── subscription.py  # Subscription link generation
│   ├── clean_ip.py      # Clean IP scanner
│   └── cf_client.py     # Cloudflare API client
├── schema.sql           # SQLite schema
└── requirements.txt
```

### DB
- SQLite (offline/dev) / PostgreSQL (production)
- SQLAlchemy async with auto-migration on startup
- Same schema as D1: users, configs, protocols, kvstore, backends

### Worker Proxy-Only Mode
New env vars in `wrangler.toml`:
```toml
BACKEND_URL = "https://your-vps.com"
BACKEND_SECRET = "hmac-secret-here"
```

Modified `worker/router.ts`:
- If `BACKEND_URL` set → forward API requests to VPS (with HMAC auth)
- If not set → self-contained (current behavior)
- Proxy traffic (WS, gRPC, XHTTP) always local

### Worker ↔ Backend Communication
```mermaid
sequenceDiagram
    participant Worker as CF Worker
    participant Backend as VPS Backend

    Worker->>Backend: API Request (HMAC signed)
    Worker->>Internet: Proxy Traffic (always local)
    Worker->>Backend: Heartbeat (every 30s)
```

---

## Phase 3: Next.js 15 App Router Frontend

### Files
```
frontend/
├── app/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Redirect to /panel
│   ├── login/page.tsx     # Login
│   └── panel/
│       ├── layout.tsx     # Sidebar + nav
│       ├── page.tsx       # Dashboard
│       ├── nodes/page.tsx
│       ├── users/page.tsx
│       ├── cleanip/page.tsx
│       ├── protocols/page.tsx
│       ├── settings/page.tsx
│       └── wallet/page.tsx
├── components/
│   ├── ui/                # shadcn/ui (reuse existing)
│   ├── layout/            # sidebar, mobile-nav, header
│   ├── dashboard/         # stat-card, node-performance
│   ├── users/             # user-table, dialogs
│   ├── cleanip/           # isp-detection, ip-scanner
│   └── settings/          # disguise, network, telegram
├── lib/
│   ├── api.ts             # fetch wrapper
│   ├── auth.ts            # auth context + hooks
│   ├── protocol-utils.ts  # from src/lib/
│   └── types.ts           # from worker/types.ts
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### Key Decisions
- App Router (Next.js 15)
- Server Components for data fetching
- Middleware for auth guard
- `NEXT_PUBLIC_API_URL` for backend URL
- shadcn/ui components reused from existing `components/`

---

## Phase 4: Offline Testing

### Installer Offline
- Cache `worker.js` + `dist/` in `~/.xraymod/cache/`
- Fallback to local cache when offline
- SQLite for local testing

### Panel Offline (VPS Mode)
- FastAPI + SQLite = fully offline
- `uv run backend/main.py` → `http://localhost:8000`
- All API endpoints work without CF Worker

### Worker Offline
- `wrangler dev` with local SQLite (miniflare)
- Connect to local FastAPI backend

---

## Implementation Order
1. **Phase 1** — FastAPI Installer ✅
2. **Phase 2** — FastAPI Backend ✅
3. **Phase 3** — Next.js Frontend ✅ (build passes)
4. **Phase 4** — Nova Features Port ✅

---

## Nova-Proxy Features Ported (2026-07-12)

### Kill Switch & Monthly Cap
- `panel.paused` in kvstore → 503 for proxy traffic only (panel/API stay accessible)
- `panel.monthly_cap_gb` in kvstore → 503 when total traffic exceeds cap
- Applied in router.ts BEFORE proxy handling, AFTER schema init

### Login Rate Limiting
- 5 attempts per minute per IP
- Stored in kvstore `ratelimit:login:<ip>` with timestamp
- Returns 429 after limit exceeded
- Timing-safe password comparison

### Mixed Protocol Mode
- `protocol.mixed_mode` in kvstore → cycles `['vless', 'trojan', 'ss']`
- Each config index gets next protocol in cycle
- Label includes protocol name: "Config (VLESS)", "Config (TROJAN)"

### Per-Node Host Randomization
- Clean IPs shuffled per subscription request
- Each node gets unique host from shuffled pool
- Prevents fingerprinting across nodes

### Router Pipeline (Fixed)
```mermaid
graph LR
    DisguiseRemap[Disguise remap] --> UUIDCheck[UUID check]
    UUIDCheck --> RouteMatching[Route matching]
    RouteMatching --> DisguiseFallback[Disguise fallback]
```
- Secret paths (/x-admin) remap BEFORE UUID check
- UUID strips prefix, second disguise check catches /admin decoy
- Registered routes always execute (not blocked by disguise)
4. **Phase 4** — Offline testing
