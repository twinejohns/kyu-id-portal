"use client";

import { useState, useCallback } from 'react';
import {
  Save, Loader2, Shield, Hash, Lock, Palette, Mail, Check, AlertTriangle,
  CreditCard, Upload, Trash2, FileText, Sparkles, LayoutTemplate
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import VirtualIdCard from '@/components/VirtualIdCard';

const mockApplication = {
  fullName: "Prof. John Doe",
  generatedIdNumber: "KYU-STF-2026-0001",
  position: { title: "Professor of Software Engineering" },
  department: { name: "Department of Computer Science" },
  employmentTerm: "PERMANENT",
  appointmentDate: "2026-01-15",
  expiryDate: null,
  photoUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f1f5f9"/><circle cx="50" cy="40" r="22" fill="%23cbd5e1"/><path d="M20,85 C20,68 30,55 50,55 C70,55 80,68 80,85 Z" fill="%2394a3b8"/></svg>`,
  signatureUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" fill="none" stroke="%231e5fb8" stroke-width="2" stroke-linecap="round"><path d="M10,25 Q30,10 50,22 T90,15 T110,25"/></svg>`,
  applicationType: "STAFF",
  email: "jdoe@kyu.ac.ug",
  phoneNumber: "+256 701 234 567"
};

type SystemSettings = {
  institutionName: string;
  institutionShortName: string;
  idPrefix: string;
  idSuffix: string;
  idPadding: number;
  primaryColor: string;
  secondaryColor: string;
  enableEmailNotifications: boolean;
  requirePhotoValidation: boolean;
  maxPhotoSizeMB: number;
  sessionTimeoutHours: number;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
  portalTagline: string;
  secretarySignatureUrl: string;
  returnAddress: string;
  idCardTemplateUrl: string;
  templateMode: string; // 'builtin' | 'template' | 'ai-scan'
  
  cardHeaderTitle?: string;
  cardSubtitle?: string;
  cardBannerText?: string;
  cardWatermarkText?: string;
  showWatermark?: boolean;
  showBarcode?: boolean;
  showDepartment?: boolean;
  showPosition?: boolean;
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

export default function SettingsClient({ initialSettings }: { initialSettings: SystemSettings }) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingAiScan, setUploadingAiScan] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ msg, type }), []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-settings', settings })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      
      showToast('System configuration saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Upload secretary signature to /api/upload and save returned URL
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setSettings(s => ({ ...s, secretarySignatureUrl: data.url }));
      else throw new Error(data.error || 'Upload failed');
    } catch (err: any) {
      showToast(err.message || 'Signature upload failed', 'error');
    } finally {
      setUploadingSignature(false);
      // Reset the input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  // Upload custom SVG/PDF template
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setSettings(s => ({ ...s, idCardTemplateUrl: data.url }));
      else throw new Error(data.error || 'Upload failed');
    } catch (err: any) {
      showToast(err.message || 'Template upload failed', 'error');
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  // Upload AI scan sample — saves URL and shows coming-soon notice
  const handleAiScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAiScan(true);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setSettings(s => ({ ...s, idCardTemplateUrl: data.url }));
        showToast('Scan saved. AI generation available in enterprise version.', 'info');
      } else throw new Error(data.error || 'Upload failed');
    } catch (err: any) {
      showToast(err.message || 'Scan upload failed', 'error');
    } finally {
      setUploadingAiScan(false);
      e.target.value = '';
    }
  };

  const sections = [
    { id: 'identity',   label: 'Identity',     icon: Shield,      desc: 'Institution name, logo tags & slogan.' },
    { id: 'idformat',   label: 'ID Format',    icon: Hash,        desc: 'Prefix, suffix & padding serials.' },
    { id: 'security',   label: 'Security & QA', icon: Lock,       desc: 'Photo checks, size limits & expiry.' },
    { id: 'theme',      label: 'Branding',     icon: Palette,     desc: 'Color schemas & live dynamic card.' },
    { id: 'smtp',       label: 'Email (SMTP)', icon: Mail,        desc: 'Outgoing hosts, headers & authentication.' },
    { id: 'carddesign', label: 'Card Design',  icon: CreditCard,  desc: 'ID card template, back side, and branding.' },
  ] as const;

  // Shared label style
  const fieldLabel = "text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">System Settings</h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400">Configure system variables, color branding schemas, and card layouts.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
            backgroundColor: '#1e5fb8'
          }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} className="stroke-[3]" /> Save Settings</>}
        </button>
      </div>

      <Tabs defaultValue="identity" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar List */}
        <TabsList className="flex flex-col h-auto w-full bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm border border-white/60 dark:border-slate-800/60 p-4 rounded-2xl gap-2 justify-start items-stretch col-span-1 shadow-sm">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.id} value={s.id}
                className="w-full group flex items-start justify-start gap-3.5 p-3.5 rounded-xl text-left border border-transparent transition-all cursor-pointer select-none text-slate-700 dark:text-slate-350 hover:bg-slate-50/70 hover:text-slate-950 dark:hover:bg-slate-800/50 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary shadow-sm">
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black uppercase tracking-wider">{s.label}</div>
                  <div className="text-[10.5px] text-slate-500 group-data-[state=active]:text-blue-100/95 font-bold mt-0.5 leading-normal tracking-normal dark:text-slate-400">{s.desc}</div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Content Configuration Form Panel */}
        <div className="lg:col-span-3">
          <Card className="glass-card overflow-hidden p-1 border-transparent">
            <form onSubmit={handleSave}>
              
              {/* SECTION: IDENTITY */}
              <TabsContent value="identity" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield size={18} className="text-primary" /> Institution Identity
                    </CardTitle>
                    <CardDescription className="text-xs">Setup institutional identification parameters and name catalogs.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Full Institution Name</label>
                      <input required type="text" className="input-field text-sm p-3 w-full"
                        value={settings.institutionName}
                        onChange={e => setSettings(p => ({ ...p, institutionName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Institution Abbreviation</label>
                      <input required type="text" className="input-field text-sm p-3 w-full font-mono"
                        value={settings.institutionShortName}
                        onChange={e => setSettings(p => ({ ...p, institutionShortName: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className={fieldLabel}>Portal Tagline</label>
                    <input required type="text" className="input-field text-sm p-3 w-full"
                      value={settings.portalTagline}
                      onChange={e => setSettings(p => ({ ...p, portalTagline: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>

              {/* SECTION: ID FORMAT */}
              <TabsContent value="idformat" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Hash size={18} className="text-primary" /> ID Card Serial Format
                    </CardTitle>
                    <CardDescription className="text-xs">Define serial prefixes, zero-paddings, and employment status indicators.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>ID Number Prefix</label>
                      <input required type="text" className="input-field text-sm p-3 w-full font-mono uppercase"
                        value={settings.idPrefix}
                        onChange={e => setSettings(p => ({ ...p, idPrefix: e.target.value.toUpperCase() }))} />
                      <span className="text-[10px] font-bold text-slate-400 mt-1.5 block leading-normal uppercase">Appears before serial (e.g. KYU)</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>ID Number Suffix</label>
                      <input required type="text" className="input-field text-sm p-3 w-full font-mono uppercase"
                        value={settings.idSuffix}
                        onChange={e => setSettings(p => ({ ...p, idSuffix: e.target.value.toUpperCase() }))} />
                      <span className="text-[10px] font-bold text-slate-400 mt-1.5 block leading-normal uppercase">Appended after (e.g. P/C)</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Serial Zero Padding</label>
                      <input required type="number" min={1} max={8} className="input-field text-sm p-3 w-full font-mono"
                        value={settings.idPadding}
                        onChange={e => setSettings(p => ({ ...p, idPadding: parseInt(e.target.value) || 4 }))} />
                      <span className="text-[10px] font-bold text-slate-400 mt-1.5 block leading-normal uppercase">Length of digits (e.g. 4 → 0001)</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SECTION: SECURITY & QA */}
              <TabsContent value="security" className="p-6 space-y-6">
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock size={18} className="text-primary" /> Security & Quality Control
                    </CardTitle>
                    <CardDescription className="text-xs">Enforce automated media constraints, session policies, and email broadcasts.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm flex items-center justify-between gap-6 shadow-sm">
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">Photo AI Quality Verification</div>
                        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1 leading-normal">Enforce facial alignment & contrast.</div>
                      </div>
                      <Switch checked={settings.requirePhotoValidation}
                        onCheckedChange={(val) => setSettings(p => ({ ...p, requirePhotoValidation: val }))} />
                    </div>

                    <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm flex items-center justify-between gap-6 shadow-sm">
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">Email Alerts & Broadcasts</div>
                        <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1 leading-normal">Dispatches emails on level progress.</div>
                      </div>
                      <Switch checked={settings.enableEmailNotifications}
                        onCheckedChange={(val) => setSettings(p => ({ ...p, enableEmailNotifications: val }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Max Media Upload Limit (MB)</label>
                      <input required type="number" min={1} max={50} className="input-field text-sm p-3 w-full font-mono"
                        value={settings.maxPhotoSizeMB}
                        onChange={e => setSettings(p => ({ ...p, maxPhotoSizeMB: parseInt(e.target.value) || 5 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Session Lockout Threshold (Hours)</label>
                      <input required type="number" min={1} max={72} className="input-field text-sm p-3 w-full font-mono"
                        value={settings.sessionTimeoutHours}
                        onChange={e => setSettings(p => ({ ...p, sessionTimeoutHours: parseInt(e.target.value) || 8 }))} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SECTION: BRANDING & THEME */}
              <TabsContent value="theme" className="p-6 space-y-6">
                <div className="space-y-6">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette size={18} className="text-primary" /> Branding & Theme Settings
                    </CardTitle>
                    <CardDescription className="text-xs">Customize the physical ID card branding headers and portal color scheme.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    {/* Primary Color Picker */}
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Primary Branding Color</label>
                      <div className="flex gap-2">
                        <input type="color" className="w-11 h-11 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer shrink-0 p-0 overflow-hidden bg-transparent"
                          value={settings.primaryColor}
                          onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))} />
                        <input type="text" className="input-field text-sm p-3 font-mono uppercase"
                          value={settings.primaryColor}
                          onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase">Usually KyU Royal Navy Blue (#1e5fb8).</span>
                    </div>

                    {/* Secondary Color Picker */}
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Secondary Branding Color</label>
                      <div className="flex gap-2">
                        <input type="color" className="w-11 h-11 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer shrink-0 p-0 overflow-hidden bg-transparent"
                          value={settings.secondaryColor}
                          onChange={e => setSettings(p => ({ ...p, secondaryColor: e.target.value }))} />
                        <input type="text" className="input-field text-sm p-3 font-mono uppercase"
                          value={settings.secondaryColor}
                          onChange={e => setSettings(p => ({ ...p, secondaryColor: e.target.value }))} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase">Secondary gold accent highlight (#f9b012).</span>
                    </div>
                  </div>

                  {/* Dynamic ID Card Live Preview */}
                  <div className="mt-4 p-5 rounded-2xl border border-white/40 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Dynamic ID Layout Renderer</div>
                    
                    <div className="w-72 mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col font-sans select-none dark:bg-slate-950 dark:border-slate-800">
                      {/* Banner header using primary color */}
                      <div className="p-3.5 text-white text-center flex flex-col items-center justify-center" style={{ backgroundColor: settings.primaryColor }}>
                        <div className="text-[10px] font-black tracking-widest">{settings.cardHeaderTitle || `${settings.institutionShortName} STAFF ID`}</div>
                        <div className="text-[8px] opacity-75 font-semibold mt-0.5">{settings.cardBannerText || settings.institutionName}</div>
                      </div>

                      {/* Accent strip using secondary color */}
                      <div className="h-1.5 w-full animate-pulse" style={{ backgroundColor: settings.secondaryColor }} />

                      {/* Photo Placeholder */}
                      <div className="p-5 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Live Watermark security overlay */}
                        {settings.showWatermark !== false && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.035] select-none rotate-[-25deg]">
                            <span className="font-black text-[12px] tracking-[0.1em] uppercase text-gray-900 whitespace-nowrap dark:text-gray-100">
                              {settings.cardWatermarkText || 'KYAMBOGO UNIVERSITY'}
                            </span>
                          </div>
                        )}

                        <div className="w-20 h-20 bg-slate-50 border-2 border-slate-200/60 rounded-xl flex items-center justify-center text-slate-300 font-extrabold text-[10px] uppercase tracking-wider dark:bg-slate-900 dark:border-slate-800 relative z-10">
                          Photo
                        </div>
                        <div className="font-extrabold text-sm text-slate-900 mt-3 dark:text-slate-100 relative z-10">Prof. John Doe</div>
                        {settings.showDepartment !== false && (
                          <div className="text-[10px] font-extrabold text-slate-400 mt-0.5 uppercase tracking-wide relative z-10">Faculty of Engineering</div>
                        )}
                        {settings.showPosition !== false && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 relative z-10">Senior Lecturer</div>
                        )}
                        
                        {/* Dynamic ID number format */}
                        <div className="mt-4 px-3.5 py-1 bg-slate-50 border border-slate-100 rounded-full font-mono text-[9px] font-black text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 relative z-10">
                          {settings.idPrefix}-{(1).toString().padStart(settings.idPadding, '0')}-{settings.idSuffix}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-2.5 border-t border-slate-100 text-center text-[7px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                        DICTS IDENTITY SYSTEMS
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SECTION: SMTP EMAIL */}
              <TabsContent value="smtp" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail size={18} className="text-primary" /> SMTP Delivery Parameters
                    </CardTitle>
                    <CardDescription className="text-xs">Configure authenticated mail exchange hosts and dispatch email address headers.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>SMTP Delivery Host</label>
                      <input type="text" className="input-field text-sm p-3 w-full font-mono" placeholder="smtp.gmail.com"
                        value={settings.smtpHost}
                        onChange={e => setSettings(p => ({ ...p, smtpHost: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>SMTP Port</label>
                      <input type="text" className="input-field text-sm p-3 w-full font-mono" placeholder="587"
                        value={settings.smtpPort}
                        onChange={e => setSettings(p => ({ ...p, smtpPort: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>SMTP Authenticated User</label>
                      <input type="email" className="input-field text-sm p-3 w-full font-mono" placeholder="alerts@kyu.ac.ug"
                        value={settings.smtpUser}
                        onChange={e => setSettings(p => ({ ...p, smtpUser: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={fieldLabel}>Outgoing Sender Header (From)</label>
                      <input type="email" className="input-field text-sm p-3 w-full font-mono" placeholder="KyU Portal Alerts <alerts@kyu.ac.ug>"
                        value={settings.smtpFrom}
                        onChange={e => setSettings(p => ({ ...p, smtpFrom: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SECTION: CARD DESIGN */}
              <TabsContent value="carddesign" className="p-6 space-y-8">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-primary" /> ID Card Design & Layout
                  </CardTitle>
                  <CardDescription className="text-xs">Configure the physical ID card template, back-side content, and secretary signature.</CardDescription>
                </div>

                {/* ── Template Mode Selection ── */}
                <div className="space-y-3">
                  <label className={fieldLabel}>Card Template Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Built-in */}
                    <button type="button"
                      onClick={() => setSettings(p => ({ ...p, templateMode: 'builtin' }))}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center cursor-pointer ${
                        settings.templateMode === 'builtin'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                          : 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:bg-blue-50/40 shadow-sm'
                      }`}>
                      <LayoutTemplate size={22} className={settings.templateMode === 'builtin' ? 'text-blue-500' : 'text-blue-400/80 dark:text-blue-500/70'} />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide">Built-in Design</div>
                        <div className="text-[10px] font-semibold mt-0.5 opacity-70 leading-snug">Uses the system's default premium landscape card design</div>
                      </div>
                    </button>

                    {/* Custom Template */}
                    <button type="button"
                      onClick={() => setSettings(p => ({ ...p, templateMode: 'template' }))}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center cursor-pointer ${
                        settings.templateMode === 'template'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                          : 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:bg-blue-50/40 shadow-sm'
                      }`}>
                      <FileText size={22} className={settings.templateMode === 'template' ? 'text-blue-500' : 'text-blue-400/80 dark:text-blue-500/70'} />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide">Custom SVG/PDF Template</div>
                        <div className="text-[10px] font-semibold mt-0.5 opacity-70 leading-snug">Upload your own card template file</div>
                      </div>
                    </button>

                    {/* AI Scan */}
                    <button type="button"
                      onClick={() => setSettings(p => ({ ...p, templateMode: 'ai-scan' }))}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center cursor-pointer ${
                        settings.templateMode === 'ai-scan'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                          : 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:bg-blue-50/40 shadow-sm'
                      }`}>
                      <Sparkles size={22} className={settings.templateMode === 'ai-scan' ? 'text-blue-500' : 'text-blue-400/80 dark:text-blue-500/70'} />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide">AI Redesign from Scan</div>
                        <div className="text-[10px] font-semibold mt-0.5 opacity-70 leading-snug">Upload a scanned sample and auto-generate the template</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Built-in Template Customizer (shown when templateMode === 'builtin') ── */}
                {settings.templateMode === 'builtin' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Customizer Controls (col-span-7) */}
                    <div className="lg:col-span-7 space-y-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wide">Built-in Template Customizer</h4>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Customize text banners and toggles for the primary system template.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSettings(p => ({
                              ...p,
                              cardBannerText: 'KYAMBOGO UNIVERSITY',
                              cardHeaderTitle: 'OFFICIAL STAFF IDENTITY CARD',
                              cardSubtitle: 'Knowledge and Skills for Service',
                              cardWatermarkText: 'KYAMBOGO UNIVERSITY',
                              showWatermark: true,
                              showBarcode: true,
                              showDepartment: true,
                              showPosition: true
                            }));
                            showToast('Template fields reset to KyU defaults!', 'info');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 transition-all duration-200"
                        >
                          <Sparkles size={11} /> Restore KyU Defaults
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1.5">
                          <label className={fieldLabel}>Banner Text (Top Background Ribbon)</label>
                          <input type="text" className="input-field text-sm p-3 w-full font-bold" placeholder="KYAMBOGO UNIVERSITY"
                            value={settings.cardBannerText || ''}
                            onChange={e => setSettings(p => ({ ...p, cardBannerText: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                          <label className={fieldLabel}>Header Title (Bold Main Header)</label>
                          <input type="text" className="input-field text-sm p-3 w-full font-bold" placeholder="STAFF IDENTIFICATION CARD"
                            value={settings.cardHeaderTitle || ''}
                            onChange={e => setSettings(p => ({ ...p, cardHeaderTitle: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                          <label className={fieldLabel}>Card Subtitle (Yellow Accent Motto)</label>
                          <input type="text" className="input-field text-sm p-3 w-full font-bold" placeholder="Knowledge and Skills for Service"
                            value={settings.cardSubtitle || ''}
                            onChange={e => setSettings(p => ({ ...p, cardSubtitle: e.target.value }))} />
                        </div>

                        <div className="space-y-1.5">
                          <label className={fieldLabel}>Watermark Text (Security Overlay)</label>
                          <input type="text" className="input-field text-sm p-3 w-full font-bold" placeholder="DICTS STAFF SECURITY"
                            value={settings.cardWatermarkText || ''}
                            onChange={e => setSettings(p => ({ ...p, cardWatermarkText: e.target.value }))} />
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* showWatermark */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-350 tracking-wider">Watermark Overlay</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Show background pattern</span>
                          </div>
                          <Switch checked={!!settings.showWatermark}
                            onCheckedChange={checked => setSettings(p => ({ ...p, showWatermark: checked }))} />
                        </div>

                        {/* showBarcode */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-350 tracking-wider">Barcode & QR Code</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Show machine scans</span>
                          </div>
                          <Switch checked={!!settings.showBarcode}
                            onCheckedChange={checked => setSettings(p => ({ ...p, showBarcode: checked }))} />
                        </div>

                        {/* showDepartment */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-350 tracking-wider">Department Details</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Display staff division</span>
                          </div>
                          <Switch checked={!!settings.showDepartment}
                            onCheckedChange={checked => setSettings(p => ({ ...p, showDepartment: checked }))} />
                        </div>

                        {/* showPosition */}
                        <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/15 dark:bg-blue-950/20 backdrop-blur-sm shadow-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-350 tracking-wider">Position Title</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Display staff rank/role</span>
                          </div>
                          <Switch checked={!!settings.showPosition}
                            onCheckedChange={checked => setSettings(p => ({ ...p, showPosition: checked }))} />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Virtual ID Card Preview (col-span-5) */}
                    <div className="lg:col-span-5 flex flex-col gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-md">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-2">
                          <Sparkles size={13} className="text-blue-500 animate-pulse" /> Live Card Preview
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Interactive digital twin reflects layout changes in real-time.</p>
                      </div>

                      {/* Virtual ID Card Renderer */}
                      <div className="w-full flex justify-center py-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3 min-h-[300px] items-center relative overflow-hidden shadow-inner">
                        <VirtualIdCard
                          application={mockApplication}
                          settings={settings}
                          showBothSides={true}
                          initialSide="front"
                        />
                      </div>

                      <div className="rounded-lg p-3 bg-blue-50/20 dark:bg-slate-950/40 border border-blue-200/30 text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase">
                        💡 Click the tabs above the card to switch between <span className="font-black text-[#1e5fb8] dark:text-blue-400">Front</span> and <span className="font-black text-[#1e5fb8] dark:text-blue-400">Back</span> sides to inspect text rendering and signature placements.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Custom Template Upload (shown when templateMode === 'template') ── */}
                {settings.templateMode === 'template' && (
                  <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
                    <label className={fieldLabel}>Custom ID Card Template (SVG or PDF)</label>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide -mt-1">
                      Upload a vector SVG or PDF template. Placeholders like {'{{name}}'}, {'{{id}}'} will be replaced at print time.
                    </p>
                    {settings.idCardTemplateUrl ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <FileText size={18} className="text-blue-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate flex-1">
                          {settings.idCardTemplateUrl.split('/').pop() || 'template-file'}
                        </span>
                        <button type="button"
                          onClick={() => setSettings(p => ({ ...p, idCardTemplateUrl: '' }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-rose-550/10 hover:bg-rose-550 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-800/80 transition-all">
                          <Trash2 size={11} /> Remove Template
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/20 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                        {uploadingTemplate ? (
                          <Loader2 size={20} className="text-blue-500 animate-spin" />
                        ) : (
                          <Upload size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-500 transition-colors">
                          {uploadingTemplate ? 'Uploading...' : 'SVG vector layout or PDF template'}
                        </span>
                        {!uploadingTemplate && (
                          <div className="mt-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm hover:bg-blue-600 transition-all">
                            Browse Template
                          </div>
                        )}
                        <input type="file" accept=".svg,.pdf" className="sr-only"
                          disabled={uploadingTemplate}
                          onChange={handleTemplateUpload} />
                      </label>
                    )}
                  </div>
                )}

                {/* ── AI Scan Upload (shown when templateMode === 'ai-scan') ── */}
                {settings.templateMode === 'ai-scan' && (
                  <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
                    <label className={fieldLabel}>Upload Scanned ID Card Sample</label>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide -mt-1">
                      The system will analyze the layout, colors and branding from your scanned card.
                    </p>

                    {/* Coming-soon notice */}
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                      <Sparkles size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                        AI template generation is available in the enterprise version. Your uploaded scan has been saved for when this feature is enabled.
                      </p>
                    </div>

                    {settings.idCardTemplateUrl ? (
                      <div className="space-y-2">
                        {/* Preview the uploaded scan */}
                        <div className="relative w-48 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={settings.idCardTemplateUrl} alt="Scanned ID sample" className="object-cover w-full h-full" />
                        </div>
                        <button type="button"
                          onClick={() => setSettings(p => ({ ...p, idCardTemplateUrl: '' }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-rose-550/10 hover:bg-rose-550 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-800/80 transition-all w-max">
                          <Trash2 size={11} /> Remove Scan
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/20 cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all group">
                        {uploadingAiScan ? (
                          <Loader2 size={20} className="text-amber-500 animate-spin" />
                        ) : (
                          <Upload size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-amber-500 transition-colors">
                          {uploadingAiScan ? 'Uploading scan...' : 'Scanned ID card image'}
                        </span>
                        {!uploadingAiScan && (
                          <div className="mt-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm hover:bg-amber-600 transition-all">
                            Browse Scan Image
                          </div>
                        )}
                        <input type="file" accept="image/*" className="sr-only"
                          disabled={uploadingAiScan}
                          onChange={handleAiScanUpload} />
                      </label>
                    )}

                    {/* Analyze button (decorative — enterprise feature) */}
                    <button type="button" disabled
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white opacity-50 cursor-not-allowed"
                      style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}>
                      <Sparkles size={13} /> Analyze & Generate Template
                    </button>
                  </div>
                )}

                {/* ── Secretary Signature Upload ── */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
                  <div>
                    <label className={fieldLabel}>University Secretary Signature</label>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                      This signature will appear on the back of all issued ID cards.
                    </p>
                  </div>

                  {settings.secretarySignatureUrl ? (
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Signature preview */}
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={settings.secretarySignatureUrl} alt="Secretary signature preview"
                          className="h-16 w-auto object-contain max-w-[180px]" />
                      </div>
                      <div className="flex flex-col gap-2 mt-1 min-w-[140px]">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer">
                          <Upload size={12} /> Replace Signature
                          <input type="file" accept="image/*" className="sr-only"
                            disabled={uploadingSignature}
                            onChange={handleSignatureUpload} />
                        </label>
                        <button type="button"
                          onClick={() => setSettings(p => ({ ...p, secretarySignatureUrl: '' }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-rose-550/10 hover:bg-rose-550 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-800/80 transition-all">
                          <Trash2 size={12} /> Remove Signature
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/20 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                      {uploadingSignature ? (
                        <Loader2 size={20} className="text-blue-500 animate-spin" />
                      ) : (
                        <Upload size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-500 transition-colors">
                        {uploadingSignature ? 'Uploading...' : 'PNG Signature File (transparent recommended)'}
                      </span>
                      {!uploadingSignature && (
                        <div className="mt-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm hover:bg-blue-600 transition-all">
                          Browse Signature
                        </div>
                      )}
                      <input type="file" accept="image/*" className="sr-only"
                        disabled={uploadingSignature}
                        onChange={handleSignatureUpload} />
                    </label>
                  )}
                </div>

                {/* ── Return Address ── */}
                <div className="space-y-2">
                  <label className={fieldLabel}>Return Address (Card Back)</label>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide -mt-1">
                    Printed on the back of the ID card beneath the "If found, please return to:" line.
                  </p>
                  <textarea
                    rows={4}
                    className="input-field text-sm p-3 w-full font-mono resize-none leading-relaxed"
                    placeholder={"e.g. Kyambogo University\nICT Registry Office\nKampala, Uganda\nTel: +256 41 ..."}
                    value={settings.returnAddress}
                    onChange={e => setSettings(p => ({ ...p, returnAddress: e.target.value }))}
                  />
                </div>

              </TabsContent>

              {/* Submittable footer buttons */}
              <div className="flex justify-end gap-3 px-6 py-4.5 border-t border-white/40 dark:border-slate-800/50 bg-white/20 dark:bg-slate-900/10 backdrop-blur-xs">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                    backgroundColor: '#1e5fb8'
                  }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="stroke-[3]" /> Commit Changes</>}
                </button>
              </div>

            </form>
          </Card>
        </div>
      </Tabs>

      {/* Toast popup alerts */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
