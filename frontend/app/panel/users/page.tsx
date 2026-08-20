'use client';

import { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Copy,
  Search,
  Ban,
  CheckCircle,
  Edit2,
  X,
  Zap,
  ExternalLink,
  Link2,
  LayoutDashboard,
} from 'lucide-react';
import { api, asList } from '@/lib/api';
import { secureSubUrl, getPanelPrefix } from '@/lib/paths';
import { Card, CardHeader, Button, Input, StatusBadge, ProgressBar, EmptyState } from '@/components';
import { toast } from 'sonner';

interface User {
  id: string | number;
  username: string;
  email: string;
  uuid: string;
  traffic_limit: number;
  traffic_used: number;
  used?: number;
  limit?: number;
  status: 'active' | 'expired' | 'disabled' | 'paused';
  expiry_date: string;
  days_left?: number | null;
  created_at: number;
  enable: boolean;
  speed_limit: number;
  sub_id?: string;
  sub_path?: string;
  status_path?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdLinks, setCreatedLinks] = useState<{ sub: string; status: string; user: string } | null>(null);

  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    traffic_limit: 100,
    expiry_days: 30,
    speed_limit: 0,
    enable: true,
  });

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    traffic_limit: 100,
    expiry_days: 30,
    speed_limit: 0,
    enable: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/users');
      setUsers(asList<User>(data));
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  const subUrl = (u: User) => {
    const id = String(u.uuid || u.sub_id || '');
    if (!id) return '';
    if (u.sub_path?.startsWith('http')) return u.sub_path;
    return secureSubUrl(id) || `${typeof window !== 'undefined' ? window.location.origin : ''}${getPanelPrefix()}/sub/${id}`;
  };
  const statusUrl = (u: User) => {
    const id = String(u.uuid || u.sub_id || '');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${getPanelPrefix()}/me/${id}`;
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };

  const addUser = async () => {
    if (!addForm.username.trim()) {
      toast.error('Username required');
      return;
    }
    try {
      const res = await api.post('/api/users', {
        username: addForm.username,
        email: addForm.email,
        limit: addForm.traffic_limit,
        expiryDays: addForm.expiry_days,
        enable: addForm.enable,
      });
      if (res.success === false) {
        toast.error(res.message || 'Error');
        return;
      }
      const d = res.data || {};
      const uuid = d.uuid;
      if (uuid) {
        setCreatedLinks({
          user: d.username || addForm.username,
          sub: d.sub_url || secureSubUrl(uuid),
          status: d.status_url || `${typeof window !== 'undefined' ? window.location.origin : ''}${getPanelPrefix()}/me/${uuid}`,
        });
      }
      toast.success('User created');
      setShowAdd(false);
      setAddForm({ username: '', email: '', traffic_limit: 100, expiry_days: 30, speed_limit: 0, enable: true });
      loadUsers();
    } catch {
      toast.error('Network error');
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      const expiry = new Date(Date.now() + editForm.expiry_days * 86400000).toISOString().split('T')[0];
      await api.put(`/api/users/${editingUser.id}`, {
        username: editForm.username,
        email: editForm.email,
        limit: editForm.traffic_limit,
        expiry,
        enable: editForm.enable,
      });
      toast.success('Saved');
      setEditingUser(null);
      loadUsers();
    } catch {
      toast.error('Error');
    }
  };

  const deleteUser = async (id: string | number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/users/${id}`);
      toast.success('Deleted');
      loadUsers();
    } catch {
      /* ignore */
    }
  };

  const toggleUser = async (id: string | number, enable: boolean) => {
    try {
      await api.put(`/api/users/${id}`, { enable });
      loadUsers();
    } catch {
      /* ignore */
    }
  };

  const resetQuota = async (id: string | number) => {
    try {
      await api.put(`/api/users/${id}`, { used: 0 });
      toast.success('Quota reset');
      loadUsers();
    } catch {
      /* ignore */
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    const limitGB = user.limit ?? (user.traffic_limit ? user.traffic_limit / 1024 ** 3 : 100);
    setEditForm({
      username: user.username,
      email: user.email || '',
      traffic_limit: Math.round(limitGB) || 100,
      expiry_days: user.expiry_date
        ? Math.max(1, Math.ceil((new Date(user.expiry_date).getTime() - Date.now()) / 86400000))
        : 30,
      speed_limit: user.speed_limit || 0,
      enable: user.enable !== false && user.status === 'active',
    });
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const usedGB = (u: User) => u.used ?? (u.traffic_used ? u.traffic_used / 1024 ** 3 : 0);
  const limitGB = (u: User) => u.limit ?? (u.traffic_limit ? u.traffic_limit / 1024 ** 3 : 0);

  const formatGB = (gb: number) => {
    if (!gb) return '0 GB';
    if (gb >= 1024) return (gb / 1024).toFixed(1) + ' TB';
    return Math.round(gb * 10) / 10 + ' GB';
  };

  const formatDate = (d: string | number) => {
    if (!d) return 'N/A';
    if (typeof d === 'string') return d;
    const ms = d > 1e12 ? d : d * 1000;
    return new Date(ms).toLocaleDateString('fa-IR');
  };

  const daysBadge = (u: User) => {
    const d = u.days_left;
    if (d === null || d === undefined) return <span className="text-[10px] text-zinc-600">∞</span>;
    if (d < 0) return <span className="text-[10px] text-rose-400 font-bold">Expired</span>;
    if (d <= 3) return <span className="text-[10px] text-amber-400 font-bold">{d} days</span>;
    return <span className="text-[10px] text-zinc-400">{d} days</span>;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Users</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {users.length} users · each user has a separate status page + sub
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full sm:w-48 pl-9 pr-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>

      {createdLinks && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader
            title={`Links for ${createdLinks.user}`}
            action={
              <Button variant="ghost" size="sm" onClick={() => setCreatedLinks(null)}>
                <X size={14} />
              </Button>
            }
          />
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <p className="text-[10px] font-bold text-emerald-400 mb-1">Status page (for user)</p>
              <p className="text-xs font-mono break-all text-zinc-300">{createdLinks.status}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => copy(createdLinks.status, 'Status page')}>
                  <Copy size={12} /> Copy
                </Button>
                <a href={createdLinks.status} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="secondary">
                    <ExternalLink size={12} /> Open
                  </Button>
                </a>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <p className="text-[10px] font-bold text-blue-400 mb-1">Sub link (client)</p>
              <p className="text-xs font-mono break-all text-zinc-300">{createdLinks.sub}</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => copy(createdLinks.sub, 'Sub')}>
                <Copy size={12} /> Copy sub
              </Button>
            </div>
          </div>
        </Card>
      )}

      {showAdd && (
        <Card>
          <CardHeader
            title="New user"
            action={
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                <X size={14} />
              </Button>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Username"
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              placeholder="e.g. ali"
            />
            <Input
              label="Email (optional)"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />
            <Input
              label="Traffic limit (GB)"
              type="number"
              value={addForm.traffic_limit}
              onChange={(e) => setAddForm({ ...addForm, traffic_limit: Number(e.target.value) })}
            />
            <Input
              label="Expiry (days)"
              type="number"
              value={addForm.expiry_days}
              onChange={(e) => setAddForm({ ...addForm, expiry_days: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={addUser}>Create + links</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg">
            <CardHeader
              title={`Edit: ${editingUser.username}`}
              action={
                <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                  <X size={14} />
                </Button>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
              <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Limit (GB)" type="number" value={editForm.traffic_limit} onChange={(e) => setEditForm({ ...editForm, traffic_limit: Number(e.target.value) })} />
              <Input label="Expiry (days)" type="number" value={editForm.expiry_days} onChange={(e) => setEditForm({ ...editForm, expiry_days: Number(e.target.value) })} />
              <label className="flex items-center gap-2 cursor-pointer pt-6">
                <input
                  type="checkbox"
                  checked={editForm.enable}
                  onChange={(e) => setEditForm({ ...editForm, enable: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={updateUser}>Save</Button>
              <Button variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={search ? 'No users found' : 'No users yet'}
            description="Create the first user — sub + status page are generated automatically."
            action={
              !search ? (
                <Button onClick={() => setShowAdd(true)}>
                  <Plus size={14} /> Add user
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((user) => {
            const used = usedGB(user);
            const lim = limitGB(user);
            const pct = lim > 0 ? Math.min(100, (used / lim) * 100) : 0;
            return (
              <Card key={user.id} className="hover:border-zinc-700/80 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-zinc-800 flex items-center justify-center text-sm font-black text-emerald-400 shrink-0">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{user.username}</p>
                        <StatusBadge status={user.enable !== false ? 'active' : 'disabled'} />
                        {daysBadge(user)}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono truncate">{user.uuid}</p>
                    </div>
                  </div>

                  <div className="w-full md:w-44 shrink-0">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                      <span>{formatGB(used)}</span>
                      <span>{formatGB(lim)}</span>
                    </div>
                    <ProgressBar value={used} max={lim || 1} size="sm" color={pct >= 90 ? 'amber' : 'emerald'} />
                    <p className="text-[10px] text-zinc-600 mt-1">Expires: {formatDate(user.expiry_date)}</p>
                  </div>

                  <div className="flex items-center flex-wrap gap-1 justify-end shrink-0">
                    <button
                      onClick={() => copy(statusUrl(user), 'Status page')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                      title="Copy status page"
                    >
                      <LayoutDashboard size={12} /> Status
                    </button>
                    <button
                      onClick={() => copy(subUrl(user), 'Sub link')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                      title="Copy sub"
                    >
                      <Link2 size={12} /> Sub
                    </button>
                    <a
                      href={statusUrl(user)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                      title="Open user page"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleUser(user.id, user.enable === false)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800"
                      title={user.enable !== false ? 'Disable' : 'Enable'}
                    >
                      {user.enable !== false ? <Ban size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button onClick={() => resetQuota(user.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800" title="Reset quota">
                      <Zap size={14} />
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
