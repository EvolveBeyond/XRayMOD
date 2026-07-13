'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Edit2, Copy, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, Button, Input, StatusBadge, EmptyState } from '@/components';

interface Protocol {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

const PROTOCOL_TYPES = [
  { id: 'vless', name: 'VLESS', description: 'Lightweight, fast, no encryption overhead' },
  { id: 'trojan', name: 'Trojan', description: 'TLS-based, looks like normal HTTPS' },
  { id: 'shadowsocks', name: 'Shadowsocks', description: 'Encrypted proxy protocol' },
];

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    type: 'vless',
    enabled: true,
    config: {
      transport: 'ws',
      security: 'tls',
      fingerprint: 'chrome',
    },
  });

  useEffect(() => { loadProtocols(); }, []);

  const loadProtocols = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/config.json');
      if (data) {
        const p: Protocol = {
          id: 'default',
          name: data.subName || 'XRayMOD',
          type: data.protocol || 'vless',
          enabled: !data.paused,
          config: {
            transport: data.network || 'ws',
            security: data.security || 'tls',
            fingerprint: data.fingerprint || 'chrome',
            path: data.path || '/',
            host: data.host?.[0] || '',
            flow: data.flow || '',
            enableECH: data.enableECH || false,
            enableFragment: data.enableFragment || false,
          },
        };
        setProtocols([p]);
      }
    } catch { setProtocols([]); }
    setLoading(false);
  };

  const toggleProtocol = async (id: string, enabled: boolean) => {
    try {
      await api.post('/admin/config.json', { paused: !enabled });
      loadProtocols();
    } catch {}
  };

  const copySubLink = () => {
    const host = window.location.hostname;
    navigator.clipboard.writeText(`https://${host}/sub`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Protocols</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage proxy protocols and transport settings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copySubLink}><Copy size={14} /> Copy Sub Link</Button>
        </div>
      </div>

      {/* Protocol Cards */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        </Card>
      ) : protocols.length === 0 ? (
        <Card>
          <EmptyState
            icon={Shield}
            title="No protocols configured"
            description="Set up your first protocol in the Config page."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map(protocol => (
            <Card key={protocol.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    protocol.type === 'vless' ? 'bg-emerald-500/10 text-emerald-500' :
                    protocol.type === 'trojan' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {protocol.type.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold">{protocol.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase">{protocol.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleProtocol(protocol.id, !protocol.enabled)}
                  className={`w-10 h-6 rounded-full transition-colors ${protocol.enabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${protocol.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Transport</span>
                  <span className="font-mono uppercase">{protocol.config.transport}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Security</span>
                  <span className="font-mono uppercase">{protocol.config.security}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Fingerprint</span>
                  <span className="font-mono">{protocol.config.fingerprint}</span>
                </div>
                {protocol.config.enableECH && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                    <span className="text-zinc-500">ECH</span>
                    <StatusBadge status="Enabled" variant="success" />
                  </div>
                )}
                {protocol.config.enableFragment && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                    <span className="text-zinc-500">Fragment</span>
                    <StatusBadge status="Enabled" variant="success" />
                  </div>
                )}
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Path</span>
                  <span className="font-mono">{protocol.config.path || '/'}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(protocol)} className="flex-1">
                  <Edit2 size={12} /> Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={copySubLink} className="flex-1">
                  <Copy size={12} /> Copy Link
                </Button>
              </div>
            </Card>
          ))}

          {/* Add Protocol Card */}
          <button
            onClick={() => window.location.href = '/panel/config'}
            className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center">
              <Plus className="w-6 h-6 text-zinc-500" />
            </div>
            <span className="text-sm text-zinc-500">Configure Protocol</span>
          </button>
        </div>
      )}

      {/* Protocol Types Reference */}
      <Card>
        <CardHeader title="Protocol Reference" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROTOCOL_TYPES.map(type => (
            <div key={type.id} className="p-4 bg-zinc-800/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  type.id === 'vless' ? 'bg-emerald-500/10 text-emerald-500' :
                  type.id === 'trojan' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  {type.id.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-sm">{type.name}</span>
              </div>
              <p className="text-xs text-zinc-500">{type.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
