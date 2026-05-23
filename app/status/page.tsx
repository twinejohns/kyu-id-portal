"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Mail, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Printer, 
  Calendar, 
  Briefcase, 
  Building2, 
  CreditCard, 
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

type Application = {
  id: string;
  fullName: string;
  email: string;
  applicationType: string;
  currentIdNumber?: string;
  status: string;
  createdAt: string;
  position: {
    id: string;
    title: string;
  };
  department: {
    id: string;
    name: string;
  };
};

export default function CheckStatusPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`/api/applications?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();

      if (data.success) {
        setApplications(data.applications || []);
      } else {
        setError(data.error || 'Failed to retrieve applications.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getProgressInfo = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return {
          percentage: 20,
          color: 'bg-[#1e5fb8]',
          borderColor: 'border-blue-200/60',
          glowColor: 'rgba(30, 95, 184, 0.15)',
          textColor: 'text-[#1e5fb8] dark:text-blue-400',
          label: 'L1: Submitted · Biometric Assets Verification',
          description: 'Your biometric passport photo and signature are queued for compliance validation by the DICTS Media administrator.'
        };
      case 'MEDIA_APPROVED':
        return {
          percentage: 40,
          color: 'bg-[#f9b012]',
          borderColor: 'border-[#f9b012]/30',
          glowColor: 'rgba(249, 176, 18, 0.15)',
          textColor: 'text-[#d49205]',
          label: 'L2: Media Approved · HR Registry Review',
          description: 'Your biometric assets are compliant. Your contract and appointment files are now with HR for registry check and staff ID assignment.'
        };
      case 'APPROVED':
        return {
          percentage: 60,
          color: 'bg-indigo-600',
          borderColor: 'border-indigo-200/50',
          glowColor: 'rgba(79, 70, 229, 0.15)',
          textColor: 'text-indigo-600 dark:text-indigo-400',
          label: 'L3: HR Approved · Queued for Printing',
          description: 'HR has successfully approved your contract. Your Virtual ID is now live. Physical card has been queued for immediate printing.'
        };
      case 'PRINTED':
        return {
          percentage: 80,
          color: 'bg-purple-600',
          borderColor: 'border-purple-200/50',
          glowColor: 'rgba(147, 51, 234, 0.15)',
          textColor: 'text-purple-600 dark:text-purple-400',
          label: 'L4: Printed · Ready for Handover',
          description: 'Physical card printing is complete! The card has been dispatched to the ID Handover desk and is ready for in-person collection.'
        };
      case 'ISSUED':
        return {
          percentage: 100,
          color: 'bg-emerald-600',
          borderColor: 'border-emerald-200/50',
          glowColor: 'rgba(16, 185, 129, 0.15)',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          label: 'L5: Card Issued ✓',
          description: 'Your physical ID card was successfully validated and handed over. The application workflow is completed. Welcome to Kyambogo University!'
        };
      case 'REJECTED_MEDIA':
        return {
          percentage: 0,
          color: 'bg-rose-600',
          borderColor: 'border-rose-200/50',
          glowColor: 'rgba(225, 29, 72, 0.15)',
          textColor: 'text-rose-600 dark:text-rose-400',
          label: 'Rejected by DICTS Media',
          description: 'Biometric assets were rejected due to poor quality or non-neutral backgrounds. Please check feedback and submit compliant assets.'
        };
      case 'REJECTED_HR':
      case 'REJECTED':
        return {
          percentage: 0,
          color: 'bg-rose-600',
          borderColor: 'border-rose-200/50',
          glowColor: 'rgba(225, 29, 72, 0.15)',
          textColor: 'text-rose-600 dark:text-rose-400',
          label: 'Rejected by HR Admin',
          description: 'Your contract attestation or appointment data could not be verified by the HR administrator. Please see feedback details.'
        };
      default:
        return {
          percentage: 0,
          color: 'bg-slate-400',
          borderColor: 'border-slate-200/60',
          glowColor: 'rgba(148, 163, 184, 0.15)',
          textColor: 'text-slate-500',
          label: 'Unknown Workflow State',
          description: 'Could not track application status.'
        };
    }
  };

  return (
    <main className="landing-container min-h-screen py-16 px-4 dashboard-bg-theme relative overflow-hidden flex items-center justify-center">
      
      {/* Background blobs for premium depth */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2" style={{ top: 'auto', bottom: '-250px', left: '-150px' }}></div>

      <div className="max-w-4xl w-full mx-auto relative z-10 space-y-8 animate-fade-in">
        
        {/* Header branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#1e5fb8] via-[#8dc63f] to-[#f9b012] rounded-3xl blur-md opacity-25 group-hover:opacity-40 transition duration-1000 animate-spin-slow"></div>
            <img 
              src="/logo.jpg" 
              alt="KyU Logo" 
              className="relative w-18 h-18 object-contain p-1.5 bg-white rounded-2xl shadow-lg border border-slate-100/80" 
            />
          </div>
          
          <Link href="/" className="badge inline-flex items-center gap-1.5 bg-[#f9b012]/12 text-[#d49205] border border-[#f9b012]/20 px-4.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-widest hover:scale-103 transition-all duration-300">
            <Sparkles size={10} className="stroke-[3]" /> Kyambogo University Portal
          </Link>
          
          <h1 className="text-3xl md:text-4.5xl font-black text-slate-900 dark:text-white tracking-tight">
            Track Application Status
          </h1>
          
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-semibold">
            Monitor your KyU identity card request. Enter your official email below to search our registry and trace your authorization levels.
          </p>
        </div>

        {/* Premium Search Box */}
        <div className="glass-card shadow-2xl p-6 relative border border-white/60 dark:border-slate-800/80 overflow-hidden">
          <form onSubmit={handleSearch} className="w-full space-y-3.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block pl-1">
              Registered Email Address
            </label>
            
            <div className="relative flex items-center w-full bg-white dark:bg-slate-950 border-2 border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all duration-300 focus-within:border-[#1e5fb8] focus-within:ring-4 focus-within:ring-blue-500/10 overflow-hidden shadow-xs">
              {/* Icon */}
              <div className="pl-4.5 pr-2 flex items-center justify-center text-slate-400 shrink-0">
                <Mail size={20} className="stroke-[2]" />
              </div>
              
              {/* Input field */}
              <input 
                type="email" 
                className="flex-1 min-w-0 bg-transparent border-0 outline-none py-4 px-2 text-sm md:text-base text-slate-900 dark:text-white placeholder-slate-400 font-bold focus:ring-0 focus:outline-none" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Enter your registered @kyu.ac.ug email"
                required
              />
              
              {/* Search button */}
              <div className="pr-2 shrink-0">
                <button 
                  type="submit" 
                  className="btn-primary py-2 px-6 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider text-white shadow-md transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  style={{
                    height: '44px',
                    backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                    backgroundColor: '#1e5fb8'
                  }}
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Searching...
                    </>
                  ) : (
                    <>
                      Search Records <Search size={15} className="stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded-2xl flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="shrink-0 text-rose-500 mt-0.5" size={18} />
            <div className="text-xs font-bold leading-normal">
              <strong className="block uppercase tracking-wider text-[10px] text-rose-600 font-black">Search Error</strong>
              <span className="font-semibold block mt-0.5">{error}</span>
            </div>
          </div>
        )}

        {/* Search Results Ledger */}
        {searched && !loading && (
          <div className="space-y-6 animate-fade-in pt-2">
            
            <h2 className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest px-2 flex items-center gap-2">
              <CreditCard size={15} className="text-[#f9b012]" />
              Found {applications.length} {applications.length === 1 ? 'Record' : 'Records'} for "{email}"
            </h2>

            {applications.length === 0 ? (
              
              /* No records found card */
              <div className="glass-card text-center py-14 px-8 border border-white/60 dark:border-slate-800/80 bg-white/45 flex flex-col items-center justify-center gap-5">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Application Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
                    We could not locate any active staff ID application registered under <strong className="text-slate-700 dark:text-slate-350">{email}</strong>.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3.5 w-full max-w-md mt-2">
                  <Link 
                    href="/apply" 
                    className="btn-primary py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-sm flex items-center justify-center gap-2"
                    style={{
                      backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                      backgroundColor: '#1e5fb8'
                    }}
                  >
                    Start New Application <ArrowRight size={14} className="stroke-[3]" />
                  </Link>
                  <button 
                    onClick={() => { setSearched(false); setEmail(''); }} 
                    className="btn-secondary py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm"
                  >
                    Try Another Email
                  </button>
                </div>
              </div>

            ) : (

              /* Applications List */
              <div className="space-y-6">
                {applications.map((app) => {
                  const progress = getProgressInfo(app.status);
                  const isRejected = ['REJECTED_MEDIA', 'REJECTED_HR', 'REJECTED'].includes(app.status);
                  
                  return (
                    <div 
                      key={app.id} 
                      className="glass-card border border-white/60 dark:border-slate-800/80 bg-white/45 p-6 md:p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                    >
                      {/* Left vertical visual gradient indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${progress.color}`} />
                      
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        
                        {/* 1. Header Details */}
                        <div className="space-y-4 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-2.5 py-1 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 rounded-lg text-[9.5px] font-black uppercase tracking-wider border border-slate-200/40">
                              {app.applicationType} ID
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                              <Calendar size={12} /> {new Date(app.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-normal bg-slate-100/30 px-2 py-0.5 rounded border border-slate-200/10">
                              REF: {app.id.substring(0, 8).toUpperCase()}...
                            </span>
                          </div>

                          <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-[#1e5fb8] transition-colors duration-250 leading-tight">
                              {app.fullName}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                              <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                <span>{app.position.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="truncate">{app.department.name}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Interactive Status Badge and Redirect links */}
                        <div className="flex flex-col sm:flex-row lg:flex-col justify-end items-start sm:items-center lg:items-end gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left lg:text-right">
                            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 block font-black uppercase tracking-widest mb-1.5">Request Status</span>
                            
                            {/* HSL Colored Pills */}
                            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border shadow-2xs ${
                              ['SUBMITTED', 'PENDING'].includes(app.status) ? 'bg-blue-50/50 text-blue-700 border-blue-200/60 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/60' :
                              app.status === 'MEDIA_APPROVED' ? 'bg-amber-50/50 text-amber-700 border-[#f9b012]/30 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/60' :
                              app.status === 'APPROVED' ? 'bg-indigo-50/50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/60' :
                              app.status === 'PRINTED' ? 'bg-purple-50/50 text-purple-700 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/60' :
                              app.status === 'ISSUED' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/60' :
                              'bg-rose-50/50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/60'
                            }`}>
                              {['SUBMITTED', 'PENDING'].includes(app.status) && <Clock size={12} className="animate-pulse text-blue-600" />}
                              {app.status === 'MEDIA_APPROVED' && <Clock size={12} className="text-[#f9b012]" />}
                              {app.status === 'APPROVED' && <CheckCircle size={12} className="text-indigo-600" />}
                              {app.status === 'PRINTED' && <Printer size={12} className="text-purple-600" />}
                              {app.status === 'ISSUED' && <CheckCircle size={12} className="text-emerald-600" />}
                              {isRejected && <XCircle size={12} className="text-rose-500" />}
                              {app.status === 'SUBMITTED' ? 'SUBMITTED' : app.status}
                            </span>
                          </div>

                          {/* Conditional Actions Buttons */}
                          {['APPROVED', 'PRINTED', 'ISSUED'].includes(app.status) && (
                            <Link 
                              href={`/status/${app.id}`} 
                              className="btn-primary w-full sm:w-auto text-xs py-2.5 px-4 shadow-sm hover:shadow-md flex items-center gap-1.5"
                              style={{
                                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                                backgroundColor: '#1e5fb8'
                              }}
                            >
                              View Virtual ID Card <ArrowRight size={13} className="stroke-[3]" />
                            </Link>
                          )}

                          {isRejected && (
                            <Link href="/apply" className="btn-primary w-full sm:w-auto text-xs py-2.5 px-4 flex items-center gap-1.5"
                              style={{
                                backgroundImage: 'linear-gradient(to right, #e11d48, #be123c)',
                                backgroundColor: '#e11d48'
                              }}
                            >
                              Re-Apply Now <ArrowRight size={13} className="stroke-[3]" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* 3. Progress representation & Timeline journey */}
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/70">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${progress.textColor}`}>
                            {progress.label}
                          </span>
                          <span className={`text-sm font-extrabold ${progress.textColor}`}>
                            {progress.percentage}%
                          </span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative shadow-inner">
                          <div 
                            className={`h-full ${progress.color} rounded-full transition-all duration-1000 ease-out`} 
                            style={{ 
                              width: `${progress.percentage}%`,
                              boxShadow: `0 0 10px ${progress.glowColor}`
                            }}
                          />
                        </div>

                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-3 font-semibold leading-relaxed">
                          {progress.description}
                        </p>

                        {/* 5-Step Horizontal tracker map */}
                        {!isRejected ? (
                          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-850">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Approval Levels</p>
                            <div className="relative">
                              {/* Horizontal Connecting line */}
                              <div className="absolute top-4 left-0 right-0 h-[2.5px] bg-slate-100 dark:bg-slate-850 mx-10 rounded-full" />
                              <div className="grid grid-cols-5 gap-1 relative">
                                {[
                                  { num: 1, label: 'Submitted',  statuses: ['SUBMITTED','MEDIA_APPROVED','APPROVED','PRINTED','ISSUED'], color: '#1e5fb8', bg: '#dbeafe' },
                                  { num: 2, label: 'Media Check', statuses: ['MEDIA_APPROVED','APPROVED','PRINTED','ISSUED'], color: '#d97706', bg: '#fef3c7' },
                                  { num: 3, label: 'HR Approved', statuses: ['APPROVED','PRINTED','ISSUED'], color: '#4f46e5', bg: '#ede9fe' },
                                  { num: 4, label: 'Printed',    statuses: ['PRINTED','ISSUED'], color: '#7c3aed', bg: '#f3e8ff' },
                                  { num: 5, label: 'Issued',     statuses: ['ISSUED'], color: '#16a34a', bg: '#dcfce7' },
                                ].map((lvl) => {
                                  const active  = lvl.statuses.includes(app.status);
                                  const current = lvl.num === progress.percentage / 20;
                                  return (
                                    <div key={lvl.num} className="flex flex-col items-center gap-2 relative z-10">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm border-2 transition-all duration-300 ${
                                          active 
                                            ? 'border-transparent text-white ring-4 ring-offset-1' 
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                        }`}
                                        style={{
                                          background: active ? lvl.color : undefined,
                                          ['--tw-ring-color' as any]: active ? lvl.bg : undefined,
                                        }}
                                      >
                                        {active && lvl.num < (progress.percentage / 20 + 1) && !current ? '✓' : lvl.num}
                                      </div>
                                      <div className="text-center">
                                        <span
                                          className={`text-[8.5px] font-black uppercase leading-tight block ${active ? '' : 'text-slate-300 dark:text-slate-700'}`}
                                          style={{ color: active ? lvl.color : undefined }}
                                        >
                                          L{lvl.num}
                                        </span>
                                        <span className={`text-[7.5px] font-bold leading-tight block ${active ? 'text-slate-700 dark:text-slate-350 font-black' : 'text-slate-300 dark:text-slate-700'}`}>
                                          {lvl.label}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-rose-50/40 rounded-2xl border border-rose-200/50 flex items-start gap-3 text-xs text-rose-800">
                            <Info className="shrink-0 text-rose-500 mt-0.5" size={16} />
                            <div className="text-left space-y-1">
                              <strong className="font-extrabold uppercase text-[10px] text-rose-600 block">Rejection Feedback</strong>
                              <span className="font-semibold block leading-normal">
                                Rejection occurs if uploaded appointment details, biometrics, passport photos, or signatures don't satisfy registry standards. Please check the feedback from reviews or re-submit a new application.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </main>
  );
}
