"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ShieldCheck, ClipboardList, CheckCircle2, Search, X } from 'lucide-react';

interface Application {
  id: string;
  fullName: string;
  email: string;
  position: { id: string; title: string };
  department: { id: string; name: string };
  applicationType: string;
  generatedIdNumber: string | null;
  employmentTerm: string;
  expiryDate: string | null;
  photoUrl: string;
  signatureUrl: string;
  status: string;
  createdAt: string;
}

export default function IssuanceDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApps,       setAllApps]       = useState<Application[]>([]);
  const [loading,       setLoading]        = useState(true);
  const [searchQuery,   setSearchQuery]    = useState('');
  const [processingId,  setProcessingId]   = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/applications/all');
      const data = await res.json();
      const apps = data.applications || [];
      setAllApps(apps);
      setApplications(apps.filter((a: any) => a.status === 'PRINTED'));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markAsIssued = async (id: string) => {
    if (!confirm('Are you sure you want to mark this ID card as physically collected and handed over to the staff member?')) return;
    
    setProcessingId(id);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ISSUED' })
      });

      if (res.ok) {
        setApplications(prev => prev.filter(a => a.id !== id));
        fetchData();
      } else {
        alert('Failed to update status to ISSUED');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const totalCollected    = allApps.filter((a: any) => a.status === 'ISSUED').length;
  const pendingCollection = applications.length;

  const filteredQueue = useMemo(() => {
    return applications.filter(app => {
      const q = searchQuery.toLowerCase();
      return (
        app.fullName.toLowerCase().includes(q) ||
        (app.generatedIdNumber && app.generatedIdNumber.toLowerCase().includes(q)) ||
        app.department.name.toLowerCase().includes(q)
      );
    });
  }, [applications, searchQuery]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-sm text-gray-400 font-medium animate-pulse">Loading Issuance Dashboard…</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header & Task Alerts */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
            ID Handover &amp; Issuance
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400 font-medium">
            Acknowledge physical collection of printed Staff ID cards and log handovers.
          </p>
        </div>
        {pendingCollection > 0 && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-450 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
            <ClipboardList size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              {pendingCollection} Printed Cards Awaiting Collection
            </span>
          </div>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {[
          { label: 'Awaiting Collection', value: pendingCollection, iconBg: 'bg-amber-500 dark:bg-amber-400', grad: 'from-amber-600/10 to-white dark:to-slate-800/40', icon: <ClipboardList className="text-white w-6 h-6" /> },
          { label: 'Total Handed Over', value: totalCollected, iconBg: 'bg-emerald-600 dark:bg-emerald-500', grad: 'from-emerald-600/10 to-white dark:to-slate-800/40', icon: <CheckCircle2 className="text-white w-6 h-6" /> },
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

      {/* Search Bar Panel */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by staff name, ID number, department…"
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
      </div>

      {/* Queue List Section */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Printed ID Verification Board</h2>
            <p className="text-xs text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Queue: Stage 4 of 5 (Collection Verification)</p>
          </div>
          <span className="px-3 py-1.5 bg-blue-100/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-450 border border-blue-200/50 text-[10px] font-black uppercase tracking-wider rounded-full shrink-0">
            Issuance Queue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff photo</th>
                <th>Staff details</th>
                <th>Registry ID Number</th>
                <th>Terms</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    {searchQuery ? 'No matching printed records found.' : 'No printed ID cards are currently awaiting handover. Good job!'}
                  </td>
                </tr>
              ) : (
                filteredQueue.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0">
                        <img src={app.photoUrl} alt="Staff photo" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{app.fullName}</div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{app.department.name} • {app.position.title}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-1 font-mono uppercase">Ref Ticket: {app.id.substring(0, 13)}...</div>
                    </td>
                    <td className="font-mono font-black text-blue-600 dark:text-blue-450 text-sm">
                      {app.generatedIdNumber}
                    </td>
                    <td>
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                        {app.employmentTerm}
                      </span>
                    </td>
                    <td className="text-right align-middle">
                      <button 
                        onClick={() => markAsIssued(app.id)}
                        disabled={processingId === app.id}
                        className="ml-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                        style={{
                          backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                          backgroundColor: '#1e5fb8'
                        }}
                      >
                        {processingId === app.id ? <Loader2 size={12} className="animate-spin"/> : <><ShieldCheck size={14} /> Mark Collected</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-blob blob-1"></div>
    </div>
  );
}
