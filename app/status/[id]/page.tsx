import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { CheckCircle, Clock, XCircle, ArrowRight, Home, Search } from 'lucide-react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import VirtualIdCard from '@/components/VirtualIdCard';

const prisma = new PrismaClient();

export default async function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const application = await prisma.staffApplication.findUnique({
    where: { id: resolvedParams.id },
    include: { position: true, department: true }
  });

  if (!application) {
    notFound();
  }

  // Fetch the card/system settings dynamically from system-settings.json
  const SETTINGS_PATH = path.join(process.cwd(), 'system-settings.json');
  let settings = {
    institutionName: 'Kyambogo University',
    institutionShortName: 'KyU',
    idPrefix: 'KYU',
    idSuffix: 'P',
    idPadding: 4,
    primaryColor: '#1e5fb8',
    secondaryColor: '#f9b012',
    enableEmailNotifications: false,
    requirePhotoValidation: true,
    maxPhotoSizeMB: 5,
    sessionTimeoutHours: 8,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpFrom: '',
    portalTagline: 'Official Staff Identity Card Management Portal',
    cardHeaderTitle: 'OFFICIAL STAFF IDENTITY CARD',
    cardSubtitle: 'Knowledge and Skills for Service',
    cardBannerText: 'KYAMBOGO UNIVERSITY',
    cardWatermarkText: 'KYAMBOGO UNIVERSITY',
    showWatermark: true,
    showBarcode: true,
    showDepartment: true,
    showPosition: true
  };

  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch {}

  const getProgressInfo = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'PENDING':
        return {
          percentage: 20,
          color: 'bg-[#1e5fb8]',
          textColor: 'text-[#1e5fb8]',
          bgLight: 'bg-blue-50/50',
          borderColor: 'border-blue-100',
          label: 'Level 1 — Submitted · Awaiting DICTS Media Compliance',
          description: 'Your application has been received and is queued for biometric compliance verification of your passport photo & signature assets.'
        };
      case 'MEDIA_APPROVED':
        return {
          percentage: 40,
          color: 'bg-[#d97706]',
          textColor: 'text-[#d97706]',
          bgLight: 'bg-amber-50/50',
          borderColor: 'border-amber-100',
          label: 'Level 2 — Awaiting HR Registry Verification',
          description: 'DICTS Media has approved your biometric assets. Your application is now with the HR Admin for contract verification and staff ID assignment.'
        };
      case 'APPROVED':
        return {
          percentage: 60,
          color: 'bg-indigo-600',
          textColor: 'text-indigo-600',
          bgLight: 'bg-indigo-50/50',
          borderColor: 'border-indigo-100',
          label: 'Level 3 — HR Approved · Queued for Printing',
          description: 'HR has verified your contract details and assigned your official staff ID number. Your Virtual ID is now accessible as you await physical printing.'
        };
      case 'PRINTED':
        return {
          percentage: 80,
          color: 'bg-purple-600',
          textColor: 'text-purple-600',
          bgLight: 'bg-purple-50/50',
          borderColor: 'border-purple-100',
          label: 'Level 4 — Printed · Ready for Collection',
          description: 'Your physical ID card has been printed and is ready for collection at the Issuance desk. Please present yourself with a valid identification.'
        };
      case 'ISSUED':
        return {
          percentage: 100,
          color: 'bg-[#16a34a]',
          textColor: 'text-[#16a34a]',
          bgLight: 'bg-emerald-50/50',
          borderColor: 'border-emerald-100',
          label: 'Level 5 — Issued & Complete ✓',
          description: 'Congratulations! Your physical ID card has been officially issued and the process is complete. Welcome aboard Kyambogo University.'
        };
      default:
        return {
          percentage: 0,
          color: 'bg-gray-400',
          textColor: 'text-gray-500',
          bgLight: 'bg-gray-50/50',
          borderColor: 'border-gray-100',
          label: 'Unknown Status',
          description: 'System could not verify the application status.'
        };
    }
  };

  const isRejected = ['REJECTED_MEDIA', 'REJECTED_HR', 'REJECTED'].includes(application.status);
  const progress = getProgressInfo(application.status);

  // Dynamic Levels Journey config
  let progressLinePercent = '0%';
  if (application.status === 'MEDIA_APPROVED') progressLinePercent = '25%';
  else if (['APPROVED', 'PRINTED', 'ISSUED'].includes(application.status)) {
    if (application.status === 'APPROVED') progressLinePercent = '50%';
    else if (application.status === 'PRINTED') progressLinePercent = '75%';
    else if (application.status === 'ISSUED') progressLinePercent = '100%';
  }

  const levels = [
    { num: 1, label: 'Submitted',     sublabel: 'DICTS Queue',  color: '#1e5fb8', bg: '#dbeafe',  active: true,  current: application.status === 'SUBMITTED' || application.status === 'PENDING' },
    { num: 2, label: 'Media Check',   sublabel: 'DICTS Review', color: '#d97706', bg: '#fef3c7',  active: ['MEDIA_APPROVED', 'APPROVED', 'PRINTED', 'ISSUED'].includes(application.status), current: application.status === 'MEDIA_APPROVED' },
    { num: 3, label: 'HR Approval',   sublabel: 'HR Registry',  color: '#4f46e5', bg: '#ede9fe',  active: ['APPROVED', 'PRINTED', 'ISSUED'].includes(application.status), current: application.status === 'APPROVED' },
    { num: 4, label: 'Printing',      sublabel: 'Print Queue',  color: '#7c3aed', bg: '#f3e8ff',  active: ['PRINTED', 'ISSUED'].includes(application.status), current: application.status === 'PRINTED' },
    { num: 5, label: 'Issued',        sublabel: 'Collection',   color: '#16a34a', bg: '#dcfce7',  active: application.status === 'ISSUED', current: application.status === 'ISSUED' },
  ];

  // Serialize the Prisma application fields to make it fully Next.js serializable for Client Component
  const serializedApp = {
    ...application,
    appointmentDate: application.appointmentDate instanceof Date ? application.appointmentDate.toISOString() : String(application.appointmentDate),
    expiryDate: application.expiryDate ? (application.expiryDate instanceof Date ? application.expiryDate.toISOString() : String(application.expiryDate)) : null,
    createdAt: application.createdAt instanceof Date ? application.createdAt.toISOString() : String(application.createdAt),
    updatedAt: application.updatedAt instanceof Date ? application.updatedAt.toISOString() : String(application.updatedAt),
  };

  return (
    <main className="landing-container bg-gray-50 min-h-screen py-16 px-4">
      <div className="max-w-3xl w-full mx-auto z-10">
        
        {/* Header branding */}
        <div className="flex flex-col items-center text-center mb-8 animate-fade-in">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#f9b012] via-[#8dc63f] to-[#1e5fb8] rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <img 
              src="/logo.jpg" 
              alt="Kyambogo University Logo" 
              className="relative w-16 h-16 object-contain p-1 bg-white rounded-2xl shadow-md border border-gray-100" 
            />
          </div>
          <Link href="/" className="badge bg-[var(--secondary-light)] text-[var(--secondary-dark)] border border-[var(--secondary-color)]/20 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest transition-transform hover:scale-105 mb-2">
            Kyambogo University Portal
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-[var(--primary-dark)]">
            Application Tracker
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1 uppercase tracking-wider">
            Application ID: {application.id.toUpperCase()}
          </p>
        </div>

        {/* Status Tracker Card */}
        <div className="premium-card w-full mb-8 animate-fade-in flex flex-col gap-8" style={{ padding: '40px' }}>
          
          {!isRejected ? (
            <div className="w-full space-y-6">
              {/* Dynamic Status Header Callout */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${progress.bgLight} ${progress.borderColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${progress.textColor}`}>
                    {['SUBMITTED', 'PENDING', 'MEDIA_APPROVED'].includes(application.status) ? (
                      <Clock size={24} className="animate-pulse" />
                    ) : (
                      <CheckCircle size={24} className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${progress.textColor}`}>
                      {progress.label}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      {progress.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-baseline gap-1 md:self-center">
                  <span className={`text-2xl font-black ${progress.textColor}`}>
                    {progress.percentage}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Complete</span>
                </div>
              </div>

              {/* Approval Level Journey Timeline */}
              <div className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl p-6 space-y-5">
                <div className="text-left">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Approval Levels Journey</p>
                  <p className="text-[11px] text-gray-500">Track the real-time processing milestones of your official staff credential.</p>
                </div>

                {/* Timeline Slider */}
                <div className="relative pt-2">
                  {/* Background connecting bar */}
                  <div className="absolute top-7 left-0 right-0 h-1 bg-gray-200 mx-8 rounded-full" />
                  {/* Filled progress bar */}
                  <div 
                    className="absolute top-7 left-0 h-1 bg-[var(--primary-color)] rounded-full mx-8 transition-all duration-1000" 
                    style={{ width: progressLinePercent }} 
                  />

                  <div className="grid grid-cols-5 gap-2 relative">
                    {levels.map((lvl) => (
                      <div key={lvl.num} className="flex flex-col items-center gap-2 relative z-10">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-md border-2 transition-all ${
                            lvl.active
                              ? 'border-transparent text-white'
                              : 'bg-white border-gray-200 text-gray-300'
                          } ${lvl.current ? 'ring-4 ring-offset-2 animate-pulse' : ''}`}
                          style={{
                            background: lvl.active ? lvl.color : undefined,
                            ['--tw-ring-color' as any]: lvl.bg,
                          }}
                        >
                          {lvl.active && lvl.num < (progress.percentage / 20 + 1) && !lvl.current ? '✓' : lvl.num}
                        </div>
                        <div className="text-center">
                          <span
                            className="text-[8px] font-black uppercase block leading-tight"
                            style={{ color: lvl.active ? lvl.color : '#d1d5db' }}
                          >
                            L{lvl.num}
                          </span>
                          <span className={`text-[8px] font-bold block leading-tight ${lvl.active ? 'text-gray-700' : 'text-gray-300'}`}>
                            {lvl.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Rejection Display */
            <div className="flex flex-col items-center p-8 bg-red-50 rounded-2xl border border-red-100 max-w-xl w-full mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shadow-inner mb-4">
                <XCircle size={36} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-red-900 mb-2">Application Flagged for Correction</h2>
              <p className="text-red-700 text-xs font-black uppercase tracking-wider mb-3">
                Review Stage: {application.status === 'REJECTED_MEDIA' ? 'DICTS Media Check' : 'Human Resources Verification'}
              </p>
              <div className="bg-white border border-red-100 rounded-xl p-4 w-full text-left mb-6 shadow-sm">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">Feedback Remarks</span>
                <p className="text-gray-600 text-sm leading-relaxed font-semibold italic">
                  "{application.dictsComments || application.hrComments || 'Please verify that your uploaded photo and signature meet all standard biometric requirements and your appointment letter is clean and legible.'}"
                </p>
              </div>
              <Link 
                href="/apply" 
                className="btn-primary w-full max-w-xs flex items-center justify-center gap-2"
                style={{ backgroundImage: 'linear-gradient(to right, #ef4444, #dc2626)', backgroundColor: '#ef4444', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}
              >
                Re-Apply and Submit Corrections <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {/* Virtual ID section for approved status */}
          {!isRejected && ['APPROVED', 'PRINTED', 'ISSUED'].includes(application.status) && (
            <div className="w-full border-t border-gray-100 pt-8 flex flex-col items-center">
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider mb-8 flex items-center gap-2 shadow-sm">
                <CheckCircle size={16} className="text-emerald-600 animate-pulse" /> Approved & Virtual ID Unlocked
              </div>
              
              {/* Render dynamic, settings-configured Virtual ID Card */}
              <div className="w-full py-2 flex justify-center">
                <VirtualIdCard 
                  application={serializedApp} 
                  settings={settings} 
                  showBothSides={true} 
                  className="max-w-[580px] w-full"
                />
              </div>
              
              <div className="mt-8 text-center max-w-md w-full">
                {application.status === 'APPROVED' && (
                  <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 border border-gray-200 p-3 rounded-xl">
                    Your physical ID card is currently in the printing queue. You can use this Virtual ID in the meantime. We will notify you when it's printed.
                  </p>
                )}
                {application.status === 'PRINTED' && (
                  <div className="space-y-2">
                    <p className="text-xs text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 py-2.5 px-4 rounded-xl shadow-sm">
                      Physical card is ready! Please proceed to the ID Issuance Desk to collect it.
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Bring your national ID or appointment letter to verify collection.
                    </p>
                  </div>
                )}
                {application.status === 'ISSUED' && (
                  <p className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl shadow-sm">
                    This card has been physically issued. Thank you!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Unified Action Buttons Centered & Responsive */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-md mx-auto border-t border-gray-100 pt-6">
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 bg-white border border-slate-350 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 shrink-0 cursor-pointer shadow-sm text-center"
            >
              <Home size={14} /> Back to Home
            </Link>
            <Link 
              href="/status"
              className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 bg-white border border-slate-350 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 shrink-0 cursor-pointer shadow-sm text-center"
            >
              <Search size={14} /> Search Other ID
            </Link>
          </div>

        </div>

      </div>
      
      {/* Decorative background elements */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2" style={{ top: 'auto', bottom: '-200px' }}></div>
    </main>
  );
}
