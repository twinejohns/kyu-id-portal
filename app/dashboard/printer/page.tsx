"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2, Printer as PrinterIcon, ClipboardList, CheckCircle2,
  Eye, X, Award, History, LayoutGrid, List, Zap, Search, XCircle,
  Download, FileDown
} from 'lucide-react';
import VirtualIdCard from '@/components/VirtualIdCard';

interface Application {
  id: string;
  fullName: string;
  email: string;
  position: { id: string; title: string };
  department: { id: string; name: string };
  applicationType: string;
  generatedIdNumber: string | null;
  employmentTerm: string;
  appointmentDate: string;
  expiryDate: string | null;
  photoUrl: string;
  signatureUrl: string;
  phoneNumber?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'grid' | 'table';

const FILTER_OPTIONS = [
  { key: 'APPROVED', label: 'In Queue' },
  { key: 'PRINTED',  label: 'Printed' },
  { key: 'ISSUED',   label: 'Issued' },
  { key: 'ALL',      label: 'All Cards' },
];

export default function PrinterDashboard() {
  const [mounted,       setMounted]        = useState(false);
  const [allApps,       setAllApps]       = useState<Application[]>([]);
  const [loading,       setLoading]        = useState(true);
  const [selectedApp,   setSelectedApp]    = useState<Application | null>(null);
  const [processingId,  setProcessingId]   = useState<string | null>(null);
  const [batchPrinting, setBatchPrinting]  = useState(false);
  const [showHistory,   setShowHistory]    = useState(false);
  const [viewMode,      setViewMode]       = useState<ViewMode>('grid');
  const [toast,         setToast]          = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exportingPdf,  setExportingPdf]   = useState<string | null>(null); // holds app ID being exported
  const [bulkExporting, setBulkExporting]  = useState(false);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef  = useRef<HTMLDivElement>(null);

