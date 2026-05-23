"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye, FileText, AlertCircle, CheckCircle2, Clock, X, MessageSquare,
  Save, Loader2, Send, Sparkles, Search, Filter, XCircle, Printer, Mail, CreditCard, Download
} from 'lucide-react';
import BiometricEditor from '@/components/BiometricEditor';
import VirtualIdCard from '@/components/VirtualIdCard';

interface Department {
  id: string;
  name: string;
  positions: { id: string; title: string }[];
}

interface ApplicationNote {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface Application {
  id: string;
  fullName: string;
  email: string;
  positionId: string;
  position: { id: string; title: string };
  departmentId: string;
  department: { id: string; name: string };
  applicationType: string;
  currentIdNumber: string | null;
  replacementReason: string | null;
  employmentTerm: string;
  appointmentDate: string;
  expiryDate: string | null;
  generatedIdNumber: string | null;
  appointmentLetterUrl: string;
  photoUrl: string;
  signatureUrl: string;
  status: string;
  dictsComments: string | null;
  hrComments: string | null;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  SUBMITTED:      { label: 'Submitted',       cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  MEDIA_APPROVED: { label: 'Media Approved',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  APPROVED:       { label: 'HR Approved',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  PRINTED:        { label: 'Printed',         cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
  ISSUED:         { label: 'Issued',          cls: 'bg-green-50 text-green-800 border border-green-200' },
  REJECTED_MEDIA: { label: 'Rejected (Media)',cls: 'bg-red-50 text-red-600 border border-red-200' },
  REJECTED_HR:    { label: 'Rejected (HR)',   cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  REPLACED:       { label: 'Superseded (Archived)', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

const FILTER_OPTIONS = [
  { key: 'ALL',           label: 'All' },
  { key: 'MEDIA_APPROVED',label: 'Awaiting HR' },
  { key: 'APPROVED',      label: 'Approved' },
  { key: 'REJECTED_HR',   label: 'Rejected' },
  { key: 'PRINTED',       label: 'Printed' },
  { key: 'ISSUED',        label: 'Issued' },
];

export default function HRDashboard() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications]     = useState<Application[]>([]);
  const [departments,  setDepartments]      = useState<Department[]>([]);
  const [loading,      setLoading]          = useState(true);
  const [selectedApp,  setSelectedApp]      = useState<Application | null>(null);
  const [searchQuery,  setSearchQuery]      = useState('');
  const [activeFilter, setActiveFilter]     = useState('ALL');
  const [showEmailLog, setShowEmailLog]     = useState(false);

  // Inline Editing
  const [isEditing,        setIsEditing]        = useState(false);
  const [editForm,         setEditForm]          = useState({
    fullName: '', email: '', departmentId: '', positionId: '',
    employmentTerm: 'PERMANENT', appointmentDate: '', expiryDate: '', generatedIdNumber: ''
  });

  // Biometric editor
  const [biometricEditor, setBiometricEditor] = useState<{
    isOpen: boolean; imageSrc: string; aspectRatio: number; type: 'photo' | 'signature';
  } | null>(null);

  // Notes chat
  const [notes,       setNotes]       = useState<ApplicationNote[]>([]);
  const [newNote,     setNewNote]     = useState('');
  const [postingNote, setPostingNote] = useState(false);
  const [session,     setSession]     = useState<{ name: string; role: string } | null>(null);

  // Reject
  const [rejectComment,      setRejectComment]      = useState('');
  const [showRejectModal,    setShowRejectModal]     = useState(false);
  const [submittingDecision, setSubmittingDecision]  = useState(false);
  const [generatingId,       setGeneratingId]        = useState(false);

  const downloadBiometric = async (url: string, prefix: string) => {
    if (!selectedApp) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = selectedApp.fullName.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${safeName}_${prefix}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  // ID number change confirmation
  const [idChangeConfirm, setIdChangeConfirm] = useState<{ pendingValue: string } | null>(null);

  // Virtual ID viewer
  const [viewingVirtualId, setViewingVirtualId] = useState<Application | null>(null);
  const [cardSettings, setCardSettings] = useState<{ secretarySignatureUrl?: string; returnAddress?: string }>({});

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [appRes, deptRes, sessRes] = await Promise.all([
        fetch('/api/applications/all'),
        fetch('/api/data'),
        fetch('/api/auth/session'),
      ]);
      const appData  = await appRes.json();
      const deptData = await deptRes.json();
      const sessData = await sessRes.json();

      setApplications(appData.applications || []);
      setDepartments(deptData || []);
      setSession(sessData.success ? sessData.session : { name: 'HR Admin', role: 'HR' });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData();
    setMounted(true);
    // Fetch card settings for Virtual ID viewer
    fetch('/api/admin?resource=settings').then(r => r.json()).then(d => {
      if (d.success) setCardSettings(d.settings);
    }).catch(() => {});
  }, []);

  // Poll notes for selected app
  useEffect(() => {
    let notePoll: NodeJS.Timeout;
    if (selectedApp) {
      const fetchNotes = async () => {
        try {
          const res  = await fetch(`/api/chat/${selectedApp.id}`);
          const data = await res.json();
          if (data.success) setNotes(data.notes);
        } catch (err) { console.error(err); }
      };
      fetchNotes();
      notePoll = setInterval(fetchNotes, 3000);
    }
    return () => { if (notePoll) clearInterval(notePoll); };
  }, [selectedApp]);

  // ─── Filtered + Searched Applications ─────────────────────────
  const filteredApps = useMemo(() => {
    let result = applications;
    if (activeFilter !== 'ALL') {
      result = result.filter(a => a.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.department.name.toLowerCase().includes(q) ||
        (a.generatedIdNumber || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [applications, activeFilter, searchQuery]);

  // ─── Action Handlers ───────────────────────────────────────────
  const handleOpenReview = (app: Application) => {
    setSelectedApp(app);
    setIsEditing(false);
    setEditForm({
      fullName:         app.fullName,
      email:            app.email,
      departmentId:     app.departmentId,
      positionId:       app.positionId,
      employmentTerm:   app.employmentTerm,
      appointmentDate:  new Date(app.appointmentDate).toISOString().split('T')[0],
      expiryDate:       app.expiryDate ? new Date(app.expiryDate).toISOString().split('T')[0] : '',
      generatedIdNumber: app.generatedIdNumber || ''
    });
  };

  const handleAutoGenerateId = async () => {
    setGeneratingId(true);
    try {
      const res  = await fetch(`/api/admin/next-id?term=${editForm.employmentTerm}`);
      const data = await res.json();
      if (data.success) setEditForm(prev => ({ ...prev, generatedIdNumber: data.nextIdNumber }));
    } catch (err) { console.error(err); }
    finally { setGeneratingId(false); }
  };

  const handleSaveDetails = async () => {
    if (!selectedApp) return;
    try {
      const payload: Record<string, unknown> = {
        fullName:         editForm.fullName,
        email:            editForm.email,
        departmentId:     editForm.departmentId,
        positionId:       editForm.positionId,
        employmentTerm:   editForm.employmentTerm,
        appointmentDate:  editForm.appointmentDate,
        generatedIdNumber: editForm.generatedIdNumber || null,
        expiryDate:       editForm.employmentTerm === 'PERMANENT' ? null : (editForm.expiryDate || null),
      };
      const res  = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(prev => prev ? { ...prev, ...data.application } : null);
        setIsEditing(false);
        fetchData();
      }
    } catch { alert('Failed to save changes'); }
  };

  const handleTriggerBiometricEdit = (type: 'photo' | 'signature') => {
    if (!selectedApp) return;
    setBiometricEditor({
      isOpen: true,
      imageSrc: type === 'photo' ? selectedApp.photoUrl : selectedApp.signatureUrl,
      aspectRatio: type === 'photo' ? 1 : 3,
      type,
    });
  };

  const handleSaveCroppedBiometric = async (croppedBlob: Blob) => {
    if (!selectedApp || !biometricEditor) return;
    const { type } = biometricEditor;
    setBiometricEditor(null);
    const fd = new FormData();
    fd.append('file', croppedBlob, `${type}-cropped-${Date.now()}.png`);
    const uploadRes  = await fetch('/api/upload', { method: 'POST', body: fd });
    const uploadData = await uploadRes.json();
    if (!uploadData.url) { alert('Failed to upload processed biometric'); return; }
    const updatePayload = type === 'photo' ? { photoUrl: uploadData.url } : { signatureUrl: uploadData.url };
    const patchRes  = await fetch(`/api/applications/${selectedApp.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatePayload),
    });
    const patchData = await patchRes.json();
    if (patchData.success) {
      setSelectedApp(prev => prev ? { ...prev, ...patchData.application } : null);
      fetchData();
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedApp || postingNote || !session) return;
    setPostingNote(true);
    try {
      const res  = await fetch(`/api/chat/${selectedApp.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName: session.name, senderRole: session.role, message: newNote }),
      });
      const data = await res.json();
      if (data.success) { setNotes(prev => [...prev, data.note]); setNewNote(''); }
    } catch (err) { console.error(err); }
    finally { setPostingNote(false); }
  };

  const handleDecision = async (status: 'APPROVED' | 'REJECTED_HR') => {
    if (!selectedApp || submittingDecision) return;
    if (status === 'APPROVED' && !editForm.generatedIdNumber) {
      alert('Please assign or auto-generate a valid Kyambogo ID Number before approving.');
      return;
    }
    if (status === 'APPROVED' && editForm.employmentTerm !== 'PERMANENT' && !editForm.expiryDate) {
      alert('Non-permanent contracts require an expiry date.');
      return;
    }
    setSubmittingDecision(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        hrComments:       status === 'REJECTED_HR' ? rejectComment : null,
        generatedIdNumber: status === 'APPROVED' ? editForm.generatedIdNumber : selectedApp.generatedIdNumber,
        expiryDate:       status === 'APPROVED' && editForm.employmentTerm !== 'PERMANENT' ? editForm.expiryDate : null,
      };
      const res  = await fetch(`/api/applications/${selectedApp.id}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(null); setShowRejectModal(false); setRejectComment('');
        fetchData();
      }
    } catch { alert('Failed to submit HR review decision'); }
    finally { setSubmittingDecision(false); }
  };

  // ─── Derived Stats ─────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary-color)' }} />
      <p className="text-sm text-gray-400 font-medium">Loading HR Dashboard…</p>
    </div>
  );

  const totalSubmissions = applications.length;
  const pendingHrCount   = applications.filter(a => a.status === 'MEDIA_APPROVED').length;
  const approvedHrCount  = applications.filter(a => ['APPROVED', 'PRINTED', 'ISSUED'].includes(a.status)).length;
  const rejectedCount    = applications.filter(a => a.status === 'REJECTED_HR').length;
  const printedCount     = applications.filter(a => ['PRINTED', 'ISSUED'].includes(a.status)).length;
  const positions        = departments.find(d => d.id === editForm.departmentId)?.positions || [];

  return (
    <div className="space-y-6 animate-fade-in relative z-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
            HR Registry Control
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400 font-medium">
            Review media-approved applications, allocate staff ID codes, and process contract tenures.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            {pendingHrCount > 0 ? `${pendingHrCount} Awaiting Review` : "Queue Clear"}
          </span>
        </div>
      </div>

      {/* ── KPI Tiles ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Submissions', value: totalSubmissions, iconBg: 'bg-blue-600 dark:bg-blue-500', grad: 'from-blue-600/10 to-white dark:to-slate-800/40', icon: <FileText className="text-white w-6 h-6" /> },
          { label: 'Pending HR Review', value: pendingHrCount, iconBg: 'bg-amber-500 dark:bg-amber-400', grad: 'from-amber-600/10 to-white dark:to-slate-800/40', icon: <Clock className="text-white w-6 h-6" /> },
          { label: 'Approved & Issued', value: approvedHrCount, iconBg: 'bg-emerald-600 dark:bg-emerald-500', grad: 'from-emerald-600/10 to-white dark:to-slate-800/40', icon: <CheckCircle2 className="text-white w-6 h-6" /> },
          { label: 'Rejected by HR', value: rejectedCount, iconBg: 'bg-rose-500 dark:bg-rose-400', grad: 'from-rose-600/10 to-white dark:to-slate-800/40', icon: <XCircle className="text-white w-6 h-6" /> },
          { label: 'Printed & Ready', value: printedCount, iconBg: 'bg-violet-600 dark:bg-violet-500', grad: 'from-violet-600/10 to-white dark:to-slate-800/40', icon: <Printer className="text-white w-6 h-6" /> },
        ].map(tile => (
          <div key={tile.label} className={`bg-gradient-to-r ${tile.grad} border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden backdrop-blur-sm flex items-center justify-between`}>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{tile.label}</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">{tile.value}</h3>
            </div>
            <div className={`w-12 h-12 ${tile.iconBg} rounded-full flex items-center justify-center shadow-sm shrink-0 border border-white/20`}>
              {tile.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter Bar ──────────────────────────────── */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="filter-tabs items-center">
          <Filter size={13} className="text-slate-400 mr-1.5" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={`filter-tab ${activeFilter === opt.key ? 'active' : ''}`}
            >
              {opt.label}
              {opt.key !== 'ALL' && (
                <span className={`ml-2 ${activeFilter === opt.key ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                  ({applications.filter(a => opt.key === 'ALL' || a.status === opt.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pr-1">
          {filteredApps.length} Application{filteredApps.length !== 1 ? 's' : ''} Listed
        </div>
      </div>

      {/* ── Applications Table inside a beautiful glassy panel ── */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Position</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider pr-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-55 dark:divide-slate-800/35">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Search size={32} className="opacity-30" />
                      <p className="font-semibold text-sm">No applications match your search or filter.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
                        className="text-xs font-extrabold text-blue-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApps.map(app => {
                  const sm = STATUS_META[app.status] || { label: app.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{app.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-bold dark:text-slate-500 uppercase tracking-normal mt-0.5">{app.email}</div>
                      </td>
                      <td className="px-6 py-4.5 text-sm font-bold text-slate-600 dark:text-slate-350">{app.department.name}</td>
                      <td className="px-6 py-4.5 text-sm font-bold text-slate-600 dark:text-slate-350">{app.position.title}</td>
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          app.applicationType === 'NEW'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                            : 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                        }`}>
                          {app.applicationType === 'NEW' ? 'New Staff' : 'Replacement'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          app.status === 'MEDIA_APPROVED' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' :
                          app.status === 'APPROVED' ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' :
                          app.status === 'PRINTED' ? 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' :
                          app.status === 'ISSUED' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                          'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                        }`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4.5 text-right pr-8">
                        <div className="flex items-center justify-end gap-1.5">
                          {['APPROVED', 'PRINTED', 'ISSUED'].includes(app.status) && (
                            <button
                              onClick={() => setViewingVirtualId(app)}
                              className="flex items-center gap-1.5 px-3.5 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-xl text-xs font-black uppercase tracking-wider text-emerald-700 transition"
                            >
                              <CreditCard size={13} className="stroke-[2.5]" /> View ID
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenReview(app)}
                            className="flex items-center gap-1.5 px-3.5 py-2 border border-blue-250 dark:border-blue-900 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider text-blue-600 transition"
                          >
                            <Eye size={13} className="stroke-[2.5]" /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Review Modal ─────────────────────────────────────── */}
      {mounted && selectedApp && createPortal(
        <div className="modal-overlay">
          <div className="modal-panel max-w-4xl flex flex-col">

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                  Level 2: HR Registry Review
                </span>
                <h3 className="text-xl font-black text-[var(--primary-color)] mt-1.5">Employment & Card Registration</h3>
                <p className="text-[11px] text-gray-450 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Ticket: {selectedApp.id.slice(0, 16)}…
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 flex-1">
              {/* Left: Details, Docs, Biometrics */}
              <div className="lg:col-span-2 p-6 space-y-6 max-h-[600px] overflow-y-auto">

                {/* ID Assignment */}
                <div className="p-5 bg-gradient-to-br from-[var(--primary-light)]/50 to-[var(--accent-light)]/30 rounded-2xl border border-[var(--primary-color)]/10 space-y-4">
                  <div className="flex items-center gap-2 text-[var(--primary-color)]">
                    <Sparkles size={18} className="animate-spin-slow" />
                    <h4 className="font-extrabold text-sm uppercase tracking-wide">KyU Institutional ID Allocation</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group mb-0">
                      <label className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                        Assigned ID Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="e.g. KYU-1002P"
                          className="input-field text-xs p-2 font-bold text-[var(--primary-color)]"
                          value={editForm.generatedIdNumber}
                          onChange={e => {
                            const newVal = e.target.value;
                            // If there's already an ID assigned and user is typing a different value, show confirmation
                            if (selectedApp?.generatedIdNumber && selectedApp.generatedIdNumber !== newVal && newVal.length > 0) {
                              setIdChangeConfirm({ pendingValue: newVal });
                            } else {
                              setEditForm({ ...editForm, generatedIdNumber: newVal });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAutoGenerateId}
                          disabled={generatingId}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none shrink-0"
                          style={{
                            backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                            backgroundColor: '#1e5fb8'
                          }}
                        >
                          {generatingId ? <Loader2 size={12} className="animate-spin" /> : 'Auto-Gen'}
                        </button>
                      </div>
                    </div>

                    <div className="form-group mb-0">
                      <label className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                        Expiry Date {editForm.employmentTerm !== 'PERMANENT' && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="date"
                          disabled={editForm.employmentTerm === 'PERMANENT'}
                          className="input-field text-xs p-2"
                          value={editForm.employmentTerm === 'PERMANENT' ? '' : editForm.expiryDate}
                          onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })}
                        />
                        {editForm.employmentTerm === 'PERMANENT' && (
                          <span className="absolute inset-0 bg-gray-100/80 rounded-lg flex items-center px-3 text-[10px] font-bold text-gray-500 italic select-none">
                            Tenured / No Expiry
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Details */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center pb-1">
                    <h4 className="font-extrabold text-sm text-gray-700">Staff Registry Fields</h4>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="text-xs text-[var(--primary-color)] font-bold hover:underline">
                        Edit Inline
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleSaveDetails} className="text-xs text-green-700 font-black hover:underline flex items-center gap-1">
                          <Save size={12} /> Save
                        </button>
                        <button onClick={() => setIsEditing(false)} className="text-xs text-red-600 font-bold hover:underline">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Full Name',    key: 'fullName',    type: 'text' },
                        { label: 'Email',        key: 'email',       type: 'email' },
                        { label: 'Appointment Date', key: 'appointmentDate', type: 'date' },
                      ].map(f => (
                        <div key={f.key} className="form-group mb-0">
                          <label className="text-[10px] font-black uppercase text-gray-400">{f.label}</label>
                          <input type={f.type} className="input-field text-xs p-2"
                            value={editForm[f.key as keyof typeof editForm]}
                            onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} />
                        </div>
                      ))}
                      <div className="form-group mb-0">
                        <label className="text-[10px] font-black uppercase text-gray-400">Department</label>
                        <select className="input-field text-xs p-2" value={editForm.departmentId}
                          onChange={e => setEditForm({ ...editForm, departmentId: e.target.value, positionId: '' })}>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-[10px] font-black uppercase text-gray-400">Position</label>
                        <select className="input-field text-xs p-2" value={editForm.positionId}
                          onChange={e => setEditForm({ ...editForm, positionId: e.target.value })}>
                          <option value="">Select Position</option>
                          {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-[10px] font-black uppercase text-gray-400">Employment Terms</label>
                        <select className="input-field text-xs p-2" value={editForm.employmentTerm}
                          onChange={e => setEditForm({ ...editForm, employmentTerm: e.target.value })}>
                          {['PERMANENT', 'CONTRACT', 'TEMPORARY', 'PARTTIME'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {[
                        { label: 'Full Name',    value: selectedApp.fullName },
                        { label: 'Email',        value: selectedApp.email },
                        { label: 'Department',   value: selectedApp.department.name },
                        { label: 'Position',     value: selectedApp.position.title },
                        { label: 'Terms',        value: selectedApp.employmentTerm },
                        { label: 'Appt. Date',   value: new Date(selectedApp.appointmentDate).toLocaleDateString() },
                      ].map(f => (
                        <div key={f.label}>
                          <span className="block text-gray-400 font-bold uppercase text-[9px]">{f.label}</span>
                          <span className="font-bold text-gray-800 text-sm">{f.value}</span>
                        </div>
                      ))}
                      {selectedApp.applicationType === 'REPLACEMENT' && (
                        <>
                          <div>
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Replacement Reason</span>
                            <span className="font-extrabold text-amber-600 uppercase text-[10px]">{selectedApp.replacementReason?.replace(/_/g, ' ')}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Previous ID</span>
                            <span className="font-bold text-gray-700">{selectedApp.currentIdNumber || 'Not provided'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Biometrics */}
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-extrabold text-sm text-gray-700">Staff Biometrics Compliance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center gap-3">
                      <div className="w-28 h-28 bg-white border rounded-xl overflow-hidden shadow-sm">
                        <img src={selectedApp.photoUrl} alt="Passport" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleTriggerBiometricEdit('photo')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-450 border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-all duration-200">
                          Adjust Photo
                        </button>
                        <button onClick={() => downloadBiometric(selectedApp.photoUrl, 'Passport_Photo')}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 shadow-sm">
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center gap-3">
                      <div className="w-full h-20 border rounded-xl overflow-hidden shadow-sm bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-2">
                        <img src={selectedApp.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleTriggerBiometricEdit('signature')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-455 border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-all duration-200">
                          Adjust Signature
                        </button>
                        <button onClick={() => downloadBiometric(selectedApp.signatureUrl, 'Signature')}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 shadow-sm">
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Letter */}
                <div className="border-t pt-4">
                  <a href={selectedApp.appointmentLetterUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-[var(--primary-color)] hover:underline bg-[var(--primary-light)] px-4 py-3 rounded-xl border border-[var(--primary-color)]/10">
                    <FileText size={16} /> View Appointment Letter (PDF)
                  </a>
                </div>
              </div>

              {/* Right: Notes + Decision */}
              <div className="p-6 space-y-5 flex flex-col bg-gray-50/50">

                {/* Application Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Current Status</span>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${STATUS_META[selectedApp.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_META[selectedApp.status]?.label || selectedApp.status}
                  </span>
                </div>

                {/* Application Type */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Application Type</span>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                    selectedApp.applicationType === 'NEW'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedApp.applicationType === 'NEW' ? '✦ New Staff' : '↩ Replacement'}
                  </span>
                </div>

                {/* Internal Notes */}
                <div className="flex-1 flex flex-col min-h-[250px] border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-gray-400" />
                    <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider">Internal Notes</span>
                    {notes.length > 0 && (
                      <span className="ml-auto text-[9px] font-black text-gray-400">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[200px]">
                    {notes.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-6">No notes on this ticket yet.</p>
                    ) : notes.map(n => (
                      <div key={n.id} className="text-[10px]">
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-gray-700">{n.senderName}</span>
                          <span className="text-[8px] font-black text-gray-400 uppercase">({n.senderRole})</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border mt-0.5 whitespace-pre-wrap text-gray-600">{n.message}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendNote} className="p-2 border-t flex gap-1 bg-gray-50/50">
                    <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                      placeholder="Add note to team…"
                      className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200" />
                    <button type="submit" disabled={!newNote.trim() || postingNote}
                      className="p-2 text-white rounded-xl disabled:opacity-50 shrink-0 flex items-center justify-center transition-all duration-200 shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
                      style={{
                        backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                        backgroundColor: '#1e5fb8'
                      }}>
                      <Send size={12} />
                    </button>
                  </form>
                </div>

                {/* HR Decision */}
                {selectedApp.status === 'MEDIA_APPROVED' && (
                  <div className="space-y-2.5 pt-3 border-t">
                    <h4 className="font-extrabold text-xs text-gray-700 dark:text-slate-350 uppercase tracking-wider">HR Decision</h4>
                    <button
                      onClick={() => handleDecision('APPROVED')}
                      disabled={submittingDecision}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                      style={{
                        backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                        backgroundColor: '#1e5fb8'
                      }}
                    >
                      {submittingDecision ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={15} /> Approve &amp; Issue ID</>}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={submittingDecision}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-455 border border-rose-200 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 transition-all duration-200"
                    >
                      <X size={15} /> Reject to Staff
                    </button>
                  </div>
                )}

                {/* Previous HR Comments (if rejected) */}
                {selectedApp.hrComments && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-[10px] font-black text-red-600 uppercase mb-1">HR Rejection Note</p>
                    <p className="text-xs text-red-700">{selectedApp.hrComments}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Reject Modal ─────────────────────────────────────── */}
      {mounted && showRejectModal && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-6">
            <h3 className="text-md font-black text-red-700 uppercase tracking-wider border-b pb-2">Flag Correction Required</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Describe what the staff member must correct before HR registration can proceed.
            </p>
            <textarea
              className="w-full mt-4 input-field p-3 h-24 text-xs"
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              placeholder="e.g. Appointment letter scan is illegible. Please submit a high-resolution scan."
            />
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
              <button onClick={() => setShowRejectModal(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision('REJECTED_HR')}
                disabled={!rejectComment.trim() || submittingDecision}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(244,63,94,0.2)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:ring-4 focus:ring-rose-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
              >
                {submittingDecision ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Biometric Editor ─────────────────────────────────── */}
      {mounted && biometricEditor?.isOpen && createPortal(
        <BiometricEditor
          imageSrc={biometricEditor.imageSrc}
          aspectRatio={biometricEditor.aspectRatio}
          title={biometricEditor.type === 'photo' ? 'Edit Passport Photo' : 'Edit Signature'}
          onSave={handleSaveCroppedBiometric}
          onClose={() => setBiometricEditor(null)}
        />,
        document.body
      )}

      {/* ── ID Number Change Confirmation Modal ───────────────── */}
      {mounted && idChangeConfirm && createPortal(
        <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900">Change Assigned ID Number?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action updates the staff member&apos;s permanent registry ID.</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Current ID:</strong> {selectedApp?.generatedIdNumber}<br />
                <strong>New ID:</strong> {idChangeConfirm.pendingValue}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIdChangeConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEditForm(prev => ({ ...prev, generatedIdNumber: idChangeConfirm!.pendingValue }));
                  setIdChangeConfirm(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white transition"
                style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}
              >
                Yes, Change ID
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Virtual ID Viewer Modal ───────────────────────────── */}
      {mounted && viewingVirtualId && createPortal(
        <div className="fixed inset-0 z-[1050] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
              <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-gray-900">Virtual ID Card</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{viewingVirtualId.fullName} · {viewingVirtualId.generatedIdNumber}</p>
                </div>
                <button onClick={() => setViewingVirtualId(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 flex justify-center">
                <VirtualIdCard
                  application={viewingVirtualId}
                  settings={cardSettings}
                  showBothSides={true}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-blob blob-1" />
    </div>
  );
}
