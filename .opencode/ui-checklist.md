# XRayMOD UI Development Checklist

**Goal**: Modern panel with shadcn/ui + Next.js 15 + dark emerald theme
**Languages**: English + Farsi (RTL)
**Architecture**: IOP for extensibility

---

## Phase 1: Core Pages (P0)

### Dashboard
- [x] Server status card (uptime, version)
- [x] Traffic overview (daily/monthly)
- [x] Active connections count
- [x] Quick actions grid
- [ ] Announcement banner

### Components Created
- [x] StatCard, StatusBadge, ProgressBar
- [x] Card, CardHeader, Button, Input
- [x] DataTable, Toggle, EmptyState

### Config
- [x] Protocol selection (VLESS/Trojan/SS)
- [x] Host management (add/remove)
- [x] Path configuration
- [x] Transport settings (WS/gRPC/XHTTP/TCP)
- [x] TLS settings (fingerprint, security mode)
- [x] ECH settings (toggle + SNI)
- [x] TLS Fragment (toggle + ranges)
- [x] Subscription settings (name, formats, mixed)
- [x] Service control (pause)
- [ ] Host health indicators

### Users
- [x] User list with search/filter
- [x] Add user form (username, email, traffic, expiry)
- [x] Delete user with confirmation
- [x] Per-user quota (traffic limit + progress bar)
- [x] User status (active/disabled badges)
- [x] Reset user quota
- [x] Enable/disable toggle
- [x] Copy subscription link
- [x] Edit user modal (full form)
- [x] Per-user speed limit (KB/s)

### Network
- [x] Routing rules (GeoIP, GeoSite, Ad/Porn block)
- [x] Domestic bypass toggle
- [x] DNS over HTTPS (4 providers)
- [x] Local DNS (custom resolver)
- [x] FakeDNS (Android VPN)
- [x] Anti-Sanction DNS (Iran-specific)
- [x] IPv6 toggle
- [x] LAN access toggle
- [x] WARP/WireGuard (mode, endpoint, AmneziaWG, WoW)
- [x] Log level selector
- [x] TCP concurrent connections
- [x] Pre-resolve DNS toggle
- [x] Custom routing rules editor

### Clean IP
- [ ] Radar scanner SPA
- [ ] IP pool management
- [ ] Health status indicators
- [ ] Apply best IP button
- [ ] Port selection

### Security
- [ ] Change password form
- [ ] 2FA setup (QR code + manual entry)
- [ ] Active sessions list
- [ ] Rate limit settings

---

## Phase 2: Advanced Features (P1)

### Subscriptions
- [ ] Subscription preview (all formats)
- [ ] Clash YAML preview
- [ ] sing-box JSON preview
- [ ] Copy link button
- [ ] QR code generation

### WARP
- [ ] Account registration
- [ ] License activation
- [ ] Endpoint list with health
- [ ] WireGuard config download
- [ ] WoW mode toggle

### Telegram Bot
- [ ] Bot token configuration
- [ ] Chat ID setup
- [ ] Webhook setup button
- [ ] Command reference
- [ ] Test message button

### Logs
- [ ] Request log table (IP, URL, time, status)
- [ ] Error log viewer
- [ ] Log retention settings
- [ ] Export button

### Settings
- [x] System info (version, uptime, storage, configured)
- [x] Change password (with show/hide toggle)
- [x] 2FA setup (secret, code, enable/disable)
- [x] Backup/restore config (export/import JSON)
- [x] Reset to defaults (double confirmation)
- [x] Self-update check

---

## Phase 3: Extended Features (P2)

### Backend Mode
- [ ] Backend URL configuration
- [ ] Connection test
- [ ] Diagnostics page

### Multi-Language
- [ ] EN/FA toggle
- [ ] RTL layout support
- [ ] All strings translated

### Mobile
- [ ] Responsive sidebar
- [ ] Touch-friendly controls
- [ ] Safe area handling

---

## Design System

### Colors
- Background: `#09090b` (zinc-950)
- Card: `#18181b` (zinc-900)
- Border: `#27272a` (zinc-800)
- Primary: `#10b981` (emerald-500)
- Primary hover: `#34d399` (emerald-400)
- Text: `#fafafa` (zinc-50)
- Muted: `#a1a1aa` (zinc-400)
- Error: `#ef4444` (red-500)

### Components (shadcn/ui)
- Card, Button, Input, Select, Switch
- Dialog, Sheet, Tabs, Badge
- Table, ScrollArea, Progress
- Toast (sonner)

### Typography
- Headings: font-black, tracking-tight
- Body: text-sm, leading-relaxed
- Code: font-mono, text-emerald
