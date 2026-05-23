"use client";

import { useState, useMemo, useCallback } from 'react';
import {
  Search, Save, Loader2, Download, AlertTriangle, FileText, ChevronRight, Activity, Filter, Check
} from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Application = {
  id: string;
  fullName: string;
  email: string;
  applicationType: string;
  status: string;
  employmentTerm: string;
  createdAt: string;
  generatedIdNumber: string | null;
  replacementReason: string | null;
  department: { id: string; name: string };
  position: { id: string; title: string };
  photoUrl?: string | null;
  signatureUrl?: string | null;
};

type Department = { id: string; name: string };

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "danger" }> = {
  SUBMITTED:      { label: 'Level 1: Submitted',       color: '#1e5fb8', bg: '#eff6ff', border: '#bfdbfe', variant: "info" },
  MEDIA_APPROVED: { label: 'Level 2: Media Approved',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', variant: "warning" },
  APPROVED:       { label: 'Level 3: HR Approved',     color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', variant: "default" },
  PRINTED:        { label: 'Level 4: Printed',         color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', variant: "secondary" },
  ISSUED:         { label: 'Level 5: Issued',          color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', variant: "success" },
  REJECTED_MEDIA: { label: 'Rejected (Media)',         color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', variant: "danger" },
  REJECTED_HR:    { label: 'Rejected (HR)',            color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', variant: "destructive" },
  REPLACED:       { label: 'Superseded (Archived)',    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', variant: "outline" },
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  const Icon = type === 'success' ? Check : AlertTriangle;
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold animate-slide-up ${bg}`}>
      <Icon size={16} /> {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><XIcon size={14} /></button>
    </div>
  );
}

// Custom simple XIcon for compatibility
function XIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

export default function ApplicationsClient({
  initialApplications,
  departments,
  userRole = 'SUPERADMIN'
}: {
  initialApplications: Application[];
  departments: Department[];
  userRole?: string;
}) {
  const [apps, setApps] = useState<Application[]>(initialApplications);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [overrideApp, setOverrideApp] = useState<Application | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideComment, setOverrideComment] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ msg, type }), []);

  const downloadBiometric = async (url: string | null | undefined, prefix: string) => {
    if (!overrideApp || !url) {
      showToast('Biometric URL is not available.', 'error');
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = overrideApp.fullName.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${safeName}_${prefix}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const filtered = useMemo(() => {
    return apps.filter(a => {
      const matchSearch = a.fullName.toLowerCase().includes(search.toLowerCase()) ||
                          a.email.toLowerCase().includes(search.toLowerCase()) ||
                          (a.generatedIdNumber && a.generatedIdNumber.toLowerCase().includes(search.toLowerCase()));
      const matchDept = !filterDept || a.department.id === filterDept;
      const matchStatus = !filterStatus || a.status === filterStatus;
      const matchTerm = !filterTerm || a.employmentTerm === filterTerm;
      return matchSearch && matchDept && matchStatus && matchTerm;
    });
  }, [apps, search, filterDept, filterStatus, filterTerm]);

  const handleForceStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideApp || !overrideStatus) return;
    setSavingOverride(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force-status',
          id: overrideApp.id,
          status: overrideStatus,
          comment: overrideComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      
      setApps(prev => prev.map(a => a.id === overrideApp.id ? { ...a, status: overrideStatus } : a));
      showToast(`Status updated successfully to ${overrideStatus}!`);
      setOverrideApp(null);
      setOverrideComment('');
    } catch (err: any) {
      showToast(err.message || 'Failed to force status', 'error');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['FullName', 'Email', 'Department', 'Position', 'Type', 'Term', 'Status', 'ID Number', 'Created'];
    const rows = filtered.map(a => [
      a.fullName,
      a.email,
      a.department.name,
      a.position.title,
      a.applicationType,
      a.employmentTerm,
      a.status,
      a.generatedIdNumber || 'N/A',
      new Date(a.createdAt).toLocaleDateString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kyu_applications_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Applications registry exported successfully.');
  };

  // Metrics for filtered dataset
  const metrics = useMemo(() => {
    const total = filtered.length;
    const submitted = filtered.filter(a => a.status === 'SUBMITTED').length;
    const approved = filtered.filter(a => a.status === 'APPROVED').length;
    const printed = filtered.filter(a => a.status === 'PRINTED').length;
    const issued = filtered.filter(a => a.status === 'ISSUED').length;
    const rejected = filtered.filter(a => a.status.startsWith('REJECTED')).length;
    return { total, submitted, approved, printed, issued, rejected };
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">Applications Ledger</h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400">Full operational ledger with global level overrides and data exporting tools.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md focus:ring-4 focus:ring-emerald-500/20 focus:outline-none">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Level / Status Progress Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Registry Size', value: metrics.total, colorClass: 'text-primary' },
          { label: 'L1: Submitted', value: metrics.submitted, colorClass: 'text-blue-600' },
          { label: 'L3: HR Approved', value: metrics.approved, colorClass: 'text-indigo-650 font-extrabold' },
          { label: 'L4: Printed', value: metrics.printed, colorClass: 'text-purple-600' },
          { label: 'L5: Issued', value: metrics.issued, colorClass: 'text-emerald-600' },
          { label: 'Rejected', value: metrics.rejected, colorClass: 'text-rose-500' },
        ].map(m => (
          <Card key={m.label} className="glass-card p-5 relative overflow-hidden border-transparent">
            <CardDescription className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{m.label}</CardDescription>
            <CardTitle className={`text-2xl font-black mt-2 tracking-tight ${m.colorClass}`}>{m.value}</CardTitle>
          </Card>
        ))}
      </div>

      {/* Multi-Filters bar */}
      <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm p-4 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-all">
        {/* Full Text Search */}
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search applicant, email, generated ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input" />
        </div>

        {/* Dropdown Filters using custom styled premium elements */}
        <div className="flex flex-wrap md:flex-nowrap gap-2.5 w-full md:w-auto shrink-0">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border border-slate-200/80 dark:border-slate-800/60 rounded-xl bg-white/70 dark:bg-slate-900/60 text-slate-750 dark:text-slate-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer w-full md:w-auto transition">
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border border-slate-200/80 dark:border-slate-800/60 rounded-xl bg-white/70 dark:bg-slate-900/60 text-slate-750 dark:text-slate-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer w-full md:w-auto transition">
            <option value="">All Levels</option>
            {Object.entries(STATUS_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>

          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border border-slate-200/80 dark:border-slate-800/60 rounded-xl bg-white/70 dark:bg-slate-900/60 text-slate-750 dark:text-slate-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer w-full md:w-auto transition">
            <option value="">All Terms</option>
            <option value="PERMANENT">Permanent</option>
            <option value="CONTRACT">Contract</option>
            <option value="TEMPORARY">Temporary</option>
          </select>
        </div>
      </div>

      {/* Results Table inside Panel */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-250 dark:text-slate-800 animate-pulse" />
            <p className="text-sm text-slate-400 font-medium">No operational applications found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/35 border-b border-slate-100 dark:border-slate-800/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Applicant</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Faculty/Dept</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Type/Term</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">KyU ID</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Workflow Level</TableHead>
                {userRole === 'SUPERADMIN' && (
                  <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right pr-8">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/35">
              {filtered.map(a => {
                const sm = STATUS_META[a.status] || { label: a.status, color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', variant: 'outline' as const };
                return (
                  <TableRow key={a.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                    <TableCell className="px-6 py-4.5">
                      <div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{a.fullName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{a.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4.5">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={a.department.name}>
                        {a.department.name}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{a.position.title}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4.5">
                      <div className="text-xs font-black text-slate-750 dark:text-slate-350">{a.applicationType}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">{a.employmentTerm}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4.5">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{a.generatedIdNumber || '—'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4.5">
                      <Badge variant={sm.variant} className="font-black uppercase tracking-wider text-[9px] px-2.5 py-0.5 border" style={{ borderColor: sm.border + '30' }}>
                        {sm.label}
                      </Badge>
                    </TableCell>
                    {userRole === 'SUPERADMIN' && (
                      <TableCell className="px-6 py-4.5 text-right pr-8">
                        <button onClick={() => {
                          setOverrideApp(a);
                          setOverrideStatus(a.status);
                        }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 active:bg-blue-500/20 dark:bg-blue-500/10 dark:border-blue-500/25 dark:text-blue-400 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition focus:ring-4 focus:ring-blue-500/20 focus:outline-none">
                          Override Level
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Status Override Level Dialog using Shadcn Dialog component ───────── */}
      <Dialog open={!!overrideApp} onOpenChange={(open) => !open && setOverrideApp(null)}>
        <DialogContent className="sm:max-w-md border border-slate-100 dark:border-slate-800">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Activity className="text-amber-500 w-5 h-5 shrink-0" />
              Force Workflow Override
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
              Bypassing Queue For: {overrideApp?.fullName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForceStatus} className="space-y-5 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Target Workflow Level / Status</label>
              <select required className="input-field text-sm p-3 w-full bg-white/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 focus:ring-4 focus:ring-primary/20 focus:outline-none transition cursor-pointer"
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value)}>
                {Object.entries(STATUS_META).map(([key, m]) => (
                  <option key={key} value={key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{m.label}</option>
                ))}
              </select>
            </div>

            {overrideStatus && (
              <div className="px-3.5 py-2.5 rounded-xl text-[10px] font-bold leading-relaxed border transition-all flex items-start gap-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Bypassing standard verification queues can disrupt state tracking. Please ensure the applicant meets all level requirements.
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Audit Comment / Reason</label>
              <textarea required rows={3} placeholder="Please provide technical justification for bypassing normal Level queues…"
                className="input-field text-xs p-3 w-full resize-none font-semibold bg-white/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 focus:ring-4 focus:ring-primary/20 focus:outline-none transition"
                value={overrideComment}
                onChange={e => setOverrideComment(e.target.value)} />
            </div>

            {overrideApp && (
              <div className="border-t border-b border-slate-100 dark:border-slate-800 py-4 my-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Biometric Assets</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadBiometric(overrideApp.photoUrl, 'Passport_Photo')}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase shadow-sm hover:-translate-y-0.5 transition-all duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <Download size={13} /> Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBiometric(overrideApp.signatureUrl, 'Signature')}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase shadow-sm hover:-translate-y-0.5 transition-all duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <Download size={13} /> Signature
                  </button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button type="button" onClick={() => setOverrideApp(null)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200">
                Cancel
              </button>
               <button type="submit" disabled={savingOverride}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                  backgroundColor: '#1e5fb8'
                }}>
                {savingOverride
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} className="stroke-[3]" /> Apply Override</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast notifications */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
