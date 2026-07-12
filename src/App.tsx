import React, { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  Activity, 
  Server, 
  Users, 
  Settings, 
  Plus, 
  Zap, 
  Globe, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  User as UserIcon,
  LogOut,
  QrCode,
  Download,
  Copy,
  LayoutDashboard,
  Cpu,
  Database,
  Wifi,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  AlertCircle,
  Wallet,
  Gift,
  CreditCard,
  ArrowUpRight,
  Coins,
  Share2,
  TrendingUp,
  ShoppingCart,
  Lock,
  Radar,
  Scan,
  Network
} from 'lucide-react';

// Telegram Mini App & TON Wallet — disabled by default on Cloudflare Workers
// Enable via admin Settings → Integrations when external server is configured
// import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
// import WebApp from '@twa-dev/sdk';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "motion/react";

import { DEFAULT_PROTOCOLS, ProtocolDefinition, ProtocolField, generateConfig } from './lib/protocol-utils';

// --- Types ---
interface Node {
  id: number;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  cpu: number;
  ram: number;
  users: number;
  uptime: string;
  purchasePrice?: number; // Price to buy the whole node
}

interface User {
  id: number;
  username: string;
  email: string;
  used: number;
  limit: number;
  status: 'active' | 'expired' | 'disabled';
  expiry: string;
  isContributionMode?: boolean; // If user provides domain/node
}

interface UserConfig {
  id: number;
  name: string;
  protocolId: string;
  nodeId: number;
  used: number;
  link: string;
  clientLimit?: number; // Max concurrent clients
}

// --- Backend API Service ---
const API_BASE = (window as any).__API_BASE || '';
const api = (path: string) => `${API_BASE}${path}`;
const FETCH_OPTS: RequestInit = { credentials: 'include' };

const API = {
  getNodes: async (): Promise<Node[]> => {
    try {
      const res = await fetch(api('/api/nodes'), FETCH_OPTS);
      const data = await res.json() as { success: boolean; data?: Node[] };
      return data.data || [];
    } catch {
      return [];
    }
  },
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(api('/api/users'), FETCH_OPTS);
      const data = await res.json() as { success: boolean; data?: User[] };
      return data.data || [];
    } catch {
      return [];
    }
  },
  getProtocols: async (): Promise<ProtocolDefinition[]> => {
    try {
      const res = await fetch(api('/api/protocols'), FETCH_OPTS);
      const data = await res.json() as { success: boolean; data?: any[] };
      return (data.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        clientLimit: p.clientLimit,
        clientPrice: p.clientPrice,
        schema: p.schema,
        template: p.template,
      }));
    } catch {
      return DEFAULT_PROTOCOLS;
    }
  },
  getUserConfigs: async (): Promise<UserConfig[]> => {
    try {
      const res = await fetch(api('/api/configs'), FETCH_OPTS);
      const data = await res.json() as { success: boolean; data?: any[] };
      return (data.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        protocolId: c.protocolId,
        nodeId: 1,
        used: 0,
        link: c.link,
        clientLimit: c.clientLimit,
      }));
    } catch {
      return [];
    }
  },
};

// --- Sub-Components ---

const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: { title: string, value: string, subValue: string, icon: any, colorClass: string }) => (
  <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden group">
    <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <p className="text-xs text-zinc-500 mt-1">{subValue}</p>
    </CardContent>
  </Card>
);

