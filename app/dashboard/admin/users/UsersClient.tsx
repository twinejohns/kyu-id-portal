"use client";

import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, Eye, EyeOff,
  Check, AlertTriangle, Shield, Key
} from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type User = { id: string; name: string; email: string; role: string; createdAt: string };

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string; desc: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "danger" }> = {
  SUPERADMIN:   { label: 'Super Admin',   color: '#7c3aed', bg: '#f3e8ff', border: '#c4b5fd', desc: 'Full system control — all modules and settings.', variant: "secondary" },
  MEDIAOFFICER: { label: 'DICTS Media',   color: '#0f3c78', bg: '#dbeafe', border: '#93c5fd', desc: 'Level 1 — Verifies photo & signature quality.', variant: "info" },
  HR:           { label: 'HR Admin',      color: '#065f46', bg: '#d1fae5', border: '#6ee7b7', desc: 'Level 2 — Validates contract and assigns ID number.', variant: "default" },
  PRINTER:      { label: 'Printer',       color: '#92400e', bg: '#fef3c7', border: '#fcd34d', desc: 'Level 3 — Prints and queues physical ID cards.', variant: "warning" },
  ISSUANCE:     { label: 'Issuance Desk', color: '#9d174d', bg: '#fce7f3', border: '#f9a8d4', desc: 'Level 4 — Hands over card and marks as issued.', variant: "danger" },
};

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  const Icon = type === 'success' ? Check : type === 'error' ? AlertTriangle : Shield;
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