  // Search & Filter
  const [searchQuery,   setSearchQuery]    = useState('');
  const [activeFilter,  setActiveFilter]   = useState('APPROVED');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/applications/all');
      const data = await res.json();
      const apps: Application[] = data.applications || [];
      setAllApps(apps);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, [fetchData]);

  // ─── Mark single app as printed ───────────────────────────────
  const markAsPrinted = async (id: string, fromModal = false) => {
    if (!fromModal && !confirm('Mark this card as printed and notify the staff member?')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PRINTED' }),
      });
      if (res.ok) {
        showToast('Card marked as printed! Staff has been notified.', 'success');
        setSelectedApp(null);
        await fetchData();
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ─── PDF Export (single card) ─────────────────────────────────
  const exportToPdf = async (app: Application, frontEl: HTMLElement, backEl: HTMLElement) => {
    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    setExportingPdf(app.id);

    // Suppress harmless color parsing warnings/errors from standard/pro parser mismatches
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && (args[0].includes('unsupported color function') || args[0].includes('lab'))) {
        return;
      }
      originalError.apply(console, args);
    };
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && (args[0].includes('unsupported color function') || args[0].includes('lab'))) {
        return;
      }
      originalWarn.apply(console, args);
    };

    try {
      // Render front
      const frontCanvas = await html2canvas(frontEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Create PDF in landscape CR-80 card size (85.6 × 54 mm)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
      pdf.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 85.6, 54);

      // Add back page if back element provided and differs from front
      if (backEl && backEl !== frontEl) {
        pdf.addPage();
        const backCanvas = await html2canvas(backEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        pdf.addImage(backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 85.6, 54);
      }

      pdf.save(`KyU-ID-${app.generatedIdNumber || app.fullName.replace(/\s+/g, '-')}.pdf`);
      showToast('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('PDF export failed. Please try again.', 'error');
    } finally {
      console.error = originalError;
      console.warn = originalWarn;
      setExportingPdf(null);
    }
  };

  // ─── Bulk PDF Export ──────────────────────────────────────────
  const handleBulkPdfExport = async () => {
    const queue = allApps.filter(a => a.status === 'APPROVED');
    if (queue.length === 0) { showToast('No approved cards to export.', 'error'); return; }
    setBulkExporting(true);
    try {
      const { jsPDF } = await import('jspdf');

      // Create multi-page PDF (one record per page)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });

      for (let i = 0; i < queue.length; i++) {
        const app = queue[i];
        if (i > 0) pdf.addPage();
        pdf.setFontSize(14);
        pdf.setTextColor(30, 95, 184);
        pdf.text(`${app.fullName}`, 5, 12);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`ID: ${app.generatedIdNumber || 'PENDING'}`, 5, 20);
        pdf.text(`${app.department.name} - ${app.position.title}`, 5, 27);
        pdf.text(`${app.employmentTerm}`, 5, 34);
        pdf.setFontSize(8);
        pdf.text('Kyambogo University - Official Staff ID Portal', 5, 48);
      }

      pdf.save(`KyU-Bulk-IDs-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(`Exported ${queue.length} card records to PDF!`, 'success');
    } catch (err) {
      console.error('Bulk export failed:', err);
      showToast('Bulk export failed. Please try again.', 'error');
    } finally {
      setBulkExporting(false);
    }
  };

  // ─── Batch print ──────────────────────────────────────────────
  const handleBatchPrint = async () => {
    const queue = allApps.filter(a => a.status === 'APPROVED');
    if (queue.length === 0) { showToast('No cards in the queue.', 'error'); return; }
    if (!confirm(`Batch-print all ${queue.length} approved ID cards? This cannot be undone.`)) return;
    setBatchPrinting(true);
    try {
      await Promise.all(
        queue.map(app =>
          fetch(`/api/applications/${app.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PRINTED' }),
          })
        )
      );
      showToast(`All ${queue.length} cards printed successfully!`, 'success');
      await fetchData();
    } catch {
      showToast('Batch print failed. Please try again.', 'error');
    } finally {
      setBatchPrinting(false);
    }
  };

  // ─── Derived stats ────────────────────────────────────────────
  const queueApps    = allApps.filter(a => a.status === 'APPROVED');
  const printedApps  = allApps.filter(a => a.status === 'PRINTED' || a.status === 'ISSUED');
  const issuedApps   = allApps.filter(a => a.status === 'ISSUED');
  const readyCount   = queueApps.length;
  const printedCount = printedApps.length;
  const issuedCount  = issuedApps.length;

  // Today's printed count
  const todayStr = new Date().toDateString();
  const todayPrinted = printedApps.filter(a => new Date(a.updatedAt).toDateString() === todayStr).length;

  // Filtered Apps for the interactive panel
  const filteredApps = useMemo(() => {
    return allApps.filter(app => {
      // 1. Status Filter
      if (activeFilter !== 'ALL') {
        if (app.status !== activeFilter) return false;
      } else {
        // Under ALL, show queue, printed, and issued only
        if (!['APPROVED', 'PRINTED', 'ISSUED'].includes(app.status)) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = app.fullName.toLowerCase().includes(q);
        const emailMatch = app.email.toLowerCase().includes(q);
        const deptMatch = app.department.name.toLowerCase().includes(q);
        const posMatch = app.position.title.toLowerCase().includes(q);
        const idMatch = (app.generatedIdNumber || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || deptMatch || posMatch || idMatch;
      }

      return true;
    });
  }, [allApps, activeFilter, searchQuery]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-sm text-gray-400 font-medium">Loading Printer Dashboard…</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-10">

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm text-white animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
            Card Printer Dashboard
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400 font-medium">
            Manage the printing queue, download biometric assets, and track job history.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-600/10 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200"
          >
            <History size={15} /> Print History Log
          </button>

          {/* Bulk PDF Export */}
          {readyCount > 0 && (
            <button
              onClick={handleBulkPdfExport}
              disabled={bulkExporting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250 disabled:opacity-60"
              style={{ backgroundImage: 'linear-gradient(to right, #059669, #047857)', backgroundColor: '#059669' }}
            >
              {bulkExporting
                ? <><Loader2 size={14} className="animate-spin" /> Exporting...</>
                : <><FileDown size={14} /> Export All PDFs ({readyCount})</>
              }
            </button>
          )}

          {/* Batch Print */}
          {readyCount > 0 && (
            <button
              onClick={handleBatchPrint}
              disabled={batchPrinting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8'
              }}
            >
              {batchPrinting
                ? <><Loader2 size={14} className="animate-spin" /> Batch Printing…</>
                : <><Zap size={14} /> Batch Print All ({readyCount})</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Pending badge ────────────────────────────────────────── */}
      {readyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-450 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
          <ClipboardList size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider">
            {readyCount} card{readyCount !== 1 ? 's' : ''} approved and waiting to be printed
          </span>
        </div>
      )}

      {/* ── KPI Stat Tiles ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'In Print Queue', value: readyCount, iconBg: 'bg-amber-500 dark:bg-amber-400', grad: 'from-amber-600/10 to-white dark:to-slate-800/40', icon: <ClipboardList className="text-white w-6 h-6" /> },
          { label: 'Total Printed', value: printedCount, iconBg: 'bg-emerald-600 dark:bg-emerald-500', grad: 'from-emerald-600/10 to-white dark:to-slate-800/40', icon: <CheckCircle2 className="text-white w-6 h-6" /> },
          { label: 'Issued to Staff', value: issuedCount, iconBg: 'bg-violet-600 dark:bg-violet-500', grad: 'from-violet-600/10 to-white dark:to-slate-800/40', icon: <Award className="text-white w-6 h-6" /> },
          { label: 'Printed Today', value: todayPrinted, iconBg: 'bg-blue-600 dark:bg-blue-500', grad: 'from-blue-600/10 to-white dark:to-slate-800/40', icon: <PrinterIcon className="text-white w-6 h-6" /> },
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

      {/* ── Search & Filter Bar ──────────────────────────────── */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search queue by name, department, ID…"
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="filter-tabs items-center">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setActiveFilter(opt.key)}
                className={`filter-tab ${activeFilter === opt.key ? 'active' : ''}`}
              >
                {opt.label}
                {opt.key !== 'ALL' ? (
                  <span className={`ml-2 ${activeFilter === opt.key ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                    ({allApps.filter(a => a.status === opt.key).length})
                  </span>
                ) : (
                  <span className={`ml-2 ${activeFilter === opt.key ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                    ({allApps.filter(a => ['APPROVED', 'PRINTED', 'ISSUED'].includes(a.status)).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-250 dark:bg-slate-800 hidden sm:block" />

          {/* View toggle */}
          <div className="flex items-center bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Queue Section ─────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PrinterIcon size={18} className="text-blue-600" />
              {activeFilter === 'APPROVED' ? 'Active Print Queue' : activeFilter === 'PRINTED' ? 'Printed Card Records' : activeFilter === 'ISSUED' ? 'Issued Handover Records' : 'All Registry Cards'}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Queue: Level 3 of 5</p>
          </div>

          <span className="px-3 py-1.5 bg-emerald-100/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-450 border border-emerald-200/50 text-[10px] font-black uppercase tracking-wider rounded-full shrink-0">
            Print Engine Live
          </span>
        </div>

        {filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-slate-900 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-slate-700 dark:text-slate-350">No cards in this view!</p>
              <p className="text-xs mt-1 text-slate-400">There are no records matching your current filter criteria.</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── GRID / CARD VIEW ───────────────────────────────── */
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map(app => (
              <div key={app.id}
                className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  {/* Card top bar */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-blue-700" />

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Passport Photo Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-500/20 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm">
                        <img
                          src={app.photoUrl}
                          alt={app.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">{app.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{app.position.title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{app.department.name}</div>
                      </div>
                    </div>

                    {/* ID Number */}
                    <div className="mt-4 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Registry ID</span>
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                        {app.generatedIdNumber || 'KYU-TEMP'}
                      </span>
                    </div>

                    {/* Employment term badge */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {app.employmentTerm}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                        app.status === 'APPROVED' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/30' :
                        app.status === 'PRINTED' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-200/30' :
                        'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/30'
                      }`}>
                        {app.status === 'APPROVED' ? 'Queue' : app.status === 'PRINTED' ? 'Printed' : 'Issued'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Card Actions */}
                <div className="px-5 pb-5 flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-600/10 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  {app.status === 'APPROVED' && (
                    <button
                      onClick={() => markAsPrinted(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                      style={{
                        backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                        backgroundColor: '#1e5fb8'
                      }}
                    >
                      {processingId === app.id ? <Loader2 size={12} className="animate-spin" /> : <><PrinterIcon size={13} /> Print</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── TABLE VIEW ─────────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Assigned ID</th>
                  <th>Terms</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {/* Thumbnail in table view */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0">
                          <img src={app.photoUrl} alt={app.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{app.fullName}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">{app.department.name} · {app.position.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono font-black text-blue-600 dark:text-blue-450 text-sm">
                      {app.generatedIdNumber || 'KYU-TEMP'}
                    </td>
                    <td>
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">
                        {app.employmentTerm}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${
                        app.applicationType === 'NEW'
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/40'
                          : 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200/40'
                      }`}>
                        {app.applicationType === 'NEW' ? 'New' : 'Replacement'}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                        app.status === 'APPROVED' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/30' :
                        app.status === 'PRINTED' ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-200/30' :
                        'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-200/30'
                      }`}>
                        {app.status === 'APPROVED' ? 'In Queue' : app.status === 'PRINTED' ? 'Printed' : 'Issued'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedApp(app)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200">
                          <Eye size={13} /> Preview
                        </button>
                        {app.status === 'APPROVED' && (
                          <button onClick={() => markAsPrinted(app.id)} disabled={processingId === app.id}
                            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                            style={{
                              backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                              backgroundColor: '#1e5fb8'
                            }}>
                            {processingId === app.id ? <Loader2 size={12} className="animate-spin" /> : <><PrinterIcon size={13} /> Mark Printed</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ID Card Preview Modal ─────────────────────────────────── */}
      {mounted && selectedApp && createPortal(
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl flex flex-col">
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-base">ID Card Print Blueprint</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  ID: {selectedApp.generatedIdNumber || 'Not yet assigned'}
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition">
                <X size={18} />
              </button>
            </div>

            {/* ID Card Preview — VirtualIdCard */}
            <div className="modal-body bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-auto p-8">
              <div id="printer-preview-card" ref={cardFrontRef} className="flex items-center justify-center">
                <VirtualIdCard application={selectedApp} showBothSides={true} />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer">
              <button onClick={() => setSelectedApp(null)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200">
                Close Blueprint
              </button>

              {/* Save as PDF button */}
              <button
                onClick={async () => {
                  const frontEl = document.getElementById('pdf-front-card');
                  const backEl = document.getElementById('pdf-back-card');
                  if (!frontEl || !backEl || !selectedApp) return;
                  await exportToPdf(selectedApp, frontEl, backEl);
                }}
                disabled={exportingPdf === selectedApp.id}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250 disabled:opacity-60"
                style={{ backgroundImage: 'linear-gradient(to right, #059669, #047857)', backgroundColor: '#059669' }}
              >
                {exportingPdf === selectedApp.id
                  ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
                  : <><Download size={13} /> Save as PDF</>
                }
              </button>

              {selectedApp.status === 'APPROVED' && (
                <button
                  onClick={() => markAsPrinted(selectedApp.id, true)}
                  disabled={processingId === selectedApp.id}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                    backgroundColor: '#1e5fb8'
                  }}
                >
                  {processingId === selectedApp.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <><PrinterIcon size={14} /> Send to Issuance &amp; Mark Printed</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Print History Modal ───────────────────────────────────── */}
      {mounted && showHistory && createPortal(
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl max-h-[85vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <History size={16} /> Complete Print History Log
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {printedApps.length} card{printedApps.length !== 1 ? 's' : ''} printed in total
                </p>
              </div>
              <button onClick={() => setShowHistory(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {printedApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <History size={32} className="opacity-30" />
                  <p className="text-sm font-medium">No cards have been printed yet.</p>
                </div>
              ) : printedApps.map(app => (
                <div key={app.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  {/* Photo */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img src={app.photoUrl} alt={app.fullName} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight">{app.fullName}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-1">
                      {app.department.name} · {app.position.title}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{app.generatedIdNumber}</div>
                  </div>

                  {/* Status + Date */}
                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                      app.status === 'ISSUED'
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200/40'
                        : 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-200/40'
                    }`}>
                      {app.status === 'ISSUED' ? '✓ Issued' : '🖨 Printed'}
                    </span>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">
                      {new Date(app.updatedAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowHistory(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 ml-auto rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200">
                Close Log
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Off-screen elements for pixel-perfect scale-1 PDF export */}
      {selectedApp && (
        <div 
          style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: '-9999px', 
            width: '580px', 
            height: '360px', 
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -9999 
          }}
        >
          <div id="pdf-front-card">
            <VirtualIdCard application={selectedApp} initialSide="front" showBothSides={false} noScale={true} />
          </div>
          <div id="pdf-back-card">
            <VirtualIdCard application={selectedApp} initialSide="back" showBothSides={false} noScale={true} />
          </div>
        </div>
      )}

      {/* Decorative Blob */}
      <div className="bg-blob blob-1" />
    </div>
  );
}
