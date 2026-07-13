# Nova-Proxy Feature Catalog — Complete (92 Features)

**Source**: `worker/nova-worker.js` (9226 lines)
**Purpose**: Build XRayMOD UI covering ALL these features

---

## STATUS: [ ] = todo, [x] = done

### A. Core Proxy (8 features)
- [ ] VLESS protocol parser (UUID, TCP/UDP, address types)
- [ ] Trojan protocol parser (SHA-224 password, SOCKS5 commands)
- [ ] Shadowsocks AEAD (aes-128-gcm, aes-256-gcm, key derivation)
- [ ] WebSocket transport (upgrade, early-data, explicit transfer queue)
- [ ] TCP forwarding (direct, proxy-IP, SOCKS5/HTTP/HTTPS/TURN/SSTP)
- [ ] UDP/DNS forwarding
- [ ] Upload queue system (coalescing, overflow protection, retry)
- [ ] Download grain sender (buffering, adaptive flush)

### B. TLS Client (3 features)
- [ ] TLS 1.2/1.3 full client implementation
- [ ] Cipher suites: AES-GCM, ChaCha20-Poly1305
- [ ] Key exchange: X25519, P-256

### C. WARP/WireGuard (7 features)
- [ ] Account registration (X25519 keypair, CF API)
- [ ] License activation
- [ ] WireGuard config generation (URI, .conf)
- [ ] Random endpoint generation
- [ ] WoW (WireGuard over WireGuard) mode
- [ ] AmneziaWG mode
- [ ] Sing-box outbound generation

### D. Subscription System (8 features)
- [ ] Base64 URI list generation
- [ ] Clash/Mihomo YAML with hot-patching
- [ ] sing-box JSON with hot-patching
- [ ] Surge format
- [ ] ECH injection
- [ ] gRPC User-Agent patching
- [ ] DNS block prepend
- [ ] WARP proxy injection

### E. Network Settings (35 fields)
- [ ] enableRouting, enableGeoIP, enableGeoSite
- [ ] enableAdBlock, enablePornBlock, enableDomesticBypass
- [ ] enableDoH, dohProvider, enableLocalDNS
- [ ] enableAntiSanctionDNS, enableFakeDNS
- [ ] enableIPv6, allowLAN, logLevel
- [ ] enableWarp, warpCalls, warpMode, warpEndpoint
- [ ] warpAmnezia, warpNoise, customRules
- [ ] TCP并发拨号数, 预加载竞速拨号

### F. Admin Panel API (25+ endpoints)
- [ ] /admin/config.json (GET/POST)
- [ ] /admin/cf.json (GET/POST)
- [ ] /admin/tg.json (GET/POST)
- [ ] /admin/network-settings.json (GET/POST)
- [ ] /admin/users.json (GET/POST)
- [ ] /admin/warp.json (GET/POST)
- [ ] /admin/system.json (GET)
- [ ] /admin/log.json (GET)
- [ ] /admin/domain-health.json (GET)
- [ ] /admin/usage-data (GET)
- [ ] /admin/sub-content (GET)
- [ ] /admin/singbox-preview (GET)
- [ ] /admin/bestip (GET)
- [ ] /admin/security/* (password, 2FA)
- [ ] /admin/self-update.json (POST)
- [ ] /admin/user-reset (POST)
- [ ] /admin/cf-usage-setup (POST)
- [ ] /admin/check (POST)
- [ ] /admin/init (POST)
- [ ] /admin/ADD.txt (GET/POST)
- [ ] /admin/last-error.json (GET)
- [ ] /admin/update-check.json (GET)
- [ ] /admin/whoami (GET)
- [ ] /admin/central/* (stats, announcement)

### G. Clean IP System (5 features)
- [ ] Iranian carrier detection (MTN/MCI/Rightel/Shatel)
- [ ] Chinese ISP detection (CT/CU/CMCC)
- [ ] Random CF IP generation from CIDR
- [ ] Multi-source IP aggregation
- [ ] IP pool with health scoring

### H. Telegram Bot (15 commands)
- [ ] /start, /menu — main inline keyboard
- [ ] /sub — subscription link
- [ ] /status — uptime, UUID, host, CF usage
- [ ] /config — protocol, transport, security flags
- [ ] /sethost, /setpath, /setname — config changes
- [ ] /hosts — domain pool with health icons
- [ ] /addhost, /delhost — pool management
- [ ] /pause, /resume — emergency stop
- [ ] /setwebhook — webhook setup
- [ ] /install — CF deployment wizard
- [ ] /myid — chat ID
- [ ] /help — command reference

### I. Security (5 features)
- [ ] HMAC-SHA256 session tokens (24h expiry)
- [ ] Rate limiting (8 attempts/10min, 15min block)
- [ ] TOTP 2FA (Google Authenticator compatible)
- [ ] Timing-safe string comparison
- [ ] Telegram login tokens (5-min buckets)

### J. Radar/Clean IP Scanner (1 feature, complex)
- [ ] Full SPA with bilingual UI (EN/FA)
- [ ] Dark/light theme toggle
- [ ] IP scanning engine (12 workers, 2s timeout, 3 probes)
- [ ] Metrics: latency, jitter, packet loss
- [ ] Scoring algorithm
- [ ] Port selector (443, 8443, 2053, 2083, 2087, 2096)
- [ ] Apply button (token-gated)

### K. Backend Mode (6 features)
- [ ] WebSocket relay to external Xray
- [ ] HTTP relay for xhttp/gRPC
- [ ] Path exclusion for internal routes
- [ ] Per-user usage tracking
- [ ] Backend diagnostics (/backend-test)
- [ ] Configuration via network-settings

### L. Other Features (10 features)
- [ ] DoH proxy (7 providers)
- [ ] Domain health checking
- [ ] Scheduled maintenance
- [ ] Usage tracking (per-day, per-month, per-user)
- [ ] Request logging (D1 + KV)
- [ ] Telegram alerts for requests
- [ ] Self-update mechanism
- [ ] HTML camouflage (nginx, 1101 pages)
- [ ] Cloudflare usage API
- [ ] Central server hooks

---

## UI Pages Needed

| Page | Features | Priority |
|------|----------|----------|
| Dashboard | Status, uptime, traffic, quick actions | P0 |
| Config | Protocol, host, path, transport, TLS | P0 |
| Users | Multi-user management, quotas | P0 |
| Network | Routing, DNS, WARP, IPv6 | P0 |
| Subscriptions | Preview, format selection | P0 |
| Clean IP | Radar scanner, IP pool | P0 |
| Security | Password, 2FA, sessions | P0 |
| Telegram | Bot config, commands | P1 |
| WARP | Account, license, endpoints | P1 |
| Logs | Request logs, error logs | P1 |
| Settings | System info, update, backup | P1 |
| Backend | Mode config, diagnostics | P2 |
