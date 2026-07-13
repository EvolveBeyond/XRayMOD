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
- [ ] User list with search/filter
- [ ] Add/edit/delete user dialog
- [ ] Per-user quota (traffic limit)
- [ ] Per-user speed limit
- [ ] User status (active/expired/disabled)
- [ ] Reset user quota

### Network
- [ ] Routing rules toggle
- [ ] GeoIP/GeoSite settings
- [ ] Ad/malware/phishing block toggles
- [ ] Domestic bypass toggle
- [ ] DNS settings (DoH provider, local DNS)
- [ ] IPv6 toggle
- [ ] Custom routing rules editor

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
- [ ] System info (version, uptime, memory)
- [ ] Update check
- [ ] Backup/restore config
- [ ] Reset to defaults

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
