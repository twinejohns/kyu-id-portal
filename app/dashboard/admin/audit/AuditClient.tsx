"use client";

import { useState, useMemo, useCallback } from 'react';
import {
  Search, RefreshCw, ScrollText, Check, AlertTriangle, X
} from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AuditEntry = {
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
};

const ACTION_THEMES: Record<string, { label: string; variant: "success" | "info" | "danger" | "warning" }> = {
  'add-user':        { label: 'Create Account',   variant: 'success' },
  'edit-user':       { label: 'Update Account',   variant: 'info' },
  'delete-user':     { label: 'Delete Account',   variant: 'danger' },
  'add-department':  { label: 'Create Dept',      variant: 'success' },
  'edit-department': { label: 'Rename Dept',      variant: 'info' },
  'delete-department':{ label: 'Delete Dept',     variant: 'danger' },
  'add-position':    { label: 'Create Position',  variant: 'success' },
  'delete-position': { label: 'Delete Position',  variant: 'danger' },
  'save-settings':   { label: 'Branding Settings',variant: 'info' },
  'force-status':    { label: 'Level Override',   variant: 'warning' },
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  const Icon = type === 'success' ? Check : AlertTriangle;
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold animate-slide-up ${bg}`}>
      <Icon size={16} /> {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

export default function AuditClient({ initialLogs }: { initialLogs: AuditEntry[] }) {
  const [logs, setLogs] = useState<AuditEntry[]>(initialLogs);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ msg, type }), []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin?resource=audit');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
      setLogs(data.log || []);
      showToast('Audit trail refreshed successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to sync logs', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    return logs.filter(l =>
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Audit Log</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Real-time append-only administrative trace of security and config overrides.</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Sync Logs
        </button>
      </div>

      {/* Action filters bar */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by actor, action, detail context..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input" />
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pr-1">{filtered.length} log traces</span>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <ScrollText size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-800 animate-pulse" />
            <p className="text-sm text-slate-400 font-medium">No system events logged in this trace.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-800/35 border-b border-slate-100 dark:border-slate-800/50">
                <TableRow className="hover:bg-transparent">
                  {['Timestamp', 'Actor/Operator', 'Event Action', 'Context Details'].map(h => (
                    <TableHead key={h} className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/35">
                {filtered.map((l, idx) => {
                  const theme = ACTION_THEMES[l.action] || { label: l.action, variant: 'default' };
                  return (
                    <TableRow key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/35 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                      <TableCell className="px-6 py-4 text-xs font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString('en-UG', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{l.actor}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={theme.variant} className="text-[10px] font-black uppercase tracking-wider">
                          {theme.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                        {l.detail}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Toast popup alerts */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
