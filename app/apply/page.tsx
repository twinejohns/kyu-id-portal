"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validatePassportPhoto } from '@/utils/aiPhotoValidator';
import { processSignatureImage } from '@/utils/signatureProcessor';
import { 
  CheckCircle, AlertCircle, UploadCloud, ChevronRight, ChevronLeft, 
  Loader2, Image as ImageIcon, Phone, Sparkles, CreditCard, 
  Briefcase, Building, Calendar, FileText, User, ShieldCheck, Mail, Info,
  X, AlertTriangle, ArrowRight
} from 'lucide-react';
import BiometricEditor from '@/components/BiometricEditor';

type Department = { id: string; name: string; positions: { id: string; title: string }[] };

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    departmentId: '',
    positionId: '',
    applicationType: 'NEW',
    currentIdNumber: '',
    dontRememberId: false,
    replacementReason: '',
    employmentTerm: 'PERMANENT',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentLetterUrl: '',
    photoUrl: '',
    signatureUrl: ''
  });

  const [aiResult, setAiResult] = useState<{ isValid: boolean; score: number; message: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [signaturePreview, setSignaturePreview] = useState('');

  // Biometric Editor Modal State
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    aspectRatio: number;
    type: 'photo' | 'signature';
    title: string;
  } | null>(null);

  // Duplicate Email Validation States
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [duplicateEmailState, setDuplicateEmailState] = useState<{
    email: string;
    stage: 'identity_check' | 'block_different' | 'block_active' | 'allow_rejected' | 'prompt_replacement';
    latestApplication: any;
  } | null>(null);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(data => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  const uploadBlob = async (blob: Blob, fileName: string) => {
    const fd = new FormData();
    fd.append('file', blob, fileName);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    return data.url;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setEditorState({
      isOpen: true,
      imageSrc: objUrl,
      aspectRatio: 1,
      type: 'photo',
      title: 'Biometric Passport Photo Editor'
    });
    e.target.value = ''; // clear input
  };

  const handleSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setEditorState({
      isOpen: true,
      imageSrc: objUrl,
      aspectRatio: 3,
      type: 'signature',
      title: 'Biometric Signature Editor'
    });
    e.target.value = ''; // clear input
  };

  const handleSaveCroppedBiometric = async (croppedBlob: Blob) => {
    const type = editorState?.type;
    setEditorState(null); // close modal

    if (type === 'photo') {
      const objUrl = URL.createObjectURL(croppedBlob);
      setPhotoPreview(objUrl);
      setAiResult({ isValid: false, score: 0, message: "Validating cropped passport photo quality..." });

      // Run AI validation on cropped photo
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await validatePassportPhoto(img);
          setAiResult(result);
          
          if (result.isValid) {
            const url = await uploadBlob(croppedBlob, `photo-${Date.now()}.png`);
            setFormData(prev => ({ ...prev, photoUrl: url }));
          }
        } catch (err) {
          console.error('AI Photo validation error:', err);
          setAiResult({ isValid: false, score: 0, message: "AI validation failed. Please crop/try another photo." });
        }
      };
      img.src = objUrl;
    } else if (type === 'signature') {
      try {
        // Convert Blob to File first for processSignatureImage compatibility
        const sigFile = new File([croppedBlob], `sig-cropped-${Date.now()}.png`, { type: 'image/png' });
        const processedBlob = await processSignatureImage(sigFile);
        
        const objUrl = URL.createObjectURL(processedBlob);
        setSignaturePreview(objUrl);
        
        const url = await uploadBlob(processedBlob, `sig-processed-${Date.now()}.png`);
        setFormData(prev => ({ ...prev, signatureUrl: url }));
      } catch (err) {
        console.error(err);
        alert('Failed to process transparent signature.');
      }
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setFormData(prev => ({ ...prev, appointmentLetterUrl: data.url }));
  };

  const loadRejectedApplication = () => {
    const app = duplicateEmailState?.latestApplication;
    if (!app) return;
    
    setFormData({
      fullName: app.fullName,
      email: app.email,
      phoneNumber: app.phoneNumber || '',
      departmentId: app.departmentId,
      positionId: app.positionId,
      applicationType: app.applicationType,
      currentIdNumber: app.currentIdNumber || '',
      dontRememberId: !app.currentIdNumber,
      replacementReason: app.replacementReason || '',
      employmentTerm: app.employmentTerm || 'PERMANENT',
      appointmentDate: app.appointmentDate ? app.appointmentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      appointmentLetterUrl: app.appointmentLetterUrl,
      photoUrl: app.photoUrl,
      signatureUrl: app.signatureUrl
    });

    setPhotoPreview(app.photoUrl);
    setSignaturePreview(app.signatureUrl);
    setAiResult({ isValid: true, score: 95, message: "Previously uploaded photo. Re-verification not required unless changed." });
    setEditingAppId(app.id);
    setDuplicateEmailState(null);
  };

  const handleContinueStep1 = async () => {
    if (!formData.fullName || !formData.email || !formData.departmentId || !formData.positionId) {
      alert('Please fill out all required fields.');
      return;
    }
    
    if (!formData.email.endsWith('@kyu.ac.ug')) {
      alert('Email must end with @kyu.ac.ug');
      return;
    }

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/applications?email=${encodeURIComponent(formData.email)}`);
      const data = await res.json();
      
      if (data.success && data.applications && data.applications.length > 0) {
        const latest = data.applications[0];
        
        if (editingAppId === latest.id) {
          setStep(2);
          return;
        }

        // If user already chose REPLACEMENT and we find their previous issued ID in system
        if (formData.applicationType === 'REPLACEMENT' && ['APPROVED', 'PRINTED', 'ISSUED'].includes(latest.status)) {
          setFormData(prev => ({
            ...prev,
            currentIdNumber: prev.currentIdNumber || latest.generatedIdNumber || '',
            dontRememberId: !prev.currentIdNumber && !latest.generatedIdNumber ? true : false
          }));
          setStep(2);
          return;
        }

        setDuplicateEmailState({
          email: formData.email,
          stage: 'identity_check',
          latestApplication: latest
        });
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error('Email verification error:', err);
      setStep(2); // Fallback
    } finally {
      setCheckingEmail(false);
    }
  };

  const submitApplication = async () => {
    setSubmitting(true);
    try {
      const isEditing = !!editingAppId;
      const url = isEditing ? `/api/applications/${editingAppId}` : '/api/applications';
      const method = isEditing ? 'PATCH' : 'POST';
      const bodyPayload = isEditing 
        ? { ...formData, status: 'SUBMITTED', dictsComments: null, hrComments: null }
        : formData;

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedAppId(data.application.id);
        setStep(4); // Show success / level tracker screen
        setTimeout(() => router.push(`/status/${data.application.id}`), 15000);
      } else {
        alert(data.error);
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert('Submission failed.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-container flex flex-col items-center justify-center min-h-screen bg-[#f6f8fc] dark:bg-[#0f172a]">
        <Loader2 className="animate-spin text-[#1e5fb8] mb-4" size={48} />
        <p className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Loading Registry Data...</p>
      </div>
    );
  }

  const positions = departments.find(d => d.id === formData.departmentId)?.positions || [];

  return (
    <main className="landing-container min-h-screen py-16 px-4 dashboard-bg-theme relative overflow-hidden flex items-center justify-center">
      
      {/* Background blobs for premium depth */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2" style={{ top: 'auto', bottom: '-200px' }}></div>

      <div className="max-w-4xl w-full mx-auto relative z-10 space-y-8 animate-fade-in">
        
        {/* Step Indicator Panel */}
        <div className="bg-white/50 dark:bg-slate-900/35 border border-white/60 dark:border-slate-800/60 backdrop-blur-md rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="KyU Logo" 
              className="w-11 h-11 object-contain p-0.5 bg-white rounded-xl shadow-md border border-gray-100" 
            />
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Staff ID Portal</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Kyambogo University Request Desk</p>
            </div>
          </div>
          
          {/* Animated Steps Path */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Profile' },
              { num: 2, label: 'Documents' },
              { num: 3, label: 'Biometrics' },
            ].map(s => (
              <React.Fragment key={s.num}>
                {s.num > 1 && (
                  <div className={`w-6 md:w-10 h-0.5 rounded-full transition-all duration-300 ${
                    step >= s.num ? 'bg-gradient-to-r from-[#1e5fb8] to-[#0f3c78]' : 'bg-slate-200 dark:bg-slate-850'
                  }`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div 
                    className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-black shadow-sm transition-all duration-300 ${
                      step === s.num 
                        ? 'bg-gradient-to-r from-[#1e5fb8] to-[#0f3c78] text-white ring-4 ring-blue-500/20 scale-110' 
                        : step > s.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className={`text-[10.5px] font-black uppercase tracking-wider hidden sm:inline ${
                    step === s.num ? 'text-[#1e5fb8] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Application Card */}
        <div className="glass-card shadow-2xl overflow-hidden p-6 md:p-10 relative border border-white/60 dark:border-slate-800/80">
          
          {/* Decorative glowing band */}
          <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ background: 'linear-gradient(to right, #1e5fb8, #cbd5e1, #8dc63f, #f9b012)' }} />

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="animate-fade-in space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <User className="text-[#1e5fb8] dark:text-blue-400 shrink-0 w-6 h-6" />
                  Personal & Employment Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">Level 1 Registration</p>
              </div>

              {/* Grid 1: Name and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <User size={13} className="text-[#1e5fb8]" /> Full Name
                  </label>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">As stated on your official appointment letter</p>
                  <input 
                    type="text" 
                    className="input-field shadow-xs" 
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                    placeholder="e.g. Prof. John Doe" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Mail size={13} className="text-[#1e5fb8]" /> Email Address
                  </label>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">Official University domain only</p>
                  <input 
                    type="email" 
                    className="input-field shadow-xs" 
                    value={formData.email} 
                    onChange={e => { setFormData({...formData, email: e.target.value}); if (editingAppId) setEditingAppId(null); }} 
                    placeholder="e.g. jdoe@kyu.ac.ug" 
                  />
                </div>
              </div>

              {/* Grid 2: Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Phone size={13} className="text-[#1e5fb8]" /> Phone Number <span className="text-[10px] text-slate-400 font-semibold lowercase italic">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field shadow-xs"
                    value={formData.phoneNumber}
                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    placeholder="+256 7XX XXX XXX"
                  />
                </div>
              </div>

              {/* Grid 3: Department and Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Building size={13} className="text-[#1e5fb8]" /> Department
                  </label>
                  <select 
                    className="input-field shadow-xs" 
                    value={formData.departmentId} 
                    onChange={e => setFormData({...formData, departmentId: e.target.value, positionId: ''})}
                  >
                    <option value="">Select Department...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Briefcase size={13} className="text-[#1e5fb8]" /> Position / Staff Title
                  </label>
                  <select 
                    className="input-field shadow-xs" 
                    value={formData.positionId} 
                    onChange={e => setFormData({...formData, positionId: e.target.value})} 
                    disabled={!formData.departmentId}
                  >
                    <option value="">Select Position...</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Grid 4: Terms and Appointment Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Briefcase size={13} className="text-[#1e5fb8]" /> Employment Terms
                  </label>
                  <select 
                    className="input-field shadow-xs" 
                    value={formData.employmentTerm} 
                    onChange={e => setFormData({...formData, employmentTerm: e.target.value})}
                  >
                    <option value="PERMANENT">Permanent / Tenured</option>
                    <option value="CONTRACT">Contract Basis</option>
                    <option value="TEMPORARY">Temporary</option>
                    <option value="PARTTIME">Part-Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="form-label flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#1e5fb8]" /> Appointment Date
                  </label>
                  <input 
                    type="date" 
                    className="input-field shadow-xs" 
                    value={formData.appointmentDate} 
                    onChange={e => setFormData({...formData, appointmentDate: e.target.value})} 
                  />
                </div>
              </div>

              {/* Interactive Request Type Selection (Redesigned Cards) */}
              <div className="space-y-3.5 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                <label className="form-label text-slate-800 dark:text-slate-200">Application Reason</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Card 1: New */}
                  <div 
                    onClick={() => setFormData({...formData, applicationType: 'NEW', replacementReason: '', currentIdNumber: ''})}
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none bg-white/40 dark:bg-slate-900/10 ${
                      formData.applicationType === 'NEW' 
                        ? 'border-[#1e5fb8] shadow-[0_4px_20px_-3px_rgba(30,95,184,0.18)] scale-[1.01]' 
                        : 'border-slate-200/80 dark:border-slate-800/60 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${formData.applicationType === 'NEW' ? 'bg-[#1e5fb8] text-white' : 'bg-slate-100 dark:bg-slate-850 text-slate-400'}`}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block leading-tight">First-Time Request</span>
                      <span className="text-[11px] text-slate-400 mt-1 block font-medium leading-normal">Initial registration and physical staff card generation.</span>
                    </div>
                    {formData.applicationType === 'NEW' && <div className="absolute top-0 right-0 w-4 h-4 bg-[#1e5fb8] rounded-bl-lg" />}
                  </div>

                  {/* Card 2: Replacement */}
                  <div 
                    onClick={() => setFormData({...formData, applicationType: 'REPLACEMENT'})}
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none bg-white/40 dark:bg-slate-900/10 ${
                      formData.applicationType === 'REPLACEMENT' 
                        ? 'border-[#1e5fb8] shadow-[0_4px_20px_-3px_rgba(30,95,184,0.18)] scale-[1.01]' 
                        : 'border-slate-200/80 dark:border-slate-800/60 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${formData.applicationType === 'REPLACEMENT' ? 'bg-[#1e5fb8] text-white' : 'bg-slate-100 dark:bg-slate-850 text-slate-400'}`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block leading-tight">Replacement Request</span>
                      <span className="text-[11px] text-slate-400 mt-1 block font-medium leading-normal">Lost, damaged, promotion details change, or wear/tear card re-issue.</span>
                    </div>
                    {formData.applicationType === 'REPLACEMENT' && <div className="absolute top-0 right-0 w-4 h-4 bg-[#1e5fb8] rounded-bl-lg" />}
                  </div>

                </div>
              </div>

              {/* Replacement details if selected */}
              {formData.applicationType === 'REPLACEMENT' && (
                <div className="animate-slide-up space-y-4 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="form-label">Replacement Reason</label>
                      <select 
                        className="input-field" 
                        value={formData.replacementReason} 
                        onChange={e => setFormData({...formData, replacementReason: e.target.value})}
                      >
                        <option value="">Select Reason...</option>
                        <option value="LOST_DAMAGE">Lost / Damaged</option>
                        <option value="STOLEN">Stolen</option>
                        <option value="PROMOTION_DEPLOYMENT">Promotion / Redeployment</option>
                        <option value="NAME_CHANGE">Name Change</option>
                        <option value="WEAR_TEAR">Wear & Tear</option>
                        <option value="OTHER">Other Reason</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="form-label">Previous ID Number</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        disabled={formData.dontRememberId}
                        value={formData.currentIdNumber} 
                        onChange={e => setFormData({...formData, currentIdNumber: e.target.value})} 
                        placeholder="e.g. KYU-STF-2024-0042" 
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-200/60 text-[#1e5fb8] focus:ring-[#1e5fb8] dark:border-slate-800" 
                      checked={formData.dontRememberId} 
                      onChange={e => setFormData({...formData, dontRememberId: e.target.checked, currentIdNumber: ''})} 
                    />
                    I do not remember my previous ID number
                  </label>
                </div>
              )}

              {/* Navigation button */}
              <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button 
                  className="btn-primary flex items-center gap-2" 
                  disabled={
                    checkingEmail ||
                    !formData.fullName || 
                    !formData.email || 
                    !formData.departmentId || 
                    !formData.positionId || 
                    (formData.applicationType === 'REPLACEMENT' && !formData.replacementReason) ||
                    (formData.applicationType === 'REPLACEMENT' && !formData.currentIdNumber && !formData.dontRememberId)
                  }
                  style={{
                    backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                    backgroundColor: '#1e5fb8'
                  }}
                  onClick={handleContinueStep1}
                >
                  {checkingEmail ? (
                    <>
                      <Loader2 className="animate-spin" size={15} /> Verifying...
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight size={15} className="stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Documents */}
          {step === 2 && (
            <div className="animate-fade-in space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <FileText className="text-[#1e5fb8] dark:text-blue-400 shrink-0 w-6 h-6" />
                  Appointment Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">Level 2 Document Attestation</p>
              </div>
              
              <div className="space-y-4">
                <label className="form-label text-slate-800 dark:text-slate-200">Appointment Letter (PDF format)</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 leading-relaxed">
                  Please upload a scanned copy of your official university appointment letter. The HR registry will manually audit the scanned details against the database entries before final staff ID authorization.
                </p>
                
                {/* Premium Drag and Drop block */}
                <div className="border-2 border-dashed border-slate-200/80 dark:border-slate-800/60 rounded-2xl p-12 text-center bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all duration-300 relative group cursor-pointer flex flex-col items-center justify-center gap-4">
                  <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handlePdfUpload} />
                  
                  <div className="w-14 h-14 rounded-full bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                    <UploadCloud size={28} className="text-slate-400 group-hover:text-[#1e5fb8] transition-colors stroke-[2.5]" />
                  </div>
                  
                  <div>
                    <span className="font-extrabold text-slate-700 dark:text-slate-350 text-sm block">Click or drag PDF letter to upload</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold mt-1.5 block">Document must be under 5MB</span>
                  </div>

                  {formData.appointmentLetterUrl && (
                    <div className="mt-3 relative z-20 flex flex-col items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/60">
                        <CheckCircle size={14} className="stroke-[3]" /> Document Uploaded
                      </span>
                      {pdfFileName && <span className="text-[10px] font-semibold text-slate-400 font-mono">{pdfFileName}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Informational checklist card */}
              <div className="bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl p-4.5 border border-blue-100/50 dark:border-blue-900/30 flex items-start gap-3">
                <Info size={16} className="text-[#1e5fb8] shrink-0 mt-0.5" />
                <div className="text-left space-y-1">
                  <span className="text-xs font-black uppercase text-[#1e5fb8] tracking-wide block">Verification Guideline</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block">Make sure the scan clearly captures the official signature lines and institutional stamps from the DICTS System Administrator or DICTS Registry. Scans of poor quality or missing authentication signatures will be rejected by HR.</span>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button className="btn-secondary flex items-center gap-2" onClick={() => setStep(1)}><ChevronLeft size={15} className="stroke-[3]" /> Back</button>
                <button 
                  className="btn-primary flex items-center gap-2" 
                  disabled={!formData.appointmentLetterUrl} 
                  style={{
                    backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                    backgroundColor: '#1e5fb8'
                  }}
                  onClick={() => setStep(3)}
                >
                  Continue <ChevronRight size={15} className="stroke-[3]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Biometrics */}
          {step === 3 && (
            <div className="animate-fade-in space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <ShieldCheck className="text-[#1e5fb8] dark:text-blue-400 shrink-0 w-6 h-6" />
                  Biometric Processing
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">Level 3 Photo & Signature Scan</p>
              </div>

              {/* Grid block for Photo and Signature */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                
                {/* 1. Passport Photograph */}
                <div className="space-y-4 bg-slate-50/20 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#1e5fb8] tracking-widest block">Biometric asset 1</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Passport Photograph</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Must feature a neutral expression looking straight on a plain white background. AI checks biometric features.
                    </p>
                  </div>

                  {/* Camera view area */}
                  <div className="flex flex-col items-center justify-center py-4">
                    {photoPreview ? (
                      <div className="relative group w-32 h-32 rounded-xl overflow-hidden border-2 border-[#1e5fb8]/30 shadow-md bg-white flex items-center justify-center">
                        <img src={photoPreview} alt="Passport Crop" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <label className="text-[10px] font-black uppercase text-white tracking-widest cursor-pointer select-none bg-blue-600/80 px-3 py-1.5 rounded-lg">
                            Change
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group w-32 h-32 rounded-xl border-2 border-dashed border-slate-200/80 dark:border-slate-850 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-950 transition-colors hover:border-[#1e5fb8] cursor-pointer">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handlePhotoSelect} />
                        <ImageIcon size={30} className="stroke-[1.5]" />
                        <span className="text-[9px] mt-1.5 font-black uppercase tracking-wider">Upload Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Realtime AI Status Ledger */}
                  {aiResult && (
                    <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all duration-300 ${
                      aiResult.isValid 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/60' 
                        : 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/60'
                    }`}>
                      {aiResult.isValid ? <CheckCircle size={16} className="shrink-0 mt-0.5 stroke-[3] text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 mt-0.5 stroke-[3] text-rose-500" />}
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest block">
                          {aiResult.isValid ? 'AI Verified ✓' : 'AI Verification Alert'} (Score: {aiResult.score})
                        </span>
                        <p className="text-[10.5px] mt-1 font-semibold leading-normal">{aiResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Official Signature */}
                <div className="space-y-4 bg-slate-50/20 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#1e5fb8] tracking-widest block">Biometric asset 2</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Official Signature</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Sign clearly on white paper, scan and crop. The processing engine will automatically remove the background.
                    </p>
                  </div>

                  {/* Signature view area */}
                  <div className="flex flex-col items-center justify-center py-8">
                    {signaturePreview ? (
                      <div className="relative group w-full h-20 rounded-xl overflow-hidden border border-slate-200/80 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYNgfQEhQAuWv/yEE/zEQD4gxkGwAKzGMDDT2AGs4gA1nYACjZgARAgCzWzYvK5e4uAAAAABJRU5ErkJggg==')] flex items-center justify-center">
                        <img src={signaturePreview} alt="Signature Processed" className="max-h-full max-w-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <label className="text-[10px] font-black uppercase text-white tracking-widest cursor-pointer select-none bg-blue-600/80 px-3 py-1.5 rounded-lg">
                            Change
                            <input type="file" accept="image/*" className="hidden" onChange={handleSignatureSelect} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group w-full h-20 rounded-xl border-2 border-dashed border-slate-200/80 dark:border-slate-850 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-950 transition-colors hover:border-[#1e5fb8] cursor-pointer">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleSignatureSelect} />
                        <UploadCloud size={24} className="stroke-[1.5]" />
                        <span className="text-[9px] mt-1 font-black uppercase tracking-wider">Upload Signature</span>
                      </div>
                    )}
                  </div>

                  {formData.signatureUrl && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/60 rounded-xl flex items-center gap-2">
                      <CheckCircle size={14} className="shrink-0 stroke-[3]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Biometric Signature Extracted</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/80">
                <button className="btn-secondary flex items-center gap-2" disabled={submitting} onClick={() => setStep(2)}><ChevronLeft size={15} className="stroke-[3]" /> Back</button>
                <button 
                  className="btn-primary flex items-center gap-2" 
                  disabled={!formData.photoUrl || !formData.signatureUrl || !aiResult?.isValid || submitting} 
                  style={{
                    backgroundImage: 'linear-gradient(to right, #059669, #047857)',
                    backgroundColor: '#059669'
                  }}
                  onClick={submitApplication}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={15} /> Processing...
                    </>
                  ) : (
                    <>
                      Submit Application <CheckCircle size={15} className="stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success tracker */}
          {step === 4 && (
            <div className="animate-fade-in flex flex-col items-center text-center gap-8 py-4">
              
              {/* Pulsing Success Ring */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border-4 border-emerald-200 dark:border-emerald-900 flex items-center justify-center shadow-lg">
                  <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                </div>
                <div className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-25" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Application Received!</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed font-semibold">
                  Hello <strong className="text-slate-900 dark:text-white font-extrabold">{formData.fullName}</strong>, your request has been logged successfully and routed to the DICTS Media Verification queue.
                </p>
              </div>

              {/* Progress journey map */}
              <div className="w-full bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 space-y-6 shadow-xs">
                <div className="text-left space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Workflow Pipeline</span>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">5 levels of audit checking to card handover</h3>
                </div>

                {/* Connecting levels map */}
                <div className="relative pt-2">
                  <div className="absolute top-5 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-850 mx-12 rounded-full" />
                  <div className="absolute top-5 left-0 h-[3px] bg-[#1e5fb8] rounded-full mx-12 transition-all duration-1000" style={{ width: '0%' }} />

                  <div className="grid grid-cols-5 gap-1.5 relative">
                    {[
                      { num: 1, label: 'Submitted',     sub: 'L1: DICTS Queue',  color: '#1e5fb8', active: true,  curr: true  },
                      { num: 2, label: 'Media Check',   sub: 'L2: Asset Audit',  color: '#d97706', active: false, curr: false },
                      { num: 3, label: 'HR Approval',   sub: 'L3: Staff ID',     color: '#4f46e5', active: false, curr: false },
                      { num: 4, label: 'Printed',       sub: 'L4: Physical Card',color: '#7c3aed', active: false, curr: false },
                      { num: 5, label: 'Handover',      sub: 'L5: Issuance Desk',color: '#16a34a', active: false, curr: false },
                    ].map(lvl => (
                      <div key={lvl.num} className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm border-2 transition-all duration-300 ${
                            lvl.active
                              ? 'border-transparent text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                          } ${lvl.curr ? 'ring-4 ring-blue-500/20' : ''}`}
                          style={{ background: lvl.active ? lvl.color : undefined }}
                        >
                          {lvl.num}
                        </div>
                        <div className="text-center">
                          <span className={`text-[8.5px] font-black uppercase block leading-tight ${lvl.active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300'}`}>{lvl.label}</span>
                          <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5 leading-tight">{lvl.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Level list items */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4.5 text-left">
                  {[
                    { lv: 'L1', title: 'Submitted ➔ DICTS Compliance Queue', desc: 'Passport photo and signature cropped assets checking by biometric validator.', color: '#1e5fb8', active: true },
                    { lv: 'L2', title: 'Media Check ➔ HR Attestation Desk', desc: 'Contract documentation, scan stamps and appointment letters audit by HR.', color: '#d97706', active: false },
                    { lv: 'L3', title: 'HR Approval ➔ Printer Dispatch Desk', desc: 'Permanent Staff ID assignment and virtual registration.', color: '#4f46e5', active: false },
                  ].map(lvl => (
                    <div key={lvl.lv} className={`flex items-start gap-3 p-3 rounded-xl border border-transparent transition-all duration-300 ${lvl.active ? 'bg-white dark:bg-slate-950 border-slate-200/50 dark:border-slate-850/60 shadow-xs' : 'opacity-40'}`}>
                      <span 
                        className="text-[9px] font-black px-2 py-1 rounded-md text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: lvl.active ? lvl.color : '#cbd5e1' }}
                      >
                        {lvl.lv}
                      </span>
                      <div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block">{lvl.title}</span>
                        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-normal block mt-0.5">{lvl.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic action redirects */}
              <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-4 w-full max-w-md mx-auto">
                <button 
                  onClick={() => router.push(`/status/${submittedAppId}`)}
                  className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 shrink-0 cursor-pointer"
                  style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}
                >
                  Track Application <ChevronRight size={14} className="stroke-[3]" />
                </button>
                <button 
                  onClick={() => router.push('/status')}
                  className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 shrink-0 cursor-pointer shadow-xs"
                >
                  Search Registry
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1 animate-pulse">
                Automatically redirecting to tracking dashboard in 15 seconds...
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Biometric Editor modal */}
      {editorState?.isOpen && (
        <BiometricEditor
          imageSrc={editorState.imageSrc}
          aspectRatio={editorState.aspectRatio}
          title={editorState.title}
          onSave={handleSaveCroppedBiometric}
          onClose={() => setEditorState(null)}
        />
      )}

      {/* Duplicate Email Logic Dialog Modal */}
      {duplicateEmailState && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col relative">
            
            {/* Header branding */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800/80 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1e5fb8] dark:text-blue-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {duplicateEmailState.stage === 'identity_check' && 'Registry Account Audit'}
                  {duplicateEmailState.stage === 'block_different' && 'Unique Address Required'}
                  {duplicateEmailState.stage === 'block_active' && 'Request In Progress'}
                  {duplicateEmailState.stage === 'allow_rejected' && 'Action Required'}
                  {duplicateEmailState.stage === 'prompt_replacement' && 'Active Card Issued'}
                </h3>
              </div>
              <button 
                onClick={() => setDuplicateEmailState(null)} 
                className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Identity Check Stage */}
              {duplicateEmailState.stage === 'identity_check' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-[#1e5fb8]">
                    <User size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Verify Your Identity</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      An active application has already been registered with the email <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{duplicateEmailState.email}</strong> in the Kyambogo Staff ID Portal.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      To help us guide you to the correct desk, please specify:
                    </p>
                  </div>
                  
                  {/* Option Choice Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => {
                        const status = duplicateEmailState.latestApplication.status;
                        let nextStage: any = 'block_active';
                        if (['REJECTED_MEDIA', 'REJECTED_HR'].includes(status)) {
                          nextStage = 'allow_rejected';
                        } else if (['APPROVED', 'PRINTED', 'ISSUED'].includes(status)) {
                          nextStage = 'prompt_replacement';
                        }
                        setDuplicateEmailState(prev => prev ? { ...prev, stage: nextStage } : null);
                      }}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl hover:border-[#1e5fb8] hover:bg-slate-50 dark:hover:bg-slate-950/35 transition text-left cursor-pointer group w-full"
                    >
                      <div>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">Yes, I am the same person</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">I previously submitted an application under this email.</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-[#1e5fb8] group-hover:translate-x-0.5 transition" />
                    </button>
                    <button
                      onClick={() => setDuplicateEmailState(prev => prev ? { ...prev, stage: 'block_different' } : null)}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl hover:border-rose-300 hover:bg-rose-50/20 dark:hover:bg-rose-950/5 transition text-left cursor-pointer group w-full"
                    >
                      <div>
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">No, I am a different person</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">I have no relation to the existing application.</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                </div>
              )}

              {/* Block Different Stage */}
              {duplicateEmailState.stage === 'block_different' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600">
                    <AlertTriangle size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Official Unique Email Required</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Kyambogo University registry guidelines require **each staff member to use their own official and unique email address** (ending with `@kyu.ac.ug`).
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Shared or proxy email usage is strictly audited and will cause your application to be rejected by the HR department.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, email: '' }));
                        setDuplicateEmailState(null);
                        // Trigger email input focus
                        setTimeout(() => {
                          const el = document.querySelector('input[type="email"]') as HTMLInputElement;
                          if (el) el.focus();
                        }, 100);
                      }}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
                      style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}
                    >
                      Change Email Address
                    </button>
                  </div>
                </div>
              )}

              {/* Block Active Stage */}
              {duplicateEmailState.stage === 'block_active' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600">
                    <Loader2 size={24} className="animate-spin stroke-[2.5]" />
                  </div>
                  <div className="space-y-2.5">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Request Currently In Progress</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      You already have a Staff ID card application actively progressing through the compliance pipeline:
                    </p>
                    
                    {/* Tiny status card */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200/50 dark:border-slate-800 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#1e5fb8] block">Application ID: {duplicateEmailState.latestApplication.id.slice(0,8)}</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">Registered to: {duplicateEmailState.latestApplication.fullName}</span>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase text-slate-500">Status:</span>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 rounded-full border border-blue-150">
                          {duplicateEmailState.latestApplication.status === 'SUBMITTED' ? 'Awaiting Media Audit' : 'Awaiting HR Approval'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                      {duplicateEmailState.latestApplication.status === 'SUBMITTED' 
                        ? 'Next Step: DICTS Technical Officers are currently auditing your uploaded photograph and transparent signature biometric crops.' 
                        : 'Next Step: Your photographs are approved! The HR department is auditing your appointment verification documents and staff number assignment.'}
                    </p>
                  </div>
                  <div className="pt-4 flex justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => setDuplicateEmailState(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => router.push(`/status/${duplicateEmailState.latestApplication.id}`)}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
                      style={{ backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)', backgroundColor: '#1e5fb8' }}
                    >
                      Track Progress
                    </button>
                  </div>
                </div>
              )}

              {/* Allow Rejected Stage */}
              {duplicateEmailState.stage === 'allow_rejected' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600">
                    <AlertCircle size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-2.5">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Rejected Application Detected</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Your previously submitted application was **returned with comments** by the auditor:
                    </p>
                    
                    <div className="bg-rose-50/40 dark:bg-rose-950/10 p-4 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider block">Auditor Comments</span>
                      <p className="text-[10.5px] text-rose-750 dark:text-rose-400 italic mt-1 font-semibold leading-normal">
                        "{duplicateEmailState.latestApplication.dictsComments || duplicateEmailState.latestApplication.hrComments || 'No rejection comments provided. Please verify file sizes or details.'}"
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                      You can instantly load your previous details, edit them to correct the issues mentioned, and re-submit it.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, email: '' }));
                        setDuplicateEmailState(null);
                      }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                    >
                      Start Fresh
                    </button>
                    <button
                      onClick={loadRejectedApplication}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
                      style={{ backgroundImage: 'linear-gradient(to right, #2563eb, #1d4ed8)', backgroundColor: '#2563eb' }}
                    >
                      Edit & Re-submit
                    </button>
                  </div>
                </div>
              )}

              {/* Prompt Replacement Stage */}
              {duplicateEmailState.stage === 'prompt_replacement' && (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                    <CheckCircle size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Active Staff ID Card Exists</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      A Staff ID card is already approved or issued for this email (<strong className="text-slate-850 dark:text-slate-200 font-extrabold">{duplicateEmailState.latestApplication.generatedIdNumber}</strong>).
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      If your physical card was lost, stolen, damaged, or your registry details have changed, university policy requires you to apply for a **Replacement Request** instead.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, email: '' }));
                        setDuplicateEmailState(null);
                      }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                    >
                      Use Different Email
                    </button>
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          applicationType: 'REPLACEMENT',
                          currentIdNumber: duplicateEmailState.latestApplication.generatedIdNumber || '',
                          dontRememberId: !duplicateEmailState.latestApplication.generatedIdNumber
                        }));
                        setStep(2);
                        setDuplicateEmailState(null);
                      }}
                      className="px-4.5 py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
                      style={{ backgroundImage: 'linear-gradient(to right, #059669, #047857)', backgroundColor: '#059669' }}
                    >
                      Switch to Replacement
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </main>
  );
}
