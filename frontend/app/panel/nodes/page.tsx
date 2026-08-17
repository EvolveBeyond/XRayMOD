'use client';

import { useEffect, useState } from 'react';
import { Server, Plus, Trash2, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Agent = {
  id: string;
  name: string;
  host: string;
  port: number;
  status: string;
  last_seen: number | null;
  capabilities: string[];
  legacy_backend_id?: number;
  token?: string;
};

export default function NodesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [legacy, setLegacy] = useState<Agent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [issuedToken, setIssuedToken] = useState('');

  const load = () => {
    api
      .get('/api/agents')
      .then((d) => {
        setAgents(d?.data?.agents || []);
        setLegacy(d?.data?.legacy_backends || []);
      })
      .catch(() => {
        setAgents([]);
        setLegacy([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const enroll = async () => {
    const data = await api.post('/api/agents', { name, host, port: 443 });
    if (data.success) {
      setIssuedToken(data.data?.token || '');
      setShowAdd(false);
      setName('');
      setHost('');
      load();
      toast.success('Agent enrolled — copy the token now');
    } else {
      toast.error(data.message || 'Enroll failed');
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/api/agents/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black">Node Agents</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Data plane runs on your nodes (Xray / sing-box). The Worker only enrolls, heartbeats, and
            pushes desired config.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-sm"
        >
          <Plus size={16} /> Enroll agent
        </button>
      </div>

      {issuedToken && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="text-amber-200 mb-2">One-time token (Authorization: Bearer …)</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 break-all text-xs text-zinc-200">{issuedToken}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(issuedToken);
                toast.success('Copied');
              }}
              className="text-zinc-400 hover:text-white"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            POST /api/agents/heartbeat · GET /api/agents/config · GET /api/agents/health
          </p>
        </div>
      )}

      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold">Enroll Node Agent</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agent name"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Node hostname or IP"
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <button onClick={enroll} className="px-4 py-2 bg-emerald-600 text-black font-bold rounded-xl text-sm">
              Enroll
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-zinc-800 text-zinc-400 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {agents.map((node) => (
          <div
            key={node.id}
            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  node.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                <Server size={24} />
              </div>
              <div>
                <h3 className="font-bold">{node.name}</h3>
                <p className="text-xs font-mono text-zinc-500">
                  {node.host || '—'}
                  {node.port ? `:${node.port}` : ''} · {node.status}
                </p>
              </div>
            </div>
            <button onClick={() => remove(node.id)} className="text-zinc-500 hover:text-rose-500">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {!agents.length && (
          <p className="text-sm text-zinc-500">No Node Agents yet. Enroll one, then run the agent on the VPS.</p>
        )}
      </div>

      {legacy.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-2">Legacy backends (compatibility)</h3>
          <div className="space-y-2">
            {legacy.map((b) => (
              <div key={b.id} className="text-xs font-mono text-zinc-500 border border-zinc-800 rounded-xl px-3 py-2">
                {b.name} · {b.host}:{b.port} · {b.status}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
