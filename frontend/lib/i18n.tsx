'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'fa' | 'en';

const dict = {
  fa: {
    appName: 'XrayMOD',
    dashboard: 'داشبورد',
    admin: 'مدیریت',
    wizard: 'ویزارد',
    users: 'کاربران',
    nodes: 'سرورها',
    config: 'کانفیگ',
    protocols: 'پروتکل‌ها',
    cleanip: 'نقاط لبه',
    lab: 'لَب پیشرفته',
    network: 'شبکه',
    settings: 'تنظیمات',
    stealth: 'حفاظت مبدأ',
    support: 'پشتیبانی',
    logout: 'خروج',
    login: 'ورود',
    username: 'نام کاربری',
    password: 'رمز عبور',
    signIn: 'ورود به پنل',
    overview: 'نمای کلی سیستم و دسترسی سریع',
    manageUsers: 'مدیریت کاربران',
    scanClean: 'اسکن نقاط لبه',
    systemInfo: 'اطلاعات سیستم',
    traffic: 'ترافیک',
    language: 'زبان',
    copy: 'کپی',
    copied: 'کپی شد',
    subLink: 'لینک سابسکریپشن',
    recommended: 'پیشنهادی: VLESS + WebSocket + TLS روی پورت ۴۴۳',
    save: 'ذخیره',
    active: 'فعال',
    total: 'کل',
    todayTraffic: 'ترافیک امروز',
    monthTraffic: 'ترافیک ماه',
    status: 'وضعیت',
    version: 'نسخه',
    uptime: 'آپ‌تایم',
    storage: 'ذخیره‌سازی',
    configured: 'پیکربندی',
    yes: 'بله',
    no: 'خیر',
    addUser: 'افزودن کاربر',
    search: 'جستجو...',
    delete: 'حذف',
    edit: 'ویرایش',
    enable: 'فعال',
    disable: 'غیرفعال',
    resetQuota: 'ریست حجم',
    trafficLimit: 'سقف ترافیک (GB)',
    expiryDays: 'اعتبار (روز)',
    email: 'ایمیل',
    actions: 'عملیات',
    noData: 'داده‌ای نیست',
    loading: 'در حال بارگذاری...',
    scan: 'شروع اسکن',
    stop: 'توقف',
    applyBest: 'اعمال بهترین',
    remove: 'حذف',
    hosts: 'هاست‌ها',
    protocol: 'پروتکل',
    path: 'مسیر',
    security: 'امنیت',
    ech: 'ECH',
    fragment: 'TLS Fragment',
    mixedProtocol: 'پروتکل ترکیبی',
    paused: 'توقف سرویس',
    saveSuccess: 'ذخیره شد',
    changePassword: 'تغییر رمز',
    currentPassword: 'رمز فعلی',
    newPassword: 'رمز جدید',
    confirmPassword: 'تکرار رمز',
    twoFA: 'احراز دو مرحله‌ای',
    backup: 'پشتیبان‌گیری',
    export: 'خروجی',
    import: 'ورود',
    reset: 'بازنشانی',
    supportTitle: 'ارتباط با پشتیبانی',
    supportDesc: 'سوال، مشکل یا پیشنهاد؟ از تلگرام پیام بده.',
    openTelegram: 'چت در تلگرام',
    telegramId: '@MRROBOT_DT',
    quickTips: 'نکات سریع',
    tip1: 'بهترین کانفیگ: VLESS + WS + TLS',
    tip2: 'ساب را در Hiddify / v2rayNG وارد کن',
    tip3: 'لینک پنل را فقط خودت داشته باش',
    addNode: 'افزودن سرور',
    name: 'نام',
    ip: 'آی‌پی',
    online: 'آنلاین',
    offline: 'آفلاین',
    createConfig: 'ساخت کانفیگ پیشنهادی',
    subFormats: 'فرمت‌های ساب',
    base64: 'Base64',
    raw: 'خام',
    clash: 'Clash',
    htmlPage: 'صفحه HTML',
    routing: 'مسیریابی',
    dns: 'DNS',
    warp: 'WARP',
    ipv6: 'IPv6',
    advanced: 'پیشرفته',
    walletSoon: 'به‌زودی',
    walletDesc: 'ماژول مالی در این نسخه در دسترس نیست',
  },
  en: {
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
  },
} as const;

export type DictKey = keyof typeof dict.fa;

type I18nCtx = {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (l: Lang) => void;
  dir: 'rtl' | 'ltr';
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fa');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('xraymod_lang') as Lang | null;
      if (saved === 'fa' || saved === 'en') setLangState(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('xraymod_lang', l);
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: DictKey) => dict[lang][key] || dict.en[key] || key,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, t, setLang, dir: (lang === 'fa' ? 'rtl' : 'ltr') as 'rtl' | 'ltr' }),
    [lang, t, setLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      lang: 'fa' as Lang,
      t: (k: DictKey) => dict.fa[k] || k,
      setLang: (_l: Lang) => {},
      dir: 'rtl' as const,
    };
  }
  return ctx;
}

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={`inline-flex rounded-lg border border-[var(--stroke-strong)] bg-[var(--bg)] p-0.5 text-[11px] font-semibold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('fa')}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          lang === 'fa'
            ? 'bg-[var(--accent)] text-[#041414]'
            : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
        }`}
      >
        FA
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          lang === 'en'
            ? 'bg-[var(--accent)] text-[#041414]'
            : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
