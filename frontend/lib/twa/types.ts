/** Shared domain types for the Telegram Mini App (manager-scoped). */

export type ManagerRole = 'owner' | 'sponsor';

export type Currency = 'DAI' | 'GRAM' | 'STARS';

export interface Manager {
  id: string;
  role: ManagerRole;
  name: string;
  logoUrl?: string;
  welcomeText: string;
  invitePath: string;
  sponsorProfitPct?: number;
}

export interface Protocol {
  id: string;
  managerId: string;
  name: string;
  port: number;
  status: 'active' | 'paused' | 'error';
  pingMs?: number;
  assignedSite?: string;
  encryption: string;
  priceDai: number;
}

export interface ProxyItem {
  id: string;
  managerId: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  location: string;
  pingMs?: number;
}

export interface ServerNode {
  id: string;
  managerId: string;
  ip: string;
  location: string;
  cpuLoad: number;
  ramLoad: number;
  activeConnections: number;
  domains: { domain: string; dnsOk: boolean }[];
}

export interface Transaction {
  id: string;
  managerId: string;
  date: string;
  amount: number;
  currency: Currency;
  type: 'topup' | 'withdraw' | 'purchase' | 'profit';
  status: 'ok' | 'pending' | 'failed';
}

export interface UserSubscription {
  remainingGb: number;
  totalGb: number;
  expiresAt: string;
}

export interface WalletBalances {
  stars: number;
  gram: number;
  dai: number;
}
