'use client';

import { useEffect, useState } from 'react';
import { Wifi, Save, RefreshCw, Globe, Shield, Server, Zap, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, Toggle } from '@/components';

interface NetworkSettings {
  // Routing
  enableRouting: boolean;
  enableGeoIP: boolean;
  enableGeoSite: boolean;
  enableAdBlock: boolean;
  enablePornBlock: boolean;
  enableDomesticBypass: boolean;
  // DNS
  enableDoH: boolean;
  dohProvider: string;
  enableLocalDNS: boolean;
  localDNSIP: string;
  localDNSPort: string;
  enableFakeDNS: boolean;
  fakeDNSIP: string;
  // Anti-sanction DNS
  enableAntiSanctionDNS: boolean;
  antiSanctionDNSProvider: string;
  antiSanctionCustomDNS: string;
  // IPv6
  enableIPv6: boolean;
  allowLAN: boolean;
  // WARP
  enableWarp: boolean;
  warpCalls: boolean;
  warpMode: string;
  warpEndpoint: string;
  warpAmnezia: boolean;
  // Logging
  logLevel: string;
  // Custom
  customRules: string;
  // Connection
  TCP并发拨号数: number;
  预加载竞速拨号: boolean;
}

const defaultSettings: NetworkSettings = {
  enableRouting: true,
  enableGeoIP: true,
  enableGeoSite: true,
  enableAdBlock: true,
  enablePornBlock: false,
  enableDomesticBypass: true,
  enableDoH: true,
  dohProvider: 'cloudflare',
  enableLocalDNS: false,
  localDNSIP: '8.8.8.8',
  localDNSPort: '53',
  enableFakeDNS: false,
  fakeDNSIP: '198.51.100.1',
  enableAntiSanctionDNS: false,
  antiSanctionDNSProvider: 'cloudflare',
  antiSanctionCustomDNS: '',
  enableIPv6: true,
  allowLAN: false,
  enableWarp: false,
  warpCalls: false,
  warpMode: 'warp',
  warpEndpoint: '',
  warpAmnezia: false,
  logLevel: 'error',
  customRules: '',
  TCP并发拨号数: 4,
  预加载竞速拨号: false,
};

