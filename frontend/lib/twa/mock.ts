import type {
  Manager,
  Protocol,
  ProxyItem,
  ServerNode,
  Transaction,
  UserSubscription,
  WalletBalances,
} from './types';

export const MOCK_MANAGERS: Record<string, Manager> = {
  owner_demo: {
    id: 'owner_demo',
    role: 'owner',
    name: 'Niroomand Edge',
    welcomeText: 'به پنل اختصاصی خوش آمدید — پروتکل‌ها و قیمت‌ها فقط از این مدیر.',
    invitePath: '?ref=owner_demo',
    sponsorProfitPct: 20,
  },
  sponsor_demo: {
    id: 'sponsor_demo',
    role: 'sponsor',
    name: 'Pakrohk Nodes',
    welcomeText: 'Welcome — servers & store scoped to this sponsor invite.',
    invitePath: '?ref=sponsor_demo',
    sponsorProfitPct: 15,
  },
};

export const MOCK_PROTOCOLS: Protocol[] = [
  {
    id: 'p1',
    managerId: 'owner_demo',
    name: 'VLESS-WS-443',
    port: 443,
    status: 'active',
    pingMs: 42,
    assignedSite: 'cdn.example.com',
    encryption: 'none',
    priceDai: 2.5,
  },
  {
    id: 'p2',
    managerId: 'owner_demo',
    name: 'Trojan-TLS',
    port: 8443,
    status: 'active',
    pingMs: 58,
    assignedSite: 'edge.example.com',
    encryption: 'tls',
    priceDai: 3.0,
  },
  {
    id: 'p3',
    managerId: 'sponsor_demo',
    name: 'VLESS-XHTTP',
    port: 443,
    status: 'paused',
    pingMs: 91,
    encryption: 'reality',
    priceDai: 1.8,
  },
];

export const MOCK_PROXIES: ProxyItem[] = [
  {
    id: 'x1',
    managerId: 'owner_demo',
    name: 'DE-FRA-01',
    host: 'fra1.example.com',
    port: 443,
    protocol: 'vless',
    location: 'Frankfurt',
    pingMs: 38,
  },
  {
    id: 'x2',
    managerId: 'owner_demo',
    name: 'NL-AMS-02',
    host: 'ams2.example.com',
    port: 443,
    protocol: 'trojan',
    location: 'Amsterdam',
    pingMs: 45,
  },
  {
    id: 'x3',
    managerId: 'sponsor_demo',
    name: 'TR-IST-01',
    host: 'ist1.example.com',
    port: 8443,
    protocol: 'vless',
    location: 'Istanbul',
    pingMs: 62,
  },
];

export const MOCK_SERVERS: ServerNode[] = [
  {
    id: 's1',
    managerId: 'sponsor_demo',
    ip: '185.18.10.22',
    location: 'Helsinki',
    cpuLoad: 0.42,
    ramLoad: 0.61,
    activeConnections: 128,
    domains: [
      { domain: 'a.example.com', dnsOk: true },
      { domain: 'b.example.com', dnsOk: false },
    ],
  },
];

export const MOCK_TX: Transaction[] = [
  {
    id: 't1',
    managerId: 'owner_demo',
    date: '2026-08-08',
    amount: 12,
    currency: 'DAI',
    type: 'purchase',
    status: 'ok',
  },
  {
    id: 't2',
    managerId: 'owner_demo',
    date: '2026-08-07',
    amount: 500,
    currency: 'STARS',
    type: 'topup',
    status: 'ok',
  },
];

export const MOCK_USER_SUB: UserSubscription = {
  remainingGb: 42.5,
  totalGb: 100,
  expiresAt: '2026-09-15',
};

export const MOCK_WALLET: WalletBalances = {
  stars: 1200,
  gram: 3.4,
  dai: 18.75,
};

export const DAI_TO_STARS = 85;