interface UserFormData { name: string; email: string; password: string; role: string }
const EMPTY_FORM: UserFormData = { name: '', email: '', password: '', role: 'MEDIAOFFICER' };

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers]         = useState<User[]>(initialUsers);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [form, setForm]           = useState<UserFormData>(EMPTY_FORM);
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [confirm, setConfirm]     = useState<{ user: User } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // Reset-password modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw, setResetPw]         = useState('');
  const [resetShowPw, setResetShowPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ msg, type }), []);

  const api = useCallback(async (body: Record<string, unknown>) => {
    const res  = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const filtered = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditUser(null); setShowModal(true); };
  const openEdit = (u: User) => { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditUser(u); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditUser(null); setForm(EMPTY_FORM); };
  const openReset = (u: User) => { setResetTarget(u); setResetPw(''); setResetShowPw(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editUser) {
        const data = await api({ action: 'edit-user', id: editUser.id, ...form });
        setUsers(prev => prev.map(u => u.id === editUser.id ? data.user : u));
        showToast(`"${data.user.name}" updated!`);
      } else {
        const data = await api({ action: 'add-user', ...form });
        setUsers(prev => [data.user, ...prev]);
        showToast(`Account for "${data.user.name}" created!`);
      }
      closeModal();
    } catch (err: unknown) { showToast(String(err), 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await api({ action: 'delete-user', id: confirm.user.id });
      setUsers(prev => prev.filter(u => u.id !== confirm.user.id));
      showToast(`"${confirm.user.name}" deleted.`, 'info');
      setConfirm(null);
    } catch (err: unknown) { showToast(String(err), 'error'); }
    finally { setConfirmLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetPw) return;
    setResetLoading(true);
    try {
      const data = await api({ action: 'edit-user', id: resetTarget.id, name: resetTarget.name, email: resetTarget.email, role: resetTarget.role, password: resetPw });
      setUsers(prev => prev.map(u => u.id === resetTarget.id ? data.user : u));
      showToast(`Password reset for "${resetTarget.name}".`);
      setResetTarget(null);
    } catch (err: unknown) { showToast(String(err), 'error'); }
    finally { setResetLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">Users & Roles</h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400">Manage system accounts and role assignments.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250"
          style={{
            backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
            backgroundColor: '#1e5fb8'
          }}>
          <Plus size={15} className="stroke-[3]" /> Add User
        </button>
      </div>

      {/* Role reference cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(ROLE_META).map(([role, m]) => (
          <div key={role} className="rounded-2xl p-4 border transition-all hover:shadow-md hover:-translate-y-0.5 backdrop-blur-xs duration-350" style={{ background: m.bg, borderColor: m.border + '50' }}>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: m.color }}>{m.label}</div>
            <div className="text-[10px] font-bold text-slate-600 leading-relaxed dark:text-slate-350 uppercase tracking-normal">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Search + count */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name, email or role…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input" />
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pr-1">{filtered.length} account{filtered.length !== 1 ? 's' : ''} total</span>
      </div>

      {/* User Table inside a beautiful glassy panel */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 text-slate-200 dark:text-slate-800" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-sm text-slate-400 font-medium">
              {search ? 'No users match your search.' : 'No accounts yet — click Add User to get started.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/35 border-b border-slate-100 dark:border-slate-800/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Account</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Email</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Role</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Joined</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/35">
              {filtered.map(u => {
                const rm = ROLE_META[u.role] || { label: u.role, color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', variant: 'outline' as const };
                return (
                  <TableRow key={u.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                    <TableCell className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-slate-100 dark:border-slate-800 shrink-0">
                          <AvatarFallback className="text-white text-xs font-black" style={{ background: rm.color }}>
                            {u.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-sm text-slate-500 dark:text-slate-400">{u.email}</TableCell>
                    <TableCell className="px-6 py-4.5">
                      <Badge variant={rm.variant} className="font-black uppercase tracking-wider text-[9px] px-2.5 py-0.5 border" style={{ borderColor: rm.border + '30' }}>
                        {rm.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-xs text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="px-6 py-4.5 text-right pr-8">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => openEdit(u)}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-250 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60 transition" title="Edit">
                          <Pencil size={13.5} />
                        </button>
                        <button onClick={() => openReset(u)}
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60 transition" title="Reset Password">
                          <Key size={13.5} />
                        </button>
                        <button onClick={() => setConfirm({ user: u })}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60 transition" title="Delete">
                          <Trash2 size={13.5} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Add / Edit Dialog using Shadcn Dialog component ──────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
              {editUser ? 'Edit User Account' : 'Create New Account'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
              {editUser ? `Editing user profile: ${editUser.name}` : 'Assign a new member to the system'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Full Name</label>
                <input required type="text" placeholder="e.g. Samuel Okello"
                  className="input-field text-sm p-3 w-full"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Email Address</label>
                <input required type="email" placeholder="e.g. sokello@kyu.ac.ug"
                  className="input-field text-sm p-3 w-full"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Password {editUser && <span className="font-normal text-slate-400 normal-case">(leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'}
                  required={!editUser}
                  placeholder="••••••••"
                  className="input-field text-sm p-3 w-full pr-11"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">System Role</label>
              <select className="input-field text-sm p-3 w-full" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {Object.entries(ROLE_META).map(([role, m]) => (
                  <option key={role} value={role}>{m.label}</option>
                ))}
              </select>
              {form.role && ROLE_META[form.role] && (
                <div className="mt-2.5 px-3.5 py-2.5 rounded-xl text-[10px] font-semibold leading-relaxed border transition-all"
                  style={{ background: ROLE_META[form.role].bg, color: ROLE_META[form.role].color, borderColor: ROLE_META[form.role].border + '40' }}>
                  {ROLE_META[form.role].desc}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button type="button" onClick={closeModal}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 hover:border-blue-450 dark:border-blue-800 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                  backgroundColor: '#1e5fb8'
                }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : editUser
                    ? <><Check size={14} className="stroke-[3]" /> Save Changes</>
                    : <><Plus size={14} className="stroke-[3]" /> Create Account</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog using Shadcn Dialog component */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-md border border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-500 w-5 h-5" /> Delete User Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed mt-2.5">
              This will permanently revoke system access for <strong className="text-slate-800 dark:text-slate-200">{confirm?.user.email}</strong>. This account will no longer be able to log in, and all audit logs associated with this operator will remain archived.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
            <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 hover:border-blue-450 dark:border-blue-800 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200">Cancel</button>
            <button onClick={handleDelete} disabled={confirmLoading}
              className="px-4 py-2 text-white rounded-xl text-xs font-black transition-all hover:shadow-md focus:ring-4 focus:ring-rose-500/30 flex items-center gap-1.5 disabled:opacity-60 bg-rose-600 hover:bg-rose-700"
              style={{
                backgroundImage: 'linear-gradient(to right, #e11d48, #be123c)',
                backgroundColor: '#e11d48'
              }}>
              {confirmLoading && <Loader2 size={12} className="animate-spin" />} Delete Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-sm border border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="text-amber-500 w-4 h-4" /> Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Set a new password for <strong className="text-slate-800 dark:text-slate-200">{resetTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={resetShowPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="input-field text-sm p-3 w-full pr-11"
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={() => setResetShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {resetShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button type="button" onClick={() => setResetTarget(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-200 hover:border-blue-450 dark:border-blue-800 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200">
                Cancel
              </button>
              <button type="submit" disabled={resetLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250 disabled:opacity-60 disabled:transform-none"
                style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}>
                {resetLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Key size={14} className="stroke-[2.5]" /> Reset Password</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