export default function NetworkPage() {
  const [settings, setSettings] = useState<NetworkSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then((res) => {
      const d = res?.data || {};
      const raw = d['panel.network_settings'];
      if (raw) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(raw) });
          return;
        } catch { /* fall through */ }
      }
      setSettings({
        ...defaultSettings,
        dohProvider: d['panel.dns'] || defaultSettings.dohProvider,
        enableWarp: d['panel.warp'] === 'true',
        enableIPv6: d['panel.ipv6'] !== 'false',
      });
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', {
        'panel.network_settings': JSON.stringify(settings),
        'panel.dns': settings.dohProvider || '',
        'panel.warp': String(settings.enableWarp),
        'panel.ipv6': String(settings.enableIPv6),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const update = (key: keyof NetworkSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Network</h1>
          <p className="text-zinc-500 text-sm mt-1">Routing, DNS, WARP and connectivity</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save'}
        </Button>
      </div>

      {/* Routing Rules */}
      <Card>
        <CardHeader title="Routing Rules" description="Control how traffic is routed" />
        <div className="space-y-1">
          <Toggle label="Enable Routing" description="Use Xray routing rules for traffic" checked={settings.enableRouting} onChange={v => update('enableRouting', v)} />
          <Toggle label="GeoIP Routing" description="Route by country/IP geolocation" checked={settings.enableGeoIP} onChange={v => update('enableGeoIP', v)} />
          <Toggle label="GeoSite Routing" description="Route by domain categories" checked={settings.enableGeoSite} onChange={v => update('enableGeoSite', v)} />
          <Toggle label="Ad Block" description="Block advertising domains" checked={settings.enableAdBlock} onChange={v => update('enableAdBlock', v)} />
          <Toggle label="Porn Block" description="Block adult content domains" checked={settings.enablePornBlock} onChange={v => update('enablePornBlock', v)} />
          <Toggle label="Domestic Bypass" description="Route domestic traffic directly (Iran/China/Russia)" checked={settings.enableDomesticBypass} onChange={v => update('enableDomesticBypass', v)} />
        </div>
      </Card>

      {/* DNS Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="DNS over HTTPS" description="Encrypted DNS resolution" />
          <div className="space-y-3">
            <Toggle label="Enable DoH" description="Use DNS over HTTPS for resolution" checked={settings.enableDoH} onChange={v => update('enableDoH', v)} />
            {settings.enableDoH && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {['cloudflare', 'google', 'quad9', 'adguard'].map(p => (
                    <button
                      key={p}
                      onClick={() => update('dohProvider', p)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                        settings.dohProvider === p
                          ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                          : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Local DNS" description="Custom DNS resolver" />
          <div className="space-y-3">
            <Toggle label="Enable Local DNS" description="Use custom DNS server instead of system" checked={settings.enableLocalDNS} onChange={v => update('enableLocalDNS', v)} />
            {settings.enableLocalDNS && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="DNS Server" value={settings.localDNSIP} onChange={e => update('localDNSIP', e.target.value)} placeholder="8.8.8.8" />
                <Input label="Port" value={settings.localDNSPort} onChange={e => update('localDNSPort', e.target.value)} placeholder="53" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* FakeDNS & Anti-Sanction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="FakeDNS" />
          <div className="space-y-3">
            <Toggle label="Enable FakeDNS" description="Return fake IP for DNS queries (Android VPN)" checked={settings.enableFakeDNS} onChange={v => update('enableFakeDNS', v)} />
            {settings.enableFakeDNS && (
              <Input label="FakeDNS IP" value={settings.fakeDNSIP} onChange={e => update('fakeDNSIP', e.target.value)} placeholder="198.51.100.1" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Anti-Sanction DNS" description="Separate DNS for sanctioned domains" />
          <div className="space-y-3">
            <Toggle label="Enable Anti-Sanction DNS" checked={settings.enableAntiSanctionDNS} onChange={v => update('enableAntiSanctionDNS', v)} />
            {settings.enableAntiSanctionDNS && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cloudflare', 'alidns', 'shekan', 'custom'].map(p => (
                      <button
                        key={p}
                        onClick={() => update('antiSanctionDNSProvider', p)}
                        className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                          settings.antiSanctionDNSProvider === p
                            ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                            : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {settings.antiSanctionDNSProvider === 'custom' && (
                  <Input label="Custom DNS" value={settings.antiSanctionCustomDNS} onChange={e => update('antiSanctionCustomDNS', e.target.value)} placeholder="1.1.1.1" />
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* IPv6 & LAN */}
      <Card>
        <CardHeader title="Connection" />
        <div className="space-y-1">
          <Toggle label="IPv6" description="Allow IPv6 outbound connections" checked={settings.enableIPv6} onChange={v => update('enableIPv6', v)} />
          <Toggle label="Allow LAN" description="Allow connections from local network" checked={settings.allowLAN} onChange={v => update('allowLAN', v)} />
        </div>
      </Card>

      {/* WARP */}
      <Card>
        <CardHeader title="WARP / WireGuard" description="Route traffic through Cloudflare WARP" />
        <div className="space-y-3">
          <Toggle label="Enable WARP" description="Inject WARP WireGuard node into subscriptions" checked={settings.enableWarp} onChange={v => update('enableWarp', v)} />
          {settings.enableWarp && (
            <>
              <Toggle label="WARP for Calls" description="Route voice/video through WARP" checked={settings.warpCalls} onChange={v => update('warpCalls', v)} />
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">WARP Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['warp', 'chain', 'wow'].map(m => (
                    <button
                      key={m}
                      onClick={() => update('warpMode', m)}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                        settings.warpMode === m
                          ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                          : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                      }`}
                    >
                      {m === 'wow' ? 'WoW (Double)' : m}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="AmneziaWG" description="Use AmneziaWG protocol for obfuscation" checked={settings.warpAmnezia} onChange={v => update('warpAmnezia', v)} />
              <Input label="Custom Endpoint" value={settings.warpEndpoint} onChange={e => update('warpEndpoint', e.target.value)} placeholder="auto" />
            </>
          )}
        </div>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader title="Advanced" />
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Log Level</label>
            <div className="grid grid-cols-4 gap-2">
              {['error', 'warn', 'info', 'debug'].map(l => (
                <button
                  key={l}
                  onClick={() => update('logLevel', l)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    settings.logLevel === l
                      ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                      : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Input label="TCP Concurrent Connections" type="number" value={settings.TCP并发拨号数} onChange={e => update('TCP并发拨号数', Number(e.target.value))} />
          <Toggle label="Pre-resolve DNS" description="Resolve DNS before connecting (faster but more DNS queries)" checked={settings.预加载竞速拨号} onChange={v => update('预加载竞速拨号', v)} />
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Custom Routing Rules</label>
            <textarea
              value={settings.customRules}
              onChange={e => update('customRules', e.target.value)}
              placeholder="One rule per line..."
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 h-24 resize-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
