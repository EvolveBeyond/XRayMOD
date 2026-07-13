# XRayMOD v2 — Development Plan

**تاریخ:** 2026-07-13
**وضعیت:** در حال توسعه

---

## هدف

ترکیب بهترین تکنیک‌های cfnew و Nova در یک پنل مدرن فول‌استک با UI یکپارچه Next.js.

---

## Phase 1: Stealth Worker (فارسی)

### ۱.۱ Safe Socket Bootstrap
**جایگزینی `new WebSocket()` با `request.fetcher.connect()`**

```typescript
// قبل (کار نمیکنه):
const targetWs = new WebSocket(`wss://${host}:${port}`);

// بعد (مثل Nova):
function getConnection(request: Request) {
  const fetcher = (request as any)?.fetcher;
  if (!fetcher?.connect) throw new Error('fetcher.connect unavailable');
  return fetcher.connect;
}
```

### ۱.۲ Obfuscation (browser-no-eval)
- String Array با RC4 encoding
- Mangled identifiers
- **بدون** `eval()` (باعث Error 1101 میشه)
- **بدون** control-flow flattening (CPU free-tier limit)
- ابزار: `javascript-obfuscator` v5

### ۱.۳ استتار فارسی
- نام متغیرها: `توکن_احراز` به جای `authToken`
- کامنت‌ها: فارسی
- رشته‌ها: Base64 (مثل cfnew)
- نتیجه: اسکنر انگلیسی چیزی نمی‌فهمه

### ۱.۴ UUID Gate (مثل cfnew)
- هر درخواست بدون UUID → 404
- صفحه اصلی `/`: سایت جعلی قانونی
- WebSocket: bypass UUID (proxy traffic)
- `/api/*`: bypass UUID (نیاز به auth)

### ۱.۵ Dynamic Source Fetch
- کد پروکسی از GitHub دانلود بشه
- ریپو فقط deployer باشه
- Cache-busting با timestamp

### ۱.۶ Random Worker Names
- `edge-{random8}` در زمان deploy
- حذف نام `xraymod` از everywhere

---

## Phase 2: Installer Improvements

### ۲.۱ OAuth Token Persistence
- ✅ انجام شد: توکن در `~/.xraymod/config.json` ذخیره میشه
- ✅ انجام شد: `/api/check-token` endpoint

### ۲.۲ Delete/Update
- ✅ انجام شد: بخش حذف و آپدیت در نصاب

### ۲.۳ Binding Preservation
- ✅ انجام شد: قبل از آپدیت، settings فعلی ورکر خوانده میشه

### ۲.۴ KV Integration
- ذخیره تنظیمات در KV (نه فقط D1)
- Config cache با TTL کوتاه
- Migrate KV → D1 (مثل Nova)

---

## Phase 3: Next.js Frontend

### ۳.۱ Setup
```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── panel/
│   │   ├── page.tsx          # Dashboard
│   │   ├── users/page.tsx    # مدیریت کاربران
│   │   ├── nodes/page.tsx    # مدیریت نودها
│   │   ├── cleanip/page.tsx  # IP تمیز
│   │   ├── protocols/page.tsx
│   │   ├── settings/page.tsx
│   │   └── wallet/page.tsx
│   └── api/
│       ├── [...path]/route.ts  # Catch-all API
│       └── health/route.ts
├── components/
│   ├── ui/                    # shadcn/ui
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   └── dashboard/
│       ├── stats.tsx
│       ├── traffic-chart.tsx
│       └── quick-actions.tsx
├── lib/
│   ├── cf.ts                  # KV/D1 helpers
│   ├── auth.ts                # Session management
│   └── protocol-utils.ts
└── next.config.ts
```

### ۳.۲ Build Pipeline
- `next build` → Cloudflare Pages
- `_worker.js` برای API routes
- Static assets برای UI

### ۳.۳ Auth Flow
- SHA-256 password hash
- Session cookie
- UUID-gated URLs

---

## Phase 4: Backend Integration

### ۴.۱ D1 Schema
```sql
-- کاربران
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE,
  username TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  traffic_limit INTEGER DEFAULT 0,
  traffic_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  expiry_date TEXT,
  created_at INTEGER
);

-- تنظیمات پنل
CREATE TABLE kvstore (
  k TEXT PRIMARY KEY,
  v TEXT,
  updated INTEGER
);

-- پروتکل‌ها
CREATE TABLE protocols (
  id INTEGER PRIMARY KEY,
  name TEXT,
  type TEXT,
  template_json TEXT,
  enabled INTEGER DEFAULT 1
);

-- کانفیگ‌ها
CREATE TABLE configs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  protocol_id INTEGER,
  path TEXT UNIQUE,
  settings_json TEXT,
  created_at INTEGER
);
```

### ۴.۲ API Routes (Next.js)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET/POST /api/users`
- `GET/POST /api/nodes`
- `GET/POST /api/configs`
- `GET/POST /api/protocols`
- `GET/POST /api/settings`
- `GET /api/health`
- `POST /api/cleanip`

---

## Phase 5: Deploy & Testing

### ۵.۱ Build
```bash
# Worker (stealth)
npx javascript-obfuscator worker.js --target browser-no-eval --compact true

# Frontend
cd frontend && npm run build

# Deploy
npx wrangler deploy
```

### ۵.۲ Testing
- [ ] Proxy traffic flows correctly
- [ ] Error 1101 does not appear
- [ ] UUID gate works
- [ ] Stealth homepage shows
- [ ] OAuth flow works
- [ ] Deploy/Update/Delete work
- [ ] UI is responsive on mobile
- [ ] All API routes respond

---

## Research Sources

- **cfnew**: `.references/cfnew-deployer/` — UUID gate, dynamic source, Chinese obfuscation
- **Nova**: `.references/Nova-Proxy/` — `request.fetcher.connect()`, D1-as-source-of-truth, obfuscation
- **Nova-Wizard**: `.references/Nova-Wizard/` — OAuth2 PKCE installer
- **IOP Paradigm**: Global memory — Intent-Oriented Programming