const DynamicForm = ({ fields, values, onChange }: { fields: ProtocolField[], values: Record<string, any>, onChange: (name: string, value: any) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {field.label} {field.required && <span className="text-rose-500">*</span>}
          </Label>
          
          {field.type === 'text' || field.type === 'password' || field.type === 'number' ? (
            <Input
              id={field.name}
              type={field.type}
              value={values[field.name] ?? field.default ?? ''}
              onChange={(e) => onChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus:border-emerald-500 transition-colors"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          ) : field.type === 'select' ? (
            <Select 
              value={values[field.name] ?? field.default ?? ''} 
              onValueChange={(val) => onChange(field.name, val)}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === 'boolean' ? (
            <div className="flex items-center space-x-2 h-10">
              <Switch 
                id={field.name} 
                checked={values[field.name] ?? field.default ?? false}
                onCheckedChange={(val) => onChange(field.name, val)}
              />
              <Label htmlFor={field.name} className="text-sm text-zinc-400">Enabled</Label>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  // TON wallet disabled by default — enable via external server
  // const userAddress = useTonAddress();
  const userAddress = null;

  // Telegram Mini App initialization disabled by default on Cloudflare Workers
  // Enable when external server is configured
  
  // Data State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [protocols, setProtocols] = useState<ProtocolDefinition[]>([]);
  const [userConfigs, setUserConfigs] = useState<UserConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect Telegram Mini App
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      setIsTelegramMiniApp(true);
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#09090b');
      tg.setBackgroundColor('#09090b');
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        if (activeTab !== 'dashboard') setActiveTab('dashboard');
      });
    }

    // Check for Telegram login params
    const urlParams = new URLSearchParams(window.location.search);
    const tgChatId = urlParams.get('tg');
    const tgToken = urlParams.get('token');
    if (tgChatId && tgToken) {
      fetch(`${api('/admin')}?chat_id=${tgChatId}&token=${tgToken}`, { credentials: 'include' })
        .then(() => window.location.href = '/')
        .catch(() => {});
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [n, u, p, c] = await Promise.all([
          API.getNodes(),
          API.getUsers(),
          API.getProtocols(),
          API.getUserConfigs()
        ]);
        setNodes(n);
        setUsers(u);
        setProtocols(p);
        setUserConfigs(c);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Fetch disguise settings for admin
    const fetchSettings = async () => {
      try {
        const res = await fetch(api('/api/settings'), FETCH_OPTS);
        const data = await res.json() as { success: boolean; data?: Record<string, string> };
        if (data.success && data.data) {
          setDisguiseEnabled(data.data['disguise.enabled'] === 'true');
          setDisguiseAdminPath(data.data['disguise.admin_path'] || '');
          setDisguiseLoginPath(data.data['disguise.login_path'] || '');
          setDisguiseSubPath(data.data['disguise.sub_path'] || '');
          setDisguiseFallbackPage(data.data['disguise.fallback_page'] || '1101');
          setEchEnabled(data.data['ech.enabled'] === 'true');
          setEchSni(data.data['ech.sni'] || 'cloudflare-ech.com');
          setEchDns(data.data['ech.dns'] || 'https://dns.alidns.com/dns-query');
          setTlsFragEnabled(data.data['tls_fragment.enabled'] === 'true');
          setTlsFragMode(data.data['tls_fragment.mode'] || 'Shadowrocket');
          setTgBotToken(data.data['tg.bot_token'] || '');
          setTgChatId(data.data['tg.chat_id'] || '');
        }
      } catch {}
    };
    fetchSettings();

    // Fetch clean IP config for admin
    const fetchCleanIPs = async () => {
      try {
        const res = await fetch(api('/api/cleanip/list'), FETCH_OPTS);
        const data = await res.json() as { success: boolean; data?: { ips: string[]; carrier: string } };
        if (data.success && data.data) {
          setCleanIPs(data.data.ips || []);
        }
      } catch {}
    };
    fetchCleanIPs();

    // Fetch backends for admin
    const fetchBackends = async () => {
      try {
        const res = await fetch(api('/api/backends'), FETCH_OPTS);
        const data = await res.json() as { success: boolean; data?: any[] };
        if (data.success && data.data) {
          setBackends(data.data);
        }
      } catch {}
    };
    fetchBackends();
  }, []);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const [userProfile, setUserProfile] = useState({
    displayName: 'Alice',
    email: 'alice@example.com',
    avatar: 'A'
  });

  const [isAddNodeDialogOpen, setIsAddNodeDialogOpen] = useState(false);

  // Form State for Dynamic Config
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolDefinition | null>(null);
  const [configFormValues, setConfigFormValues] = useState<Record<string, any>>({});
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Disguise Settings State
  const [disguiseEnabled, setDisguiseEnabled] = useState(false);
  const [disguiseAdminPath, setDisguiseAdminPath] = useState('');
  const [disguiseLoginPath, setDisguiseLoginPath] = useState('');
  const [disguiseSubPath, setDisguiseSubPath] = useState('');
  const [disguiseFallbackPage, setDisguiseFallbackPage] = useState('1101');

  // Clean IP State
  const [cleanIPs, setCleanIPs] = useState<string[]>([]);
  const [cleanIPScanResults, setCleanIPScanResults] = useState<string[]>([]);
  const [cleanIPISP, setCleanIPISP] = useState({ asn: 0, isp: '', country: '', carrier: 'unknown' });
  const [cleanIPScanning, setCleanIPScanning] = useState(false);

  // Network Settings State
  const [echEnabled, setEchEnabled] = useState(false);
  const [echSni, setEchSni] = useState('cloudflare-ech.com');
  const [echDns, setEchDns] = useState('https://dns.alidns.com/dns-query');
  const [tlsFragEnabled, setTlsFragEnabled] = useState(false);
  const [tlsFragMode, setTlsFragMode] = useState('Shadowrocket');

  // Telegram Bot State
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);

  // Backend/Contribution State
  const [backends, setBackends] = useState<any[]>([]);
  const [backendIP, setBackendIP] = useState('');
  const [backendPort, setBackendPort] = useState('443');

  const handleConfigValueChange = (name: string, value: any) => {
    setConfigFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = (userData: any) => {
    const newUser: User = {
      id: users.length + 1,
      username: userData.username || `user_${Date.now()}`,
      email: userData.email || 'new@example.com',
      status: 'active',
      used: 0,
      limit: Number(userData.limit) || 100,
      expiry: new Date(Date.now() + (userData.expiryDays || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    setUsers([...users, newUser]);
    setIsAddUserDialogOpen(false);
    toast.success(`User ${newUser.username} created successfully`);
  };

  const handleUpdateUser = (userId: number, updates: any) => {
    const processedUpdates = { ...updates };
    if (updates.limit) processedUpdates.limit = Number(updates.limit);
    if (updates.used) processedUpdates.used = Number(updates.used);
    
    setUsers(users.map(u => u.id === userId ? { ...u, ...processedUpdates } : u));
    setEditingUser(null);
    toast.success('User updated successfully');
  };

  const handleDeleteNode = (nodeId: number) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    toast.error('Node deleted');
  };

  const handleAddNode = (nodeData: any) => {
    const newNode: Node = {
      id: nodes.length + 1,
      name: nodeData.name || 'New Server',
      ip: nodeData.ip || '0.0.0.0',
      status: 'online',
      cpu: 0,
      ram: 0,
      users: 0,
      uptime: "0m"
    };
    setNodes([...nodes, newNode]);
    toast.success(`Server ${newNode.name} connected`);
  };

  const handleCreateConfig = () => {
    if (!selectedProtocol) return;
    
    const newConfig: UserConfig = {
      id: userConfigs.length + 1,
      name: configFormValues.name || `Config_${selectedProtocol.name}`,
      protocolId: selectedProtocol.id,
      nodeId: 1,
      used: 0,
      clientLimit: configFormValues.clientLimit || selectedProtocol.clientLimit || 1,
      link: `${selectedProtocol.id}://${btoa(JSON.stringify(configFormValues))}@server.com:443?security=tls#${configFormValues.name || 'NewConfig'}`
    };
    
    setUserConfigs([...userConfigs, newConfig]);
    setIsConfigDialogOpen(false);
    setConfigFormValues({});
    setSelectedProtocol(null);
    toast.success('Configuration generated and saved');
  };

  const handleSaveSettings = async () => {
    try {
      await fetch(api('/api/settings'), {
        ...FETCH_OPTS,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'disguise.enabled': String(disguiseEnabled),
          'disguise.admin_path': disguiseAdminPath,
          'disguise.login_path': disguiseLoginPath,
          'disguise.sub_path': disguiseSubPath,
          'disguise.fallback_page': disguiseFallbackPage,
          'ech.enabled': String(echEnabled),
          'ech.sni': echSni,
          'ech.dns': echDns,
          'tls_fragment.enabled': String(tlsFragEnabled),
          'tls_fragment.mode': tlsFragMode,
          'tg.bot_token': tgBotToken,
          'tg.chat_id': tgChatId,
        }),
      });
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleWithdraw = () => {
    toast.info('Withdrawal request submitted');
  };

  const handleScanCleanIP = async () => {
    setCleanIPScanning(true);
    try {
      const res = await fetch(api('/api/cleanip/scan?count=16'), FETCH_OPTS);
      const data = await res.json() as { success: boolean; data?: { ips: string[]; isp: any } };
      if (data.success && data.data) {
        setCleanIPScanResults(data.data.ips);
        setCleanIPISP(data.data.isp);
        toast.success(`Found ${data.data.ips.length} clean IPs`);
      }
    } catch {
      toast.error('Failed to scan clean IPs');
    } finally {
      setCleanIPScanning(false);
    }
  };

  const handleApplyCleanIP = async () => {
    if (!cleanIPScanResults.length) return;
    try {
      const res = await fetch(api('/api/cleanip/apply'), {
        ...FETCH_OPTS,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: cleanIPScanResults }),
      });
      const data = await res.json() as { success: boolean; data?: { count: number } };
      if (data.success) {
        setCleanIPs(cleanIPScanResults);
        toast.success(`Applied ${data.data?.count || cleanIPScanResults.length} clean IPs`);
      }
    } catch {
      toast.error('Failed to apply clean IPs');
    }
  };

  const handleRegisterBackend = async () => {
    if (!backendIP) return toast.error('Enter VPS IP');
    try {
      const res = await fetch(api('/api/backends'), {
        ...FETCH_OPTS,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vps_ip: backendIP, vps_port: parseInt(backendPort) || 443 }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        toast.success('Backend registered!');
        setBackendIP('');
        // Refresh backends
        const r2 = await fetch(api('/api/backends'), FETCH_OPTS);
        const d2 = await r2.json() as { success: boolean; data?: any[] };
        if (d2.success && d2.data) setBackends(d2.data);
      }
    } catch {
      toast.error('Failed to register backend');
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(assignedRole, profile) => {
      setRole(assignedRole);
      setUserProfile({
        displayName: profile.username,
        email: profile.email || '',
        avatar: profile.username.charAt(0).toUpperCase()
      });
      setIsLoggedIn(true);
      setActiveTab('dashboard');
    }} />;
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 font-sans">
      {/* Navigation Rail / Sidebar (Mobile Bottom, Desktop Left) */}
      <Toaster position="top-right" theme="dark" />
      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 p-6 space-y-8 sticky top-0 h-screen">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Zap className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Xray<span className="text-emerald-500">Mod</span></span>
          </div>

          <nav className="flex-1 space-y-1">
            {role === 'admin' ? (
              <>
                <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
                <NavButton active={activeTab === 'nodes'} onClick={() => setActiveTab('nodes')} icon={Server} label="Nodes" />
                <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Users" />
                <NavButton active={activeTab === 'cleanip'} onClick={() => setActiveTab('cleanip')} icon={Radar} label="Clean IP" />
                <NavButton active={activeTab === 'protocols'} onClick={() => setActiveTab('protocols')} icon={Shield} label="Protocols" />
                <NavButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Wallet} label="Wallet" />
                <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
              </>
            ) : (
              <>
                <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
                <NavButton active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={ShoppingCart} label="Marketplace" />
                <NavButton active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={Gift} label="Referral" />
                <NavButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} icon={CreditCard} label="Payment" />
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserIcon} label="Profile" />
              </>
            )}
          </nav>

          <div className="pt-6 border-t border-zinc-900 space-y-4">
            <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                {role === 'admin' ? <UserIcon size={16} /> : <span className="font-black">{userProfile.avatar}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{role === 'admin' ? 'Administrator' : userProfile.displayName}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{role === 'admin' ? 'Master Access' : 'User Access'}</p>
              </div>
            </div>

            <Button variant="ghost" className="w-full justify-start text-zinc-500 hover:text-rose-400 hover:bg-rose-400/5" onClick={async () => {
              try { await fetch(api('/api/logout'), { method: 'POST' }); } catch {}
              setIsLoggedIn(false);
            }}>
              <LogOut className="mr-3 h-4 w-4" /> Logout
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <Zap className="text-emerald-500 w-5 h-5" />
              <span className="font-black tracking-tighter uppercase">Xray<span className="text-emerald-500">Mod</span></span>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => {
              try { await fetch(api('/api/logout'), { method: 'POST' }); } catch {}
              setIsLoggedIn(false);
            }}><LogOut size={18} /></Button>
          </header>

          <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-8 pb-28 md:pb-10">
            <AnimatePresence mode="wait">
              {role === 'admin' ? (
                <AdminView 
                  activeTab={activeTab} 
                  nodes={nodes} 
                  users={users} 
                  protocols={protocols} 
                  loading={loading}
                  isConfigDialogOpen={isConfigDialogOpen}
                  setIsConfigDialogOpen={setIsConfigDialogOpen}
                  selectedProtocol={selectedProtocol}
                  setSelectedProtocol={setSelectedProtocol}
                  configFormValues={configFormValues}
                  setConfigFormValues={setConfigFormValues}
                  handleConfigValueChange={handleConfigValueChange}
                  handleCreateConfig={handleCreateConfig}
                  handleAddUser={handleAddUser}
                  handleUpdateUser={handleUpdateUser}
                  handleDeleteNode={handleDeleteNode}
                  handleAddNode={handleAddNode}
                  isAddNodeDialogOpen={isAddNodeDialogOpen}
                  setIsAddNodeDialogOpen={setIsAddNodeDialogOpen}
                  handleSaveSettings={handleSaveSettings}
                  handleWithdraw={handleWithdraw}
                  setActiveTab={setActiveTab}
                  userAddress={userAddress}
                  editingUser={editingUser}
                  setEditingUser={setEditingUser}
                  isAddUserDialogOpen={isAddUserDialogOpen}
                  setIsAddUserDialogOpen={setIsAddUserDialogOpen}
                  setProtocols={setProtocols}
                />
              ) : (
                <UserView 
                  activeTab={activeTab}
                  userConfigs={userConfigs} 
                  userAddress={userAddress}
                  handleWithdraw={handleWithdraw}
                  userProfile={userProfile}
                  setUserProfile={setUserProfile}
                />
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <nav className="bg-zinc-950/90 border-t border-zinc-800 flex justify-around px-2 pt-2 pb-6 backdrop-blur-xl">
            {role === 'admin' ? (
              <>
                <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
                <MobileNavButton active={activeTab === 'nodes'} onClick={() => setActiveTab('nodes')} icon={Server} label="Nodes" />
                <MobileNavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Users" />
                <MobileNavButton active={activeTab === 'cleanip'} onClick={() => setActiveTab('cleanip')} icon={Radar} label="Clean IP" />
                <MobileNavButton active={activeTab === 'protocols'} onClick={() => setActiveTab('protocols')} icon={Shield} label="Protocols" />
                <MobileNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
              </>
            ) : (
              <>
                <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
                <MobileNavButton active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={ShoppingCart} label="Market" />
                <MobileNavButton active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={Gift} label="Referral" />
                <MobileNavButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} icon={CreditCard} label="Payment" />
                <MobileNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserIcon} label="Profile" />
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

// --- View Components ---

function AdminView({ 
  activeTab, 
  nodes, 
  users, 
  protocols, 
  loading,
  isConfigDialogOpen,
  setIsConfigDialogOpen,
  selectedProtocol,
  setSelectedProtocol,
  configFormValues,
  setConfigFormValues,
  handleConfigValueChange,
  handleCreateConfig,
  handleAddUser,
  handleUpdateUser,
  handleDeleteNode,
  handleAddNode,
  isAddNodeDialogOpen,
  setIsAddNodeDialogOpen,
  handleSaveSettings,
  handleWithdraw,
  setActiveTab,
  userAddress,
  editingUser,
  setEditingUser,
  isAddUserDialogOpen,
  setIsAddUserDialogOpen,
  setProtocols
}: any) {
  return (
    <motion.div
      key="admin-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black tracking-tight">Overview</h1>
              <p className="text-zinc-500 font-medium">System health and network performance at a glance.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select defaultValue="all" onValueChange={(v) => {
                const el = document.getElementById(`tab-trigger-${v}`);
                if (el) (el as HTMLElement).click();
              }}>
                <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 rounded-xl">
                  <SelectValue placeholder="Switch View" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="all">Full Dashboard</SelectItem>
                  <SelectItem value="stats">System Stats</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full space-y-8">
            <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-2xl hidden">
              <TabsTrigger id="tab-trigger-all" value="all">All</TabsTrigger>
              <TabsTrigger id="tab-trigger-stats" value="stats">Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8 mt-0 outline-none">
              {/* Bento Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={users.length.toString()} subValue="+12% this month" icon={Users} colorClass="bg-emerald-500" />
                <StatCard title="Active Nodes" value={nodes.filter((n: any) => n.status === 'online').length.toString()} subValue="1 node offline" icon={Server} colorClass="bg-blue-500" />
                <StatCard title="Total Traffic" value="4.2 TB" subValue="Across all nodes" icon={Globe} colorClass="bg-amber-500" />
                <StatCard title="Monthly Revenue" value="$1,240" subValue="+8.4% growth" icon={TrendingUp} colorClass="bg-emerald-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity / Nodes Status */}
                <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Node Performance</CardTitle>
                    <CardDescription>Real-time resource usage across your cluster.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {nodes.slice(0, 3).map((node: any) => (
                        <div key={node.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                              <span className="font-bold">{node.name}</span>
                            </div>
                            <span className="text-xs font-mono text-zinc-500">{node.ip}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] uppercase font-black text-zinc-500 tracking-widest">
                                <span>CPU</span>
                                <span>{node.cpu}%</span>
                              </div>
                              <Progress value={node.cpu} className="h-1.5 bg-zinc-800" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] uppercase font-black text-zinc-500 tracking-widest">
                                <span>RAM</span>
                                <span>{node.ram}%</span>
                              </div>
                              <Progress value={node.ram} className="h-1.5 bg-zinc-800" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue & Sales */}
                <Card className="border-zinc-800 bg-zinc-900/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue & Sales</CardTitle>
                    <CardDescription>Financial performance overview.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><TrendingUp size={16} /></div>
                          <div>
                            <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Daily Profit</p>
                            <p className="font-bold">$42.50</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">+12%</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Users size={16} /></div>
                          <div>
                            <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">New Subs</p>
                            <p className="font-bold">18</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">+5</Badge>
                      </div>

                      <div className="pt-4 space-y-2">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Sales Target</p>
                        <div className="flex items-center gap-3">
                          <Progress value={75} className="h-2 flex-1" />
                          <span className="text-xs font-mono">75%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-8 mt-0 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-zinc-800 bg-zinc-900/30">
                  <CardHeader>
                    <CardTitle>Network Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-600 font-mono text-xs">Traffic Map Visualization</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900/30">
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-600 font-mono text-xs">Growth Chart Visualization</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {activeTab === 'nodes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Nodes</h2>
            <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
              <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold" />}>
                <Plus className="mr-2 h-4 w-4" /> Add Server
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Add New Server</DialogTitle>
                  <DialogDescription>Connect a new Xray-core node to your panel.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Server Name</Label>
                    <Input id="node-name" placeholder="e.g. Germany-01" className="bg-zinc-950 border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>IP Address / Domain</Label>
                    <Input id="node-ip" placeholder="1.2.3.4" className="bg-zinc-950 border-zinc-800" />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full bg-emerald-600 font-bold" onClick={() => {
                    const name = (document.getElementById('node-name') as HTMLInputElement)?.value;
                    const ip = (document.getElementById('node-ip') as HTMLInputElement)?.value;
                    handleAddNode({ name, ip });
                    setIsAddNodeDialogOpen(false);
                  }}>Connect Server</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {nodes.map((node: any) => (
              <Card key={node.id} className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all group">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${node.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Server size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{node.name}</h3>
                      <p className="text-xs font-mono text-zinc-500">{node.ip}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-1 max-w-md gap-8">
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">CPU Load</p>
                      <div className="flex items-center gap-3">
                        <Progress value={node.cpu} className="h-2 flex-1" />
                        <span className="text-xs font-mono w-8">{node.cpu}%</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Users</p>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-zinc-500" />
                        <span className="font-bold">{node.users}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" onClick={() => toast.info(`Editing node: ${node.name}`)}><Edit3 size={18} /></Button>
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-rose-500" onClick={() => handleDeleteNode(node.id)}><Trash2 size={18} /></Button>
                    <Button variant="outline" className="border-zinc-800 rounded-xl" onClick={() => toast.info(`Opening terminal for ${node.ip}...`)}>Terminal</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Users</h2>
            <div className="flex gap-2">
              <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold" />}>
                  <Plus className="mr-2 h-4 w-4" /> Create Config
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Create New Configuration</DialogTitle>
                    <DialogDescription>Select a protocol and fill in the details. The UI adapts to the protocol schema.</DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Config Name</Label>
                        <Input 
                          placeholder="e.g. My Phone" 
                          className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                          value={configFormValues.name || ''}
                          onChange={(e) => handleConfigValueChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Client Limit</Label>
                        <Input 
                          type="number"
                          placeholder="1" 
                          className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                          value={configFormValues.clientLimit || (selectedProtocol?.clientLimit || 1)}
                          onChange={(e) => handleConfigValueChange('clientLimit', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Protocol</Label>
                      <Select onValueChange={(id) => {
                        const p = protocols.find(p => p.id === id);
                        setSelectedProtocol(p || null);
                        setConfigFormValues({});
                      }}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                          <SelectValue placeholder="Choose a protocol..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {protocols.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProtocol && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 border-t border-zinc-800 pt-6"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <Shield size={16} />
                          </div>
                          <h4 className="font-bold text-sm">Protocol Fields</h4>
                        </div>
                        <DynamicForm 
                          fields={selectedProtocol.schema.fields} 
                          values={configFormValues} 
                          onChange={handleConfigValueChange} 
                        />
                      </motion.div>
                    )}
                  </div>

                  <DialogFooter className="pt-4 border-t border-zinc-800">
                    <Button variant="ghost" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8" 
                      disabled={!selectedProtocol}
                      onClick={handleCreateConfig}
                    >
                      Generate & Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger render={<Button variant="outline" className="border-zinc-800 rounded-xl font-bold" />}>
                  <Users className="mr-2 h-4 w-4" /> New User
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new account for your client.</DialogDescription>
                  </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input id="new-username" placeholder="e.g. john_doe" className="bg-zinc-950 border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input id="new-email" type="email" placeholder="john@example.com" className="bg-zinc-950 border-zinc-800" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Data Limit (GB)</Label>
                          <Input id="new-limit" type="number" defaultValue={100} className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Days</Label>
                          <Input id="new-expiry" type="number" defaultValue={30} className="bg-zinc-950 border-zinc-800" />
                        </div>
                      </div>
                    </div>
                  <DialogFooter>
                    <Button className="w-full bg-emerald-600 font-bold" onClick={() => {
                      const username = (document.getElementById('new-username') as HTMLInputElement)?.value;
                      const email = (document.getElementById('new-email') as HTMLInputElement)?.value;
                      const limit = (document.getElementById('new-limit') as HTMLInputElement)?.value;
                      const expiryDays = parseInt((document.getElementById('new-expiry') as HTMLInputElement)?.value);
                      handleAddUser({ username, email, limit, expiryDays });
                    }}>Create Account</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/30">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">User</TableHead>
                  <TableHead className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                  <TableHead className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Usage</TableHead>
                  <TableHead className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Expiry</TableHead>
                  <TableHead className="text-right text-zinc-500 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                          {user.username[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{user.username}</span>
                          <span className="text-[10px] text-zinc-500">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        user.status === 'expired' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                        'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }>
                        {user.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 w-40">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                          <span>{user.used} GB</span>
                          <span>{user.limit} GB</span>
                        </div>
                        <Progress value={(user.used / user.limit) * 100} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-400">{user.expiry}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger 
                          render={
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5"
                              onClick={() => setEditingUser(user)}
                            />
                          }
                        >
                          Manage
                        </DialogTrigger>
                        {editingUser && (
                          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                            <DialogHeader>
                              <DialogTitle>Manage User: {editingUser.username}</DialogTitle>
                              <DialogDescription>Update subscription and account status.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${editingUser.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <div>
                                    <p className="font-bold">Account Status</p>
                                    <p className="text-xs text-zinc-500">Currently {editingUser.status}</p>
                                  </div>
                                </div>
                                <Switch defaultChecked={editingUser.status === 'active'} />
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Adjust Data Limit (GB)</Label>
                                  <Input id="edit-limit" type="number" defaultValue={editingUser.limit} className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Extend Expiry Date</Label>
                                  <Input id="edit-expiry" type="date" defaultValue={editingUser.expiry} className="bg-zinc-950 border-zinc-800" />
                                </div>
                              </div>

                              <div className="pt-4 grid grid-cols-2 gap-3">
                                <Button variant="destructive" className="rounded-xl font-bold" onClick={() => handleUpdateUser(editingUser.id, { used: '0' })}>Reset Usage</Button>
                                <Button className="bg-emerald-600 font-bold rounded-xl" onClick={() => {
                                  const limit = (document.getElementById('edit-limit') as HTMLInputElement)?.value;
                                  const expiry = (document.getElementById('edit-expiry') as HTMLInputElement)?.value;
                                  handleUpdateUser(editingUser.id, { limit, expiry });
                                }}>Save Changes</Button>
                              </div>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === 'cleanip' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-black">Clean IP Scanner</h2>
          
          <Card className="border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2"><Radar size={18} className="text-emerald-500" /> ISP Detection</h3>
                <p className="text-xs text-zinc-500 mt-1">Your network info from Cloudflare</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-zinc-800" onClick={handleScanCleanIP} disabled={cleanIPScanning}>
                  <Scan size={16} className="mr-2" />
                  {cleanIPScanning ? 'Scanning...' : 'Scan IPs'}
                </Button>
                {cleanIPScanResults.length > 0 && (
                  <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={handleApplyCleanIP}>
                    <Check size={16} className="mr-2" />
                    Apply Best IPs
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ISP</p>
                <p className="text-sm font-bold mt-1">{cleanIPISP.isp || 'Detecting...'}</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ASN</p>
                <p className="text-sm font-bold mt-1">{cleanIPISP.asn || '---'}</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Country</p>
                <p className="text-sm font-bold mt-1">{cleanIPISP.country || '---'}</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carrier</p>
                <p className="text-sm font-bold mt-1 text-emerald-500">{cleanIPISP.carrier.toUpperCase()}</p>
              </div>
            </div>
          </Card>

          {cleanIPScanResults.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
              <h3 className="text-lg font-bold">Scan Results ({cleanIPScanResults.length} IPs)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {cleanIPScanResults.map((ip, i) => (
                  <div key={i} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-sm font-mono">
                    {ip}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {cleanIPs.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
              <h3 className="text-lg font-bold">Active Clean IPs ({cleanIPs.length})</h3>
              <p className="text-xs text-zinc-500">These IPs are used as server addresses in subscription links.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {cleanIPs.map((ip, i) => (
                  <div key={i} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-sm font-mono flex items-center gap-2">
                    <Check size={12} className="text-emerald-500" />
                    {ip}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'protocols' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Protocols</h2>
            <Dialog>
              <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold" />}>
                <Plus className="mr-2 h-4 w-4" /> New Protocol
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Define New Protocol</DialogTitle>
                  <DialogDescription>Add a new protocol by defining its JSON schema and Xray template.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Protocol Name</Label>
                    <Input id="new-proto-name" placeholder="e.g. VLESS + gRPC" className="bg-zinc-950 border-zinc-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Price (TON)</Label>
                      <Input id="new-proto-price" type="number" placeholder="5.0" className="bg-zinc-950 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Client Limit</Label>
                      <Input id="new-proto-client-limit" type="number" placeholder="1" className="bg-zinc-950 border-zinc-800" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Price per Extra Client (TON)</Label>
                    <Input id="new-proto-client-price" type="number" placeholder="1.0" className="bg-zinc-950 border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>JSON Schema (Fields Definition)</Label>
                    <textarea id="new-proto-schema" className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-emerald-500" placeholder='{"fields": [...]}' />
                  </div>
                  <div className="space-y-2">
                    <Label>Xray Config Template</Label>
                    <textarea id="new-proto-template" className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-emerald-500" placeholder='{"inbound": {...}}' />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="bg-emerald-600 w-full" onClick={() => {
                    const name = (document.getElementById('new-proto-name') as HTMLInputElement)?.value;
                    const price = parseFloat((document.getElementById('new-proto-price') as HTMLInputElement)?.value);
                    const clientLimit = parseInt((document.getElementById('new-proto-client-limit') as HTMLInputElement)?.value);
                    const clientPrice = parseFloat((document.getElementById('new-proto-client-price') as HTMLInputElement)?.value);
                    const schema = JSON.parse((document.getElementById('new-proto-schema') as HTMLTextAreaElement)?.value);
                    const template = (document.getElementById('new-proto-template') as HTMLTextAreaElement)?.value;
                    setProtocols([...protocols, { 
                      id: name.toLowerCase().replace(/\s+/g, '-'), 
                      name, 
                      price, 
                      clientLimit, 
                      clientPrice, 
                      schema, 
                      template 
                    }]);
                    toast.success("Protocol added successfully");
                  }}>Save Protocol</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {protocols.map((p: any) => (
              <Card key={p.id} className="border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">JSON READY</Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-emerald-500">
                        <Shield size={20} />
                      </div>
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                    </div>
                    <Badge className="bg-zinc-950 border-zinc-800 text-emerald-500 font-mono">{p.price || '0.0'} TON</Badge>
                  </div>
                  <CardDescription className="text-xs mt-2">
                    Dynamic Schema: {p.schema.fields.length} fields. Limit: {p.clientLimit || 1} clients.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.schema.fields.map((f: any) => (
                      <span key={f.name} className="text-[9px] px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-500 font-mono">
                        {f.name}:{f.type}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-zinc-800/50 flex gap-2">
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" className="flex-1 text-xs font-bold text-zinc-400 hover:text-white" />}>
                      View Schema
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Protocol Schema: {p.name}</DialogTitle>
                        <DialogDescription>This JSON defines how the UI renders for this protocol.</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[300px] w-full rounded-md border border-zinc-800 bg-zinc-950 p-4">
                        <pre className="text-[10px] font-mono text-emerald-500">
                          {JSON.stringify(p.schema, null, 2)}
                        </pre>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" className="flex-1 text-xs font-bold text-zinc-400 hover:text-white" />}>
                      Edit Template
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Template: {p.name}</DialogTitle>
                        <DialogDescription>Modify the Xray configuration template for this protocol.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Xray Config Template (JSON)</Label>
                          <textarea 
                            id={`edit-template-${p.id}`}
                            defaultValue={p.template}
                            className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-emerald-500" 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="bg-emerald-600 w-full" onClick={() => {
                          const newTemplate = (document.getElementById(`edit-template-${p.id}`) as HTMLTextAreaElement)?.value;
                          setProtocols(protocols.map((proto: any) => proto.id === p.id ? { ...proto, template: newTemplate } : proto));
                          toast.success("Template updated successfully");
                        }}>Update Template</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black">Admin Wallet</h2>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500">External Server Required</Badge>
          </div>
          
          <Card className="border-zinc-800 bg-zinc-900/40 p-8 text-center">
            {!userAddress ? (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <Wallet size={40} />
                </div>
                <h3 className="text-xl font-bold">Connect Your Wallet</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">Connect your Tonkeeper or Telegram wallet to receive payments and manage node finances.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="p-4 bg-emerald-500/10 rounded-3xl text-emerald-500">
                    <Coins size={48} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">Balance</p>
                    <p className="text-4xl font-black">1,240.50 <span className="text-lg text-emerald-500">TON</span></p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-xs text-zinc-400 break-all">
                  {userAddress}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold h-12" onClick={handleWithdraw}>Withdraw</Button>
                  <Button variant="outline" className="border-zinc-800 rounded-xl font-bold h-12" onClick={() => toast.info("Transaction history is empty")}>History</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-black">Settings</h2>
          <Card className="border-zinc-800 bg-zinc-900/30 p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Financial Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Referral Commission (%)</Label>
                  <Input type="number" defaultValue={15} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Min. Withdrawal (TON)</Label>
                  <Input type="number" defaultValue={5} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Tax / Service Fee (%)</Label>
                  <Input type="number" defaultValue={2} className="bg-zinc-950 border-zinc-800" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Wallet size={18} className="text-blue-500" /> System Treasury</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Capital</p>
                  <p className="text-2xl font-black mt-1">45,200 <span className="text-xs text-zinc-500">TON</span></p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Payouts</p>
                  <p className="text-2xl font-black mt-1">12,840 <span className="text-xs text-zinc-500">TON</span></p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Referral Rewards</p>
                  <p className="text-2xl font-black mt-1">3,120 <span className="text-xs text-zinc-500">TON</span></p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Net Profit</p>
                  <p className="text-2xl font-black mt-1 text-emerald-500">29,240 <span className="text-xs text-zinc-400">TON</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Shield size={18} className="text-emerald-500" /> Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Panel Secret Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••••••••••" readOnly className="bg-zinc-950 border-zinc-800" />
                    <Button variant="outline" className="border-zinc-800" onClick={() => {
                      navigator.clipboard.writeText("SUPER_SECRET_KEY_123");
                      toast.success("Secret key copied");
                    }}><Copy size={16} /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Admin Port</Label>
                  <Input type="number" defaultValue={3000} className="bg-zinc-950 border-zinc-800" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Integrations</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Globe size={20} /></div>
                    <div>
                      <p className="font-bold">Telegram Bot</p>
                      <p className="text-xs text-zinc-500">Manage users via Telegram</p>
                    </div>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Activity size={20} /></div>
                    <div>
                      <p className="font-bold">Prometheus Metrics</p>
                      <p className="text-xs text-zinc-500">Export data for Grafana</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Shield size={18} className="text-rose-500" /> Disguise / Anti-Detection</h3>
              <p className="text-xs text-zinc-500">Hide the admin panel behind secret paths. Unauthorized visitors see a fake Cloudflare error page.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><Shield size={20} /></div>
                    <div>
                      <p className="font-bold">Enable Disguise</p>
                      <p className="text-xs text-zinc-500">Show fake error page to unauthorized visitors</p>
                    </div>
                  </div>
                  <Switch checked={disguiseEnabled} onCheckedChange={setDisguiseEnabled} />
                </div>
                {disguiseEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <div className="space-y-2">
                      <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Admin Secret Path</Label>
                      <Input
                        value={disguiseAdminPath}
                        onChange={(e) => setDisguiseAdminPath(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="e.g. x7k9m"
                        className="bg-zinc-900 border-zinc-800"
                      />
                      <p className="text-[10px] text-zinc-600">Access panel at: /{disguiseAdminPath || '<path>'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Login Secret Path</Label>
                      <Input
                        value={disguiseLoginPath}
                        onChange={(e) => setDisguiseLoginPath(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="e.g. m3x7p"
                        className="bg-zinc-900 border-zinc-800"
                      />
                      <p className="text-[10px] text-zinc-600">Access login at: /{disguiseLoginPath || '<path>'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Subscription Secret Path</Label>
                      <Input
                        value={disguiseSubPath}
                        onChange={(e) => setDisguiseSubPath(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="e.g. k9x3m"
                        className="bg-zinc-900 border-zinc-800"
                      />
                      <p className="text-[10px] text-zinc-600">Subscription at: /{disguiseSubPath || '<path>'}/:token</p>
                    </div>
                  </div>
                )}
                {disguiseEnabled && (
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Fallback Page</Label>
                    <Select value={disguiseFallbackPage} onValueChange={setDisguiseFallbackPage}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="1101">Cloudflare Error 1101</SelectItem>
                        <SelectItem value="nginx">Nginx Welcome Page</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-zinc-600 mt-2">What unauthorized visitors see when hitting fake or leaked paths.</p>
                  </div>
                )}
                {disguiseEnabled && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-400 font-bold">Recovery Mode</p>
                    <p className="text-[10px] text-amber-500/70 mt-1">If locked out, set <code className="bg-zinc-950 px-1 rounded">PANEL_RECOVERY=1</code> in Worker environment variables to bypass disguise and access /admin directly.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Network size={18} className="text-cyan-500" /> Network (ECH + TLS Fragment)</h3>
              <p className="text-xs text-zinc-500">Anti-censorship features for subscription links. These add parameters to generated configs.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-lg"><Shield size={20} /></div>
                    <div>
                      <p className="font-bold">ECH (Encrypted Client Hello)</p>
                      <p className="text-xs text-zinc-500">Encrypt SNI to bypass DPI inspection</p>
                    </div>
                  </div>
                  <Switch checked={echEnabled} onCheckedChange={setEchEnabled} />
                </div>
                {echEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <div className="space-y-2">
                      <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">ECH SNI</Label>
                      <Input value={echSni} onChange={(e) => setEchSni(e.target.value)} className="bg-zinc-900 border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">ECH DNS</Label>
                      <Input value={echDns} onChange={(e) => setEchDns(e.target.value)} className="bg-zinc-900 border-zinc-800" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Lock size={20} /></div>
                    <div>
                      <p className="font-bold">TLS Fragment</p>
                      <p className="text-xs text-zinc-500">Split TLS handshake to evade DPI detection</p>
                    </div>
                  </div>
                  <Switch checked={tlsFragEnabled} onCheckedChange={setTlsFragEnabled} />
                </div>
                {tlsFragEnabled && (
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Fragment Mode</Label>
                    <Select value={tlsFragMode} onValueChange={setTlsFragMode}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="Shadowrocket">Shadowrocket (1,40-60,30-50,tlshello)</SelectItem>
                        <SelectItem value="Happ">Happ (3,1,tlshello)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-zinc-600 mt-2">Shadowrocket format is compatible with most clients. Happ format for specific DPI environments.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Globe size={18} className="text-blue-500" /> Telegram Bot</h3>
              <p className="text-xs text-zinc-500">Manage your panel from Telegram. Create a bot via @BotFather.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Bot Token</Label>
                  <Input type="password" value={tgBotToken} onChange={(e) => setTgBotToken(e.target.value)} placeholder="123456789:ABCdef..." className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Admin Chat ID</Label>
                  <Input value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Your Telegram user ID" className="bg-zinc-900 border-zinc-800" />
                </div>
              </div>
              {tgBotToken && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-400 font-bold">Webhook Setup</p>
                  <p className="text-[10px] text-blue-500/70 mt-1">After saving, set the webhook URL to: <code className="bg-zinc-950 px-1 rounded">{window.location.origin}/bot</code></p>
                  <p className="text-[10px] text-blue-500/70 mt-1">Or use: <code className="bg-zinc-950 px-1 rounded">curl "https://api.telegram.org/bot{tgBotToken}/setWebhook?url={encodeURIComponent(window.location.origin + '/bot')}"</code></p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8" onClick={handleSaveSettings}>Save All Changes</Button>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

function UserView({ activeTab, userConfigs, userAddress, handleWithdraw, userProfile, setUserProfile }: any) {
  const [selectedConfig, setSelectedConfig] = useState<UserConfig | null>(null);
  
  // Purchase State
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'node' | 'sub' | 'single'>('sub');
  const [purchaseForm, setPurchaseForm] = useState({
    volume: 50,
    connections: 2,
    duration: 1,
    protocol: 'vless-grpc'
  });

  const calculatePrice = () => {
    if (purchaseType === 'node') return 150.0 * purchaseForm.duration;
    if (purchaseType === 'sub') return (10.0 + (purchaseForm.volume * 0.2) + (purchaseForm.connections * 2.0)) * purchaseForm.duration;
    return (2.0 + (purchaseForm.volume * 0.3)) * purchaseForm.duration;
  };

  return (
    <motion.div
      key="user-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-8 mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight">Welcome, {userProfile.displayName}</h1>
              <p className="text-zinc-500 font-medium">Your subscription is active until April 12, 2026.</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold" onClick={() => toast.info("Redirecting to client download page...")}>
              <Download className="mr-2 h-4 w-4" /> Get Client App
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Usage Overview</CardTitle>
                <CardDescription>Monthly data consumption.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Data Consumed</p>
                      <p className="text-3xl font-black">45.2 <span className="text-sm text-zinc-500">GB</span></p>
                    </div>
                    <p className="text-sm font-bold text-zinc-400">of 100 GB limit</p>
                  </div>
                  <Progress value={45.2} className="h-4 bg-zinc-800" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <UserStat icon={Clock} label="Days Left" value="14" />
                  <UserStat icon={Wifi} label="Active Links" value="2" />
                  <UserStat icon={Activity} label="Avg. Speed" value="45 Mbps" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-white/5 mb-6">
                <QrCode className="w-32 h-32 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-2">Quick Connect</h3>
              <p className="text-sm text-zinc-500 mb-6">Scan this master QR to import all your active configurations.</p>
              <Button variant="outline" className="w-full border-zinc-800 rounded-xl hover:bg-zinc-800" onClick={() => {
                navigator.clipboard.writeText("vless://master-link-alice");
                toast.success("Master link copied");
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy Master Link
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black">My Connections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userConfigs.map((config: any) => (
                <Card key={config.id} className="border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">ACTIVE</Badge>
                      <span className="text-[10px] font-mono text-zinc-500">{config.protocolId.toUpperCase()}</span>
                    </div>
                    <CardTitle className="mt-2 text-xl">{config.name}</CardTitle>
                    <CardDescription>Node: {config.nodeId === 1 ? 'Germany' : 'Tehran'}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Traffic Used</span>
                      <span className="font-mono font-bold">{config.used} GB</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Client Limit</span>
                      <span className="font-mono font-bold">{config.clientLimit || 1} Devices</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="secondary" className="flex-1 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold" onClick={() => {
                      navigator.clipboard.writeText(config.link);
                      toast.success(`${config.name} link copied`);
                    }}>
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Dialog>
                      <DialogTrigger render={<Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 rounded-xl" onClick={() => setSelectedConfig(config)} />}>
                        <QrCode className="h-4 w-4" />
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DialogHeader>
                          <DialogTitle>Connect to {config.name}</DialogTitle>
                          <DialogDescription>Scan with V2RayNG, Streisand, or Shadowrocket.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-6 py-6">
                          <div className="bg-white p-6 rounded-3xl">
                            <QrCode className="w-48 h-48 text-black" />
                          </div>
                          <div className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[10px] break-all text-zinc-400">
                            {config.link}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button className="w-full bg-emerald-600 font-bold" onClick={() => toast.success("QR Image downloaded")}>Download QR Image</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'marketplace' && (
        <div className="space-y-6 mt-6">
          <div className="flex flex-col space-y-2 px-4 md:px-0">
            <h2 className="text-3xl font-black tracking-tight">Marketplace</h2>
            <p className="text-zinc-500 font-medium">Choose a plan that fits your needs.</p>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 gap-4 md:gap-6 pb-6 px-4 md:px-0">
            {/* Option 1: Full Node */}
            <Card className="min-w-[85vw] md:min-w-0 snap-center border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl w-fit"><Server size={24} /></div>
                <h3 className="text-xl font-black">Full Node Ownership</h3>
                <p className="text-sm text-zinc-400">Own an entire server. Launch your own bot, sell configs, and manage everything.</p>
                <div className="pt-4">
                  <p className="text-3xl font-black">150.0 <span className="text-sm text-zinc-500">TON / mo</span></p>
                </div>
                <ul className="space-y-2 pt-4">
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Dedicated IP</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Unlimited Users</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Custom Bot Integration</li>
                </ul>
              </div>
              <Button className="w-full mt-8 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold h-12" onClick={() => { setPurchaseType('node'); setIsPurchaseDialogOpen(true); }}>Purchase Node</Button>
            </Card>

            {/* Option 2: Subscription + Volume */}
            <Card className="min-w-[85vw] md:min-w-0 snap-center border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between border-emerald-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-[10px] font-black rounded-full text-black">MOST POPULAR</div>
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl w-fit"><Zap size={24} /></div>
                <h3 className="text-xl font-black">Pro Subscription</h3>
                <p className="text-sm text-zinc-400">Buy a subscription link (Sub) with custom data volume and multiple connections.</p>
                <div className="pt-4">
                  <p className="text-3xl font-black">Dynamic <span className="text-sm text-zinc-500">Pricing</span></p>
                </div>
                <ul className="space-y-2 pt-4">
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Multi-Protocol Support</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Dynamic Load Balancing</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Choose Connections Limit</li>
                </ul>
              </div>
              <Button className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold h-12" onClick={() => { setPurchaseType('sub'); setIsPurchaseDialogOpen(true); }}>Customize & Buy</Button>
            </Card>

            {/* Option 3: Single Config */}
            <Card className="min-w-[85vw] md:min-w-0 snap-center border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div className="space-y-4">
                <div className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl w-fit"><Wifi size={24} /></div>
                <h3 className="text-xl font-black">Single Config</h3>
                <p className="text-sm text-zinc-400">Buy a single configuration with limited volume. Perfect for light use.</p>
                <div className="pt-4">
                  <p className="text-3xl font-black">Dynamic <span className="text-sm text-zinc-500">Pricing</span></p>
                </div>
                <ul className="space-y-2 pt-4">
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> High Speed</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> 30 Days Expiry</li>
                  <li className="text-xs text-zinc-500 flex items-center gap-2"><Check size={12} className="text-emerald-500" /> Single Device</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full mt-8 border-zinc-800 rounded-xl font-bold h-12" onClick={() => { setPurchaseType('single'); setIsPurchaseDialogOpen(true); }}>Customize & Buy</Button>
            </Card>
          </div>

          {/* Backend / Contribution Mode */}
          <div className="px-4 md:px-0 space-y-4">
            <Card className="border-zinc-800 bg-amber-500/5 border-amber-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><Server size={24} /></div>
                <div>
                  <h3 className="text-xl font-black">Your Server</h3>
                  <p className="text-xs text-zinc-500">Provide a VPS to run your configs. Get a 90% discount.</p>
                </div>
              </div>

              {backends.length > 0 && (
                <div className="space-y-2 mb-4">
                  {backends.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Check size={12} className="text-emerald-500" />
                        <span className="font-mono text-sm">{b.vps_ip}:{b.vps_port}</span>
                        <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{b.status}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400" onClick={async () => {
                        await fetch(api(`/api/backends/${b.id}`), { ...FETCH_OPTS, method: 'DELETE' });
                        setBackends(backends.filter((x: any) => x.id !== b.id));
                        toast.success('Backend removed');
                      }}><Trash2 size={14} /></Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input value={backendIP} onChange={(e) => setBackendIP(e.target.value)} placeholder="VPS IP address" className="bg-zinc-950 border-zinc-800 flex-1" />
                <Input value={backendPort} onChange={(e) => setBackendPort(e.target.value)} placeholder="Port" className="bg-zinc-950 border-zinc-800 w-20" />
                <Button className="bg-amber-600 hover:bg-amber-500 text-black font-bold" onClick={handleRegisterBackend}>Register</Button>
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/30 p-6">
              <h4 className="font-bold mb-2 flex items-center gap-2"><Download size={16} className="text-emerald-500" /> Install Backend on VPS</h4>
              <p className="text-xs text-zinc-500 mb-3">Run this command on your Ubuntu/Debian VPS to install Xray-core:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-zinc-950 rounded-lg text-xs text-emerald-400 font-mono overflow-x-auto whitespace-nowrap">
                  bash &lt;(curl -fsSL https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/main/installer/backend-install.sh) {window.location.origin} YOUR_UUID
                </code>
                <Button variant="outline" className="border-zinc-800" onClick={() => {
                  navigator.clipboard.writeText(`bash <(curl -fsSL https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/main/installer/backend-install.sh) ${window.location.origin} YOUR_UUID`);
                  toast.success('Copied!');
                }}><Copy size={14} /></Button>
              </div>
            </Card>
          </div>

          {/* Purchase Dialog */}
          <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {purchaseType === 'node' ? 'Purchase Full Node' : purchaseType === 'sub' ? 'Customize Subscription' : 'Customize Single Config'}
                </DialogTitle>
                <DialogDescription>
                  Adjust the parameters below to customize your purchase. The price updates automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {purchaseType !== 'node' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Data Volume (GB)</Label>
                        <span className="font-mono text-emerald-500">{purchaseForm.volume} GB</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" max="500" step="10"
                        value={purchaseForm.volume}
                        onChange={(e) => setPurchaseForm({...purchaseForm, volume: parseInt(e.target.value)})}
                        className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {purchaseType === 'sub' && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Concurrent Connections</Label>
                          <span className="font-mono text-emerald-500">{purchaseForm.connections} Devices</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" max="10" step="1"
                          value={purchaseForm.connections}
                          onChange={(e) => setPurchaseForm({...purchaseForm, connections: parseInt(e.target.value)})}
                          className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Duration (Months)</Label>
                  <Select value={purchaseForm.duration.toString()} onValueChange={(v) => setPurchaseForm({...purchaseForm, duration: parseInt(v)})}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months (5% off)</SelectItem>
                      <SelectItem value="6">6 Months (10% off)</SelectItem>
                      <SelectItem value="12">12 Months (20% off)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-emerald-500 uppercase tracking-widest text-xs">Total Price</span>
                  <span className="text-2xl font-black text-emerald-500">{calculatePrice().toFixed(2)} <span className="text-sm">TON</span></span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPurchaseDialogOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8" onClick={() => {
                  toast.success("Purchase successful! Added to your dashboard.");
                  setIsPurchaseDialogOpen(false);
                }}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Checkout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeTab === 'referral' && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-zinc-800 bg-zinc-900/40 p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">Referral Program</h3>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">15% COMMISSION</Badge>
                </div>
                <p className="text-zinc-400 text-sm">Invite your friends and earn 15% of every purchase they make, forever. Your rewards are paid instantly in TON.</p>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Your Unique Link</Label>
                  <div className="flex gap-2">
                    <Input value={`https://t.me/XrayModBot?start=ref_${userProfile.displayName.toLowerCase()}`} readOnly className="bg-zinc-950 border-zinc-800 font-mono text-xs" />
                    <Button variant="outline" className="border-zinc-800" onClick={() => {
                      navigator.clipboard.writeText(`https://t.me/XrayModBot?start=ref_${userProfile.displayName.toLowerCase()}`);
                      toast.success("Referral link copied");
                    }}><Copy size={16} /></Button>
                    <Button variant="outline" className="border-zinc-800"><Share2 size={16} /></Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Invited</p>
                    <p className="text-2xl font-black">12</p>
                  </div>
                  <div className="text-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active</p>
                    <p className="text-2xl font-black">8</p>
                  </div>
                  <div className="text-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Earned</p>
                    <p className="text-2xl font-black text-emerald-500">145.2</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Recent Referrals</h3>
                <div className="space-y-3">
                  {[
                    { name: "User_882", date: "2h ago", earn: "+2.4 TON" },
                    { name: "CryptoKing", date: "1d ago", earn: "+5.1 TON" },
                    { name: "John_Doe", date: "3d ago", earn: "+1.2 TON" }
                  ].map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/50 transition-colors">
                      <div>
                        <p className="text-sm font-bold">{ref.name}</p>
                        <p className="text-[10px] text-zinc-500">{ref.date}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-500">{ref.earn}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" className="w-full text-zinc-500 hover:text-white mt-4">View All Referrals</Button>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-zinc-800 bg-zinc-900/40 p-8 text-center">
              {!userAddress ? (
                <div className="space-y-6">
                  <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                    <Wallet size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black">Wallet Integration</h3>
                    <p className="text-zinc-500">TON wallet integration requires an external server. Enable it in Settings → Integrations.</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-500">External Server Required</Badge>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="p-4 bg-emerald-500/10 rounded-3xl text-emerald-500">
                      <Coins size={48} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">Balance</p>
                      <p className="text-4xl font-black">1,240.50 <span className="text-lg text-emerald-500">TON</span></p>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-xs text-zinc-400 break-all flex items-center justify-between">
                    <span className="truncate mr-2">{userAddress}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      navigator.clipboard.writeText(userAddress);
                      toast.success("Address copied");
                    }}><Copy size={12} /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold h-12" onClick={handleWithdraw}>Withdraw</Button>
                    <Button variant="outline" className="border-zinc-800 rounded-xl font-bold h-12" onClick={() => toast.info("Transaction history is empty")}>History</Button>
                  </div>
                </div>
              )}
            </Card>

            <Card className="md:col-span-2 border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-lg font-bold mb-4">Financial Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Spent</p>
                    <p className="text-xl font-black">850.00 TON</p>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-lg"><TrendingUp size={16} className="text-rose-500" /></div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Earned (Ref)</p>
                    <p className="text-xl font-black">145.20 TON</p>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-lg"><TrendingUp size={16} className="text-emerald-500" /></div>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Recent Transactions</h4>
                <div className="space-y-2">
                  {[
                    { type: "Purchase", amount: "-15.0 TON", date: "Mar 10, 2026", status: "Success" },
                    { type: "Ref Reward", amount: "+2.4 TON", date: "Mar 09, 2026", status: "Success" },
                    { type: "Withdrawal", amount: "-50.0 TON", date: "Mar 05, 2026", status: "Pending" }
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.amount.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {tx.amount.startsWith('+') ? <ArrowUpRight size={14} /> : <LogOut size={14} className="rotate-180" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{tx.type}</p>
                          <p className="text-[10px] text-zinc-500">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tx.amount.startsWith('+') ? 'text-emerald-500' : 'text-white'}`}>{tx.amount}</p>
                        <p className={`text-[10px] ${tx.status === 'Pending' ? 'text-amber-500' : 'text-zinc-500'}`}>{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6 mt-6">
          <Card className="border-zinc-800 bg-zinc-900/40 p-6 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-4xl font-black text-emerald-500">
                  {userProfile.avatar}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <Edit3 size={14} />
                </button>
              </div>
              
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Display Name</Label>
                  <Input 
                    value={userProfile.displayName} 
                    onChange={(e) => setUserProfile({...userProfile, displayName: e.target.value, avatar: e.target.value[0]?.toUpperCase() || '?'})} 
                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Email Address</Label>
                  <Input 
                    value={userProfile.email} 
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} 
                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl" 
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold h-12 rounded-xl" onClick={() => toast.success("Profile updated successfully")}>Save Profile</Button>
                  <Button variant="outline" className="flex-1 border-zinc-800 h-12 rounded-xl" onClick={() => toast.info("Password reset link sent to your email")}>Change Password</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}

// --- Helper Components ---

function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
        active 
          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-1 transition-all ${
        active ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-emerald-500/10' : ''}`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all group"
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-zinc-500 group-hover:text-emerald-500" />
        <span className="text-sm font-bold text-zinc-400 group-hover:text-zinc-200">{label}</span>
      </div>
      <ChevronRight size={14} className="text-zinc-700 group-hover:text-emerald-500" />
    </button>
  );
}

function UserStat({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-zinc-500" />
        <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (role: 'admin' | 'user', userProfile: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setIsAuthenticating(true);
    
    try {
      const res = await fetch(api('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      
      const data = await res.json() as { success: boolean; role?: string; user?: any; message?: string };
      if (data.success) {
        onLogin(data.role as 'admin' | 'user', data.user);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error('Network error during login');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-50 pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/20 mb-6 relative group"
              >
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Zap className="text-zinc-950 w-8 h-8 relative z-10" />
              </motion.div>
              <h1 className="text-3xl font-black tracking-tight uppercase text-white mb-2">
                Xray<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Mod</span>
              </h1>
              <p className="text-zinc-400 text-sm font-medium">Secure Access Gateway</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2 group">
                <Label htmlFor="username" className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 group-focus-within:text-emerald-500 transition-colors">Identity</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <Input 
                    id="username" 
                    placeholder="Enter username (e.g. admin)" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-black/50 border-white/10 h-14 rounded-2xl pl-11 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all" 
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-focus-within:text-emerald-500 transition-colors">Passphrase</Label>
                  <a href="#" className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors font-medium">Forgot?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/50 border-white/10 h-14 rounded-2xl pl-11 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all" 
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <Button 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black h-14 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] mt-4" 
                onClick={handleLogin}
                disabled={isAuthenticating || !username}
              >
                {isAuthenticating ? (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full"
                  />
                ) : (
                  "AUTHENTICATE"
                )}
              </Button>
            </div>
          </div>
          
          <div className="bg-black/40 p-4 border-t border-white/5 text-center space-y-2">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Powered by Xray-Core & Modular Engine
            </p>
            <div className="flex justify-center gap-4 text-[10px] text-zinc-600">
              <span>Admin: admin / admin</span>
              <span>User: user / user</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
