'use client';

import { useEffect, useState } from 'react';
import { Save, RefreshCw, Copy, ExternalLink, Shield, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, Toggle } from '@/components';

interface Config {
  protocol: string;
  host: string[];
  path: string;
  uuid: string;
  network: string;
  security: string;
  fingerprint: string;
  flow: string;
  allowInsecure: boolean;
  // ECH
  enableECH: boolean;
  echSNI: string;
  // TLS Fragment
  enableFragment: boolean;
  fragmentLength: string;
  fragmentSleep: string;
  // Sub settings
  subName: string;
  subBanner: string;
  // Subscription formats
  subBase64: boolean;
  subClash: boolean;
  subSingbox: boolean;
  // Misc
  mixedProtocol: boolean;
  paused: boolean;
  monthlyCapGb: string;
  ispAware: boolean;
}

const defaultConfig: Config = {
  protocol: 'vless',
  host: [],
  path: '',
  uuid: '',
  network: 'ws',
  security: 'tls',
  fingerprint: 'chrome',
  flow: '',
  allowInsecure: false,
  enableECH: false,
  echSNI: '',
  enableFragment: false,
  fragmentLength: '100-200',
  fragmentSleep: '50-100',
  subName: 'XRayMOD',
  subBanner: '',
  subBase64: true,
  subClash: true,
  subSingbox: true,
  mixedProtocol: false,
  paused: false,
  monthlyCapGb: '0',
  ispAware: true,
};

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [hosts, setHosts] = useState<string[]>([]);
  const [newHost, setNewHost] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then((res) => {
      const d = res?.data || res || {};
      const mapped = {
        ...defaultConfig,
        protocol: d['panel.protocol'] || defaultConfig.protocol,
        path: d['panel.path'] || defaultConfig.path,
        uuid: d['panel.uuid'] || defaultConfig.uuid,
        network: d['panel.network'] || defaultConfig.network,
        security: d['panel.security'] || defaultConfig.security,
        fingerprint: d['panel.fingerprint'] || defaultConfig.fingerprint,
        flow: d['panel.flow'] || defaultConfig.flow,
        allowInsecure: d['panel.allow_insecure'] === 'true',
        enableECH: d['ech.enabled'] === 'true',
        echSNI: d['ech.sni'] || '',
        enableFragment: d['tls_fragment.enabled'] === 'true',
        fragmentLength: d['tls_fragment.length'] || defaultConfig.fragmentLength,
        fragmentSleep: d['tls_fragment.sleep'] || defaultConfig.fragmentSleep,
        subName: d['panel.sub_name'] || defaultConfig.subName,
        subBanner: d['panel.sub_banner'] || '',
        subBase64: d['panel.sub_base64'] !== 'false',
        subClash: d['panel.sub_clash'] !== 'false',
        subSingbox: d['panel.sub_singbox'] !== 'false',
        mixedProtocol: d['protocol.mixed_mode'] === 'true',
        paused: d['panel.paused'] === 'true',
        monthlyCapGb: d['panel.monthly_cap_gb'] || '0',
        ispAware: d['panel.isp_aware_sub'] !== 'false',
      };
      setConfig(mapped);
      const hostRaw = d['panel.hosts'] || d['panel.host'] || '';
      if (hostRaw) {
        try {
          const parsed = JSON.parse(hostRaw);
          setHosts(Array.isArray(parsed) ? parsed : [String(parsed)]);
        } catch {
          setHosts(String(hostRaw).split(',').map((h: string) => h.trim()).filter(Boolean));
        }
      }
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', {
        'panel.protocol': config.protocol,
        'panel.path': config.path,
        'panel.uuid': config.uuid,
        'panel.network': config.network,
        'panel.security': config.security,
        'panel.fingerprint': config.fingerprint,
        'panel.flow': config.flow,
        'panel.allow_insecure': String(config.allowInsecure),
        'panel.hosts': JSON.stringify(hosts),
        'ech.enabled': String(config.enableECH),
        'ech.sni': config.echSNI,
        'tls_fragment.enabled': String(config.enableFragment),
        'tls_fragment.length': config.fragmentLength,
        'tls_fragment.sleep': config.fragmentSleep,
        'panel.sub_name': config.subName,
        'panel.sub_banner': config.subBanner,
        'panel.sub_base64': String(config.subBase64),
        'panel.sub_clash': String(config.subClash),
        'panel.sub_singbox': String(config.subSingbox),
        'protocol.mixed_mode': String(config.mixedProtocol),
        'panel.paused': String(config.paused),
        'panel.monthly_cap_gb': String(Number(config.monthlyCapGb) || 0),
        'panel.isp_aware_sub': String(config.ispAware),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const addHost = () => {
    if (newHost && !hosts.includes(newHost)) {
      setHosts([...hosts, newHost]);
      setNewHost('');
    }
  };

  const removeHost = (h: string) => {
    setHosts(hosts.filter(x => x !== h));
  };

  const copySubLink = () => {
    const host = hosts[0] || window.location.hostname;
    const path = config.path || '/';
    navigator.clipboard.writeText(`https://${host}${path}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Configuration</h1>
          <p className="text-zinc-500 text-sm mt-1">Protocol, hosts, transport and security settings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copySubLink}>
            <Copy size={14} /> Copy Sub Link
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Protocol & Transport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Protocol" description="Select proxy protocol" />
          <div className="grid grid-cols-3 gap-2">
            {['vless', 'trojan', 'ss'].map(p => (
              <button
                key={p}
                onClick={() => setConfig({ ...config, protocol: p })}
                className={`py-3 rounded-xl text-sm font-bold uppercase transition-all ${
                  config.protocol === p
                    ? 'bg-emerald-600 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Transport</label>
              <div className="grid grid-cols-4 gap-2">
                {['ws', 'grpc', 'xhttp', 'tcp'].map(t => (
                  <button
                    key={t}
                    onClick={() => setConfig({ ...config, network: t })}
                    className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                      config.network === t
                        ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                        : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Path"
              value={config.path}
              onChange={e => setConfig({ ...config, path: e.target.value })}
              placeholder="/"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Security" description="TLS and encryption settings" />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Security</label>
              <div className="grid grid-cols-3 gap-2">
                {['tls', 'reality', 'none'].map(s => (
                  <button
                    key={s}
                    onClick={() => setConfig({ ...config, security: s })}
                    className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                      config.security === s
                        ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50'
                        : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Fingerprint</label>
              <select
                value={config.fingerprint}
                onChange={e => setConfig({ ...config, fingerprint: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              >
                {['chrome', 'firefox', 'safari', 'edge', 'random', 'none'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <Toggle
              label="Allow Insecure"
              description="Skip TLS certificate verification"
              checked={config.allowInsecure}
              onChange={v => setConfig({ ...config, allowInsecure: v })}
            />
          </div>
        </Card>
      </div>

      {/* Host Management */}
      <Card>
        <CardHeader
          title="Hosts"
          description="Domain pool for subscription nodes"
          action={
            <div className="flex gap-2">
              <input
                value={newHost}
                onChange={e => setNewHost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHost()}
                placeholder="Add domain..."
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-emerald-500 w-48"
              />
              <Button size="sm" onClick={addHost}>Add</Button>
            </div>
          }
        />
        <div className="space-y-2">
          {hosts.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No hosts configured. Add a domain to get started.</p>
          ) : (
            hosts.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-mono">{h}</span>
                </div>
                <button onClick={() => removeHost(h)} className="text-xs text-zinc-500 hover:text-rose-400">Remove</button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="ECH (Encrypted Client Hello)" />
          <div className="space-y-3">
            <Toggle
              label="Enable ECH"
              description="Encrypt TLS Client Hello for better anti-censorship"
              checked={config.enableECH}
              onChange={v => setConfig({ ...config, enableECH: v })}
            />
            {config.enableECH && (
              <Input
                label="ECH SNI"
                value={config.echSNI}
                onChange={e => setConfig({ ...config, echSNI: e.target.value })}
                placeholder="cloudflare-ech.com"
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="TLS Fragment" />
          <div className="space-y-3">
            <Toggle
              label="Enable Fragment"
              description="Split TLS handshake to bypass DPI"
              checked={config.enableFragment}
              onChange={v => setConfig({ ...config, enableFragment: v })}
            />
            {config.enableFragment && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Length Range"
                  value={config.fragmentLength}
                  onChange={e => setConfig({ ...config, fragmentLength: e.target.value })}
                  placeholder="100-200"
                />
                <Input
                  label="Sleep Range"
                  value={config.fragmentSleep}
                  onChange={e => setConfig({ ...config, fragmentSleep: e.target.value })}
                  placeholder="50-100"
                />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Subscription Settings */}
      <Card>
        <CardHeader title="Subscription" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Subscription Name"
            value={config.subName}
            onChange={e => setConfig({ ...config, subName: e.target.value })}
            placeholder="XRayMOD"
          />
          <Input
            label="Banner Text"
            value={config.subBanner}
            onChange={e => setConfig({ ...config, subBanner: e.target.value })}
            placeholder="Optional banner for subscription page"
          />
        </div>
        <div className="mt-4 space-y-2">
          <Toggle
            label="Base64 Format"
            checked={config.subBase64}
            onChange={v => setConfig({ ...config, subBase64: v })}
          />
          <Toggle
            label="Clash/Mihomo Format"
            checked={config.subClash}
            onChange={v => setConfig({ ...config, subClash: v })}
          />
          <Toggle
            label="sing-box Format"
            checked={config.subSingbox}
            onChange={v => setConfig({ ...config, subSingbox: v })}
          />
          <Toggle
            label="Mixed Protocol"
            description="Cycle between VLESS, Trojan, and SS"
            checked={config.mixedProtocol}
            onChange={v => setConfig({ ...config, mixedProtocol: v })}
          />
        </div>
      </Card>

      {/* Service Control */}
      <Card>
        <CardHeader title="Service Control" />
        <div className="space-y-1">
          <Toggle
            label="Pause Service"
            description="Block all proxy traffic (503) — panel stays open"
            checked={config.paused}
            onChange={v => setConfig({ ...config, paused: v })}
          />
          <Toggle
            label="ISP-aware subscription"
            description="Pick clean IPs based on Iranian ISP (MCI/MTN/...)"
            checked={config.ispAware}
            onChange={v => setConfig({ ...config, ispAware: v })}
          />
          <div className="pt-2">
            <Input
              label="Monthly panel cap (GB)"
              type="number"
              value={config.monthlyCapGb}
              onChange={e => setConfig({ ...config, monthlyCapGb: e.target.value })}
              placeholder="0 = unlimited"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
