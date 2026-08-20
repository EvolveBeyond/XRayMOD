'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

export type Lang = 'en';

const dict = {
  appName: 'XrayMOD',
  dashboard: 'Dashboard',
  admin: 'Admin',
  wizard: 'Wizard',
  users: 'Users',
  nodes: 'Nodes',
  config: 'Config',
  protocols: 'Protocols',
  cleanip: 'Edge endpoints',
  lab: 'Advanced Lab',
  network: 'Network',
  settings: 'Settings',
  stealth: 'Origin protection',
  support: 'Support',
  logout: 'Logout',
  login: 'Sign in',
  username: 'Username',
  password: 'Password',
  signIn: 'Sign in',
  overview: 'System overview & quick actions',
  manageUsers: 'Manage users',
  scanClean: 'Scan edge endpoints',
  systemInfo: 'System info',
  traffic: 'Traffic',
  language: 'Language',
  copy: 'Copy',
  copied: 'Copied',
  subLink: 'Subscription',
  recommended: 'Recommended: VLESS + WebSocket + TLS on port 443',
  save: 'Save',
  active: 'Active',
  total: 'Total',
  todayTraffic: 'Today traffic',
  monthTraffic: 'Monthly traffic',
  status: 'Status',
  version: 'Version',
  uptime: 'Uptime',
  storage: 'Storage',
  configured: 'Configured',
  yes: 'Yes',
  no: 'No',
  addUser: 'Add user',
  search: 'Search...',
  delete: 'Delete',
  edit: 'Edit',
  enable: 'Enable',
  disable: 'Disable',
  resetQuota: 'Reset quota',
  trafficLimit: 'Traffic limit (GB)',
  expiryDays: 'Expiry (days)',
  email: 'Email',
  actions: 'Actions',
  noData: 'No data',
  loading: 'Loading...',
  scan: 'Start scan',
  stop: 'Stop',
  applyBest: 'Apply best',
  remove: 'Remove',
  hosts: 'Hosts',
  protocol: 'Protocol',
  path: 'Path',
  security: 'Security',
  ech: 'ECH',
  fragment: 'TLS Fragment',
  mixedProtocol: 'Mixed protocol',
  paused: 'Pause service',
  saveSuccess: 'Saved',
  changePassword: 'Change password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmPassword: 'Confirm password',
  twoFA: 'Two-factor auth',
  backup: 'Backup',
  export: 'Export',
  import: 'Import',
  reset: 'Reset',
  supportTitle: 'Support',
  supportDesc: 'Questions or issues? Message us on Telegram.',
  openTelegram: 'Open Telegram',
  telegramId: '@MRROBOT_DT',
  quickTips: 'Quick tips',
  tip1: 'Best config: VLESS + WS + TLS',
  tip2: 'Import sub in Hiddify / v2rayNG',
  tip3: 'Keep your panel URL private',
  addNode: 'Add server',
  name: 'Name',
  ip: 'IP',
  online: 'Online',
  offline: 'Offline',
  createConfig: 'Create recommended config',
  subFormats: 'Sub formats',
  base64: 'Base64',
  raw: 'Raw',
  clash: 'Clash',
  htmlPage: 'HTML page',
  routing: 'Routing',
  dns: 'DNS',
  warp: 'WARP',
  ipv6: 'IPv6',
  advanced: 'Advanced',
  walletSoon: 'Coming soon',
  walletDesc: 'Financial module is not available in this build',
} as const;

export type DictKey = keyof typeof dict;

type I18nCtx = {
  lang: Lang;
  t: (key: DictKey) => string;
  dir: 'ltr';
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }, []);

  const t = useCallback((key: DictKey) => dict[key] || key, []);

  const value = useMemo(() => ({ lang: 'en' as Lang, t, dir: 'ltr' as const }), [t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      lang: 'en' as Lang,
      t: (k: DictKey) => dict[k] || k,
      dir: 'ltr' as const,
    };
  }
  return ctx;
}
