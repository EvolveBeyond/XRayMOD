'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type TwaLang = 'fa' | 'en' | 'ru' | 'pt' | 'tr' | 'zh';

const RTL: TwaLang[] = ['fa'];

type Dict = Record<string, string>;

const baseEn: Dict = {
  home: 'Home',
  store: 'Store',
  wallet: 'Wallet',
  profile: 'Profile',
  proxies: 'Proxies',
  protocols: 'Protocols',
  admin: 'Admin',
  userMode: 'User mode',
  adminMode: 'Admin mode',
  invalidInvite: 'Invalid invite',
  invalidInviteDesc: 'Open the Mini App from a manager invite link (?ref=…).',
  remainingVolume: 'Remaining volume',
  expiry: 'Expiry',
  quickActions: 'Quick actions',
  generateSub: 'Generate Sub',
  buyServer: 'Buy server',
  cleanIp: 'Clean IP checker',
  checking: 'Checking…',
  cleanFound: 'Clean IP found',
  externalIp: 'External IP',
  testPing: 'Test ping',
  inviteLinks: 'My invite links',
  copyInvite: 'Copy invite',
  language: 'Language',
  activeProtocols: 'Active protocols',
  subordinates: 'Subordinates profit',
  serverHealth: 'Server health',
  revenue: 'Revenue',
  createProtocol: 'Create protocol',
  runTest: 'Run test',
  pricing: 'Pricing (DAI)',
  sponsorProfit: 'Sponsor profit %',
  loading: 'Loading…',
  search: 'Search…',
  noData: 'No data',
  scopedNote: 'All data is scoped to this manager invite.',
};

const dict: Record<TwaLang, Dict> = {
  en: baseEn,
  fa: {
    ...baseEn,
    home: 'خانه',
    store: 'فروشگاه',
    wallet: 'کیف پول',
    profile: 'پروفایل',
    proxies: 'پروکسی‌ها',
    protocols: 'پروتکل‌ها',
    admin: 'مدیریت',
    userMode: 'حالت کاربر',
    adminMode: 'حالت ادمین',
    invalidInvite: 'لینک دعوت نامعتبر',
    invalidInviteDesc: 'مینی‌اپ را فقط از لینک دعوت مدیر باز کنید (?ref=…).',
    remainingVolume: 'حجم باقی‌مانده',
    expiry: 'انقضا',
    quickActions: 'اقدام سریع',
    generateSub: 'ساخت ساب',
    buyServer: 'خرید سرور',
    cleanIp: 'بررسی آی‌پی تمیز',
    checking: 'در حال بررسی…',
    cleanFound: 'آی‌پی تمیز پیدا شد',
    externalIp: 'آی‌پی خارجی',
    testPing: 'تست پینگ',
    inviteLinks: 'لینک‌های دعوت من',
    copyInvite: 'کپی دعوت',
    language: 'زبان',
    activeProtocols: 'پروتکل‌های فعال',
    subordinates: 'سود زیرمجموعه',
    serverHealth: 'سلامت سرور',
    revenue: 'درآمد',
    createProtocol: 'ساخت پروتکل',
    runTest: 'اجرای تست',
    pricing: 'قیمت (DAI)',
    sponsorProfit: 'سود اسپانسر ٪',
    loading: 'در حال بارگذاری…',
    search: 'جستجو…',
    noData: 'داده‌ای نیست',
    scopedNote: 'همه داده‌ها فقط در محدودهٔ همین دعوت‌کننده است.',
  },
  ru: {
    ...baseEn,
    home: 'Главная',
    store: 'Магазин',
    wallet: 'Кошелёк',
    profile: 'Профиль',
    invalidInvite: 'Недействительное приглашение',
    remainingVolume: 'Остаток трафика',
    generateSub: 'Создать Sub',
    cleanIp: 'Чистый IP',
    language: 'Язык',
    protocols: 'Протоколы',
    scopedNote: 'Все данные ограничены этим менеджером.',
  },
  pt: {
    ...baseEn,
    home: 'Início',
    store: 'Loja',
    wallet: 'Carteira',
    profile: 'Perfil',
    invalidInvite: 'Convite inválido',
    remainingVolume: 'Volume restante',
    generateSub: 'Gerar Sub',
    language: 'Idioma',
    protocols: 'Protocolos',
    scopedNote: 'Todos os dados são do gestor do convite.',
  },
  tr: {
    ...baseEn,
    home: 'Ana sayfa',
    store: 'Mağaza',
    wallet: 'Cüzdan',
    profile: 'Profil',
    invalidInvite: 'Geçersiz davet',
    remainingVolume: 'Kalan kota',
    generateSub: 'Sub oluştur',
    language: 'Dil',
    protocols: 'Protokollar',
    scopedNote: 'Tüm veriler bu davet yöneticisine aittir.',
  },
  zh: {
    ...baseEn,
    home: '首页',
    store: '商店',
    wallet: '钱包',
    profile: '我的',
    invalidInvite: '邀请无效',
    remainingVolume: '剩余流量',
    generateSub: '生成订阅',
    language: '语言',
    protocols: '协议',
    scopedNote: '所有数据均限定于该邀请管理员。',
  },
};

type Ctx = {
  lang: TwaLang;
  setLang: (l: TwaLang) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
};

const TwaI18nContext = createContext<Ctx | null>(null);

export function TwaI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<TwaLang>('fa');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('xraymod-twa-lang') as TwaLang | null;
      if (saved && dict[saved]) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((l: TwaLang) => {
    setLangState(l);
    try {
      localStorage.setItem('xraymod-twa-lang', l);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
      document.documentElement.dir = RTL.includes(l) ? 'rtl' : 'ltr';
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback(
    (key: string) => dict[lang][key] || dict.en[key] || key,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, dir: (RTL.includes(lang) ? 'rtl' : 'ltr') as 'rtl' | 'ltr' }),
    [lang, setLang, t]
  );

  return createElement(TwaI18nContext.Provider, { value }, children);
}

export function useTwaI18n() {
  const ctx = useContext(TwaI18nContext);
  if (!ctx) throw new Error('useTwaI18n outside provider');
  return ctx;
}

export const TWA_LANG_OPTIONS: { id: TwaLang; label: string }[] = [
  { id: 'fa', label: 'فارسی' },
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'pt', label: 'Português' },
  { id: 'tr', label: 'Türkçe' },
  { id: 'zh', label: '中文' },
];
