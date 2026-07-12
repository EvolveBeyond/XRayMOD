# XrayMOD Roadmap

## Phase 1: Core Panel + Proxy Engine ✅
- [x] Cloudflare Worker architecture with D1 storage
- [x] React frontend with shadcn/ui + Tailwind CSS v4
- [x] Authentication system (password + session cookies)
- [x] Admin panel: Dashboard, Nodes, Users, Protocols, Settings
- [x] User panel: Dashboard, Marketplace, Referral, Payment, Profile
- [x] Proxy engine: VLESS, Trojan, Shadowsocks over WebSocket
- [x] Subscription link generation (base64, Clash, sing-box)
- [x] Traffic tracking per user
- [x] Modular protocol system (JSON schema + templates)
- [x] Dark theme with emerald accent

## Phase 2: Deployment Wizard ✅
- [x] Wizard installer Worker script
- [x] One-click deployment via Cloudflare API token
- [x] Automatic D1 database creation
- [x] Worker script upload and configuration
- [x] Bilingual wizard UI (English + Persian)
- [x] Setup script for Git repository fixes

## Phase 3: Advanced Proxy Features
- [x] ECH (Encrypted Client Hello) support
- [x] TLS fragment / SNI fragment
- [ ] Proxy chaining (SOCKS5, HTTP, HTTPS forward)
- [x] gRPC transport support
- [ ] XHTTP transport support
- [ ] WebSocket Early Data (0-RTT)
- [ ] Multi-path / port-spread configuration
- [x] Disguise system — Error 1101 bypass + secret admin/login paths
- [x] Automatic clean IP scanning + Iranian ISP detection

## Phase 4: External Server Bridge
- [x] Telegram Bot integration (user notifications, management commands)
- [x] Backend mode — VPS registration + auto-install script
- [ ] TON Wallet integration (payments, withdrawals)
- [x] Bridge API between Worker and external server
- [ ] Real-time notifications via WebSocket

## Phase 5: WARP Integration
- [ ] WARP account registration
- [ ] WARP+ license support
- [ ] WARP endpoint switcher
- [ ] Amnezia WARP mode
- [ ] WARP Noise protocol

## Phase 6: Advanced Features
- [ ] Per-ISP clean IP optimization
- [ ] DNS encryption (DoH, DoT)
- [ ] Routing rules (GeoIP, GeoSite)
- [ ] AdBlock / PornBlock / Malware blocking
- [ ] IPv6 support
- [ ] NAT64 transition support

## Phase 7: Multi-Language & UX
- [x] Bilingual documentation (English + فارسی)
- [ ] RTL layout for Persian UI
- [ ] Guided setup wizard (/install)
- [ ] Backup & Restore (export/import settings)
- [ ] Daily traffic charts with upload/download split
- [ ] Log viewer
- [ ] JSON config editor

## Phase 8: Fleet Management
- [ ] Central management API
- [ ] Multi-instance fleet stats
- [ ] Broadcast messages to all instances
- [ ] Instance heartbeat monitoring
- [ ] Kill switch (global pause/resume)
- [ ] Self-healing domain pool

## Phase 9: Client Support
- [ ] Clash/Mihomo direct link
- [ ] sing-box direct link
- [ ] V2RayNG / Nekobox optimized links
- [ ] Quantumult X support
- [ ] Loon / Surge support
- [ ] QR code generation for all formats

---

## Adding New Features

To add a new feature to XrayMOD:

### 1. Protocol Features
Add new protocol support in `worker/proxy/`:
- Create a new handler file (e.g., `grpc.ts`)
- Implement the protocol parsing and handling
- Register the protocol in `worker/schema.ts`

### 2. API Endpoints
Add new API routes in `worker/api/`:
- Create a new handler file
- Add route matching in `worker/router.ts`
- Update the types in `worker/types.ts`

### 3. UI Features
Add new UI components in `src/`:
- Create new components using shadcn/ui
- Add new tabs/views in `src/App.tsx`
- Update the navigation in the sidebar

### 4. Deployment Features
Extend the wizard in `wizard/`:
- Modify `wizard/index.ts` for new deployment options
- Update the wizard UI for new settings

### 5. Documentation
Update documentation:
- `README.md` — Installation and usage guides
- `ROADMAP.md` — This file
- `PROTOCOLS.md` — Protocol documentation

---

## Version History

### v1.0.0 (Current)
- Initial release
- Core proxy engine (VLESS, Trojan, Shadowsocks)
- Admin and user panels
- Wizard installer
- Bilingual documentation

### v1.1.0 (Planned)
- ECH and TLS fragment support
- gRPC transport
- Enhanced subscription formats

### v1.2.0 (Planned)
- External server bridge
- Telegram bot integration
- TON wallet support
