"use client";

import React, { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VirtualIdCardApplication {
  fullName: string;
  generatedIdNumber: string | null;
  position: { title: string };
  department: { name: string };
  employmentTerm: string;
  appointmentDate: string;
  expiryDate: string | null;
  photoUrl: string;
  signatureUrl: string;
  applicationType: string;
  email?: string;
  phoneNumber?: string | null;
}

export interface VirtualIdCardSettings {
  institutionName?: string;
  secretarySignatureUrl?: string;
  returnAddress?: string;
  templateMode?: string;
  cardHeaderTitle?: string;
  cardSubtitle?: string;
  cardBannerText?: string;
  cardWatermarkText?: string;
  showWatermark?: boolean;
  showBarcode?: boolean;
  showDepartment?: boolean;
  showPosition?: boolean;
}

export interface VirtualIdCardProps {
  application: VirtualIdCardApplication;
  settings?: VirtualIdCardSettings;
  /** If true, render Front/Back tab switcher above the card */
  showBothSides?: boolean;
  initialSide?: 'front' | 'back';
  className?: string;
  /** Attach this ref to the card element for html2canvas capture */
  cardRef?: React.RefObject<HTMLDivElement>;
  noScale?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W = 580;
const CARD_H = 360;

const DEFAULT_RETURN_ADDRESS =
  'Kyambogo University\nICT Registry Office\nP.O. Box 1, Kyambogo\nKampala, Uganda';

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function deriveExpiry(appointmentDate: string): string {
  const d = new Date(appointmentDate);
  d.setFullYear(d.getFullYear() + 5);
  return fmtDate(d.toISOString());
}

// ─── Front Side ───────────────────────────────────────────────────────────────

function FrontSide({
  application,
  settings,
}: {
  application: VirtualIdCardApplication;
  settings?: VirtualIdCardSettings;
}) {
  const idNumber =
    application.generatedIdNumber ||
    'KYU-' + (application.applicationType?.slice(0, 3).toUpperCase() ?? 'STF');

  const expiryLabel = application.expiryDate
    ? fmtDate(application.expiryDate)
    : deriveExpiry(application.appointmentDate);

  const bannerText = settings?.cardBannerText || 'KYAMBOGO UNIVERSITY';
  const subtitleText = settings?.cardSubtitle || 'Knowledge and Skills for Service';
  const headerTitle = settings?.cardHeaderTitle || 'OFFICIAL STAFF IDENTITY CARD';
  const watermarkText = settings?.cardWatermarkText || 'KYAMBOGO UNIVERSITY';

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className="bg-white rounded-[24px] shadow-2xl border border-gray-200 overflow-hidden relative text-left flex flex-col select-none"
    >
      {/* ── Header band ─────────────────────────────────────────────────── */}
      <div
        className="h-[60px] px-5 flex items-center justify-between shrink-0 relative"
        style={{
          background: 'linear-gradient(135deg, #1e5fb8 0%, #0f3c78 100%)',
        }}
      >
        {/* Gold accent bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#f9b012]" />

        {/* Logo + University name */}
        <div className="flex items-center gap-2.5 text-white">
          <img
            src="/logo.jpg"
            alt="KyU Logo"
            className="w-10 h-10 object-contain p-0.5 bg-white rounded-xl shadow-md shrink-0"
          />
          <div>
            <div className="font-black tracking-tight text-[9px] leading-none text-white uppercase">
              {bannerText}
            </div>
            <div className="text-[6px] text-[#f9b012] font-black tracking-widest uppercase mt-0.5">
              {subtitleText}
            </div>
          </div>
        </div>

        {/* Card type label */}
        <div className="text-right">
          <div className="font-black text-white text-[9px] tracking-widest uppercase opacity-95">
            {headerTitle}
          </div>
          <div className="text-[6px] text-white/70 font-bold uppercase tracking-widest mt-0.5">
            DICTS REGISTRY SYSTEM
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: blue + decorative strip */}
        <div
          className="w-[140px] shrink-0 flex flex-col items-center py-4 px-3 relative"
          style={{
            background: 'linear-gradient(160deg, #1e5fb8 0%, #0f3c78 100%)',
          }}
        >
          {/* Diagonal gold strip decoration */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[32px] opacity-90"
            style={{
              background:
                'repeating-linear-gradient(135deg, #f9b012 0px, #f9b012 6px, transparent 6px, transparent 12px)',
            }}
          />

          {/* Photo */}
          <div className="w-[88px] h-[88px] rounded-lg border-[3px] border-white/80 overflow-hidden bg-white/10 shadow-lg shrink-0">
            <img
              src={application.photoUrl}
              alt="Staff Photo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Employment term badge */}
          <div className="mt-2.5 px-2.5 py-0.5 bg-[#f9b012] rounded-full shrink-0">
            <span className="text-[7px] font-black text-[#0f3c78] uppercase tracking-wider">
              {application.employmentTerm || 'PERMANENT'}
            </span>
          </div>

          {/* Type label */}
          <div className="mt-1 text-[6px] text-white/60 font-bold uppercase tracking-widest text-center shrink-0">
            {application.applicationType || 'STAFF'}
          </div>
        </div>

        {/* Right panel: details */}
        <div className="flex-1 flex flex-col justify-between py-4 px-5 bg-white relative overflow-hidden">
          {/* Watermark security overlay */}
          {settings?.showWatermark !== false && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.035] select-none rotate-[-25deg]">
              <span className="font-black text-[22px] tracking-[0.2em] uppercase text-gray-900 whitespace-nowrap">
                {watermarkText}
              </span>
            </div>
          )}

          {/* Name, position, department */}
          <div className="relative z-10">
            <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-tight leading-tight">
              {application.fullName}
            </h2>
            {settings?.showPosition !== false && (
              <p className="text-[#f9b012] font-extrabold text-[9px] uppercase tracking-wider mt-0.5">
                {application.position.title}
              </p>
            )}
            {settings?.showDepartment !== false && (
              <p className="text-gray-500 text-[7.5px] font-bold uppercase tracking-wide leading-tight mt-0.5">
                {application.department.name}
              </p>
            )}
          </div>

          <div className="w-full h-px bg-gray-100 my-1 relative z-10" />

          {/* ID + dates grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] relative z-10">
            {/* Staff ID */}
            <div className="col-span-2">
              <span className="block text-gray-400 text-[7px] font-bold uppercase tracking-wider leading-none mb-0.5">
                Staff ID No.
              </span>
              <span
                className="inline-block font-black text-[#0f3c78] text-[12px] tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(30,95,184,0.08)' }}
              >
                {idNumber}
              </span>
            </div>

            <div>
              <span className="block text-gray-400 text-[7px] font-bold uppercase tracking-wider leading-none">
                Issue Date
              </span>
              <span className="font-extrabold text-gray-700 text-[9px] mt-0.5 block">
                {fmtDate(application.appointmentDate)}
              </span>
            </div>

            <div>
              <span className="block text-gray-400 text-[7px] font-bold uppercase tracking-wider leading-none">
                Valid Until
              </span>
              <span className="font-extrabold text-gray-700 text-[9px] mt-0.5 block">
                {expiryLabel}
              </span>
            </div>
          </div>

          {/* Signature + footer note */}
          <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-100 relative z-10">
            <p className="text-[5.5px] text-gray-300 font-medium leading-tight max-w-[130px]">
              This card is the property of {bannerText || 'the University'}. If found, please return to the ICT Registry.
            </p>
            <div className="flex flex-col items-center">
              <img
                src={application.signatureUrl}
                alt="Signature"
                className="h-6 object-contain mix-blend-multiply opacity-90"
              />
              <div className="w-16 h-px bg-gray-200 mt-0.5" />
              <span className="text-[5.5px] text-gray-400 mt-0.5 uppercase font-black tracking-widest">
                Cardholder Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Back Side ────────────────────────────────────────────────────────────────

function BackSide({
  application,
  settings,
}: {
  application: VirtualIdCardApplication;
  settings?: VirtualIdCardSettings;
}) {
  const idNumber =
    application.generatedIdNumber ||
    'KYU-' + (application.applicationType?.slice(0, 3).toUpperCase() ?? 'STF');

  const returnAddress = settings?.returnAddress || DEFAULT_RETURN_ADDRESS;
  const institutionName = settings?.institutionName || 'Kyambogo University';

  const bannerText = settings?.cardBannerText || 'KYAMBOGO UNIVERSITY';
  const subtitleText = settings?.cardSubtitle || 'Knowledge and Skills for Service';
  const headerTitle = settings?.cardHeaderTitle || 'OFFICIAL STAFF IDENTITY CARD';
  const watermarkText = settings?.cardWatermarkText || 'KYAMBOGO UNIVERSITY';

  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className="bg-white rounded-[24px] shadow-2xl border border-gray-200 overflow-hidden relative text-left flex flex-col select-none"
    >
      {/* ── Header band ─────────────────────────────────────────────────── */}
      <div
        className="h-[60px] px-5 flex items-center justify-between shrink-0 relative"
        style={{
          background: 'linear-gradient(135deg, #1e5fb8 0%, #0f3c78 100%)',
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#f9b012]" />
        <div className="flex items-center gap-2.5 text-white">
          <img
            src="/logo.jpg"
            alt="KyU Logo"
            className="w-10 h-10 object-contain p-0.5 bg-white rounded-xl shadow-md shrink-0"
          />
          <div>
            <div className="font-black tracking-tight text-[9px] leading-none text-white uppercase">
              {bannerText}
            </div>
            <div className="text-[6px] text-[#f9b012] font-black tracking-widest uppercase mt-0.5">
              {subtitleText}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-white text-[9px] tracking-widest uppercase opacity-95">
            {headerTitle}
          </div>
          <div className="text-[6px] text-white/70 font-bold uppercase tracking-widest mt-0.5">
            — REVERSE SIDE —
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: authorized by / secretary signature */}
        <div
          className="w-[140px] shrink-0 flex flex-col items-center justify-between py-4 px-3 relative"
          style={{
            background: 'linear-gradient(160deg, #1e5fb8 0%, #0f3c78 100%)',
          }}
        >
          {/* Diagonal gold strip decoration */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[32px] opacity-90"
            style={{
              background:
                'repeating-linear-gradient(135deg, #f9b012 0px, #f9b012 6px, transparent 6px, transparent 12px)',
            }}
          />

          {/* University crest placeholder / motto */}
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center bg-white/10">
              <img
                src="/logo.jpg"
                alt="KyU Crest"
                className="w-10 h-10 object-contain opacity-80"
              />
            </div>
            <div className="text-[5.5px] text-[#f9b012]/80 font-black uppercase tracking-widest text-center leading-tight">
              {institutionName}
            </div>
          </div>

          {/* Secretary signature */}
          <div className="flex flex-col items-center w-full relative z-10">
            <div className="text-[5.5px] text-white/50 font-bold uppercase tracking-widest mb-1">
              Authorized by
            </div>
            {settings?.secretarySignatureUrl ? (
              <img
                src={settings.secretarySignatureUrl}
                alt="Secretary Signature"
                className="h-7 object-contain mix-blend-luminosity opacity-90 bg-transparent"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            ) : (
              <div className="w-24 h-6 border-b border-white/40" />
            )}
            <div className="w-16 h-px bg-white/30 mt-0.5" />
            <span className="text-[5.5px] text-white/60 mt-0.5 uppercase font-black tracking-widest text-center">
              University Secretary
            </span>
          </div>
        </div>

        {/* Right panel: address + QR + footer */}
        <div className="flex-1 flex flex-col justify-between py-4 px-5 bg-white relative overflow-hidden">
          {/* Watermark security overlay */}
          {settings?.showWatermark !== false && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.035] select-none rotate-[-25deg]">
              <span className="font-black text-[22px] tracking-[0.2em] uppercase text-gray-900 whitespace-nowrap">
                {watermarkText}
              </span>
            </div>
          )}

          {/* Return address */}
          <div className="relative z-10">
            <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">
              If found, please return to:
            </div>
            <div className="text-[9px] text-gray-700 font-bold leading-relaxed whitespace-pre-line">
              {returnAddress}
            </div>
          </div>

          {/* QR code placeholder */}
          {settings?.showBarcode !== false && (
            <div className="flex items-center gap-3 mt-2 relative z-10">
              <div
                className="w-[64px] h-[64px] shrink-0 border-[2px] border-dashed border-[#1e5fb8]/40 rounded-lg flex flex-col items-center justify-center p-1"
                style={{ background: 'rgba(30,95,184,0.04)' }}
              >
                {/* Simple visual QR-like grid decoration */}
                <div className="grid grid-cols-5 gap-[1px] w-[42px] h-[42px]">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[1px]"
                      style={{
                        background:
                          [0,1,5,6,7,10,14,18,19,20,23,24,12,8,16,4,9,15].includes(i)
                            ? '#1e5fb8'
                            : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[7px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                  Scan to verify
                </div>
                <div
                  className="text-[8px] font-black tracking-widest"
                  style={{ color: '#0f3c78' }}
                >
                  {idNumber}
                </div>
                <div className="text-[6px] text-gray-400 mt-0.5">
                  www.kyu.ac.ug/verify
                </div>
              </div>
            </div>
          )}

          {/* Footer row */}
          <div className="border-t border-gray-100 pt-2 flex items-end justify-between relative z-10">
            <div>
              <div className="text-[6px] text-gray-400 font-bold uppercase tracking-widest">
                Emergency / Help Desk
              </div>
              <div className="text-[7.5px] text-gray-600 font-bold">
                +256 414 285 001
              </div>
            </div>
            <div className="text-right">
              <div className="text-[6px] text-gray-400 font-bold uppercase tracking-widest">
                Website
              </div>
              <div className="text-[7.5px] text-[#1e5fb8] font-black">
                www.kyu.ac.ug
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Responsive Scale Wrapper ────────────────────────────────────────────────

function ScaleWrapper({
  children,
  cardRef,
}: {
  children: React.ReactNode;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const ratio = Math.min(1, containerWidth / CARD_W);
      setScale(ratio);
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const scaledHeight = Math.round(CARD_H * scale);

  return (
    /* outer div: fills parent width, height collapses to scaled card height */
    <div ref={containerRef} className="w-full overflow-hidden" style={{ height: scaledHeight }}>
      <div
        ref={cardRef as React.RefObject<HTMLDivElement>}
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function VirtualIdCard({
  application,
  settings,
  showBothSides = false,
  initialSide = 'front',
  className = '',
  cardRef,
  noScale = false,
}: VirtualIdCardProps) {
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>(initialSide);

  const card =
    currentSide === 'front' ? (
      <FrontSide application={application} settings={settings} />
    ) : (
      <BackSide application={application} settings={settings} />
    );

  if (noScale) {
    return (
      <div ref={cardRef} className="w-full overflow-hidden" style={{ height: '360px' }}>
        <div style={{ width: '580px', height: '360px', transform: 'scale(1)', transformOrigin: 'left top' }}>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 w-full ${className}`}>
      {/* Tab switcher */}
      {showBothSides && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          {(['front', 'back'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setCurrentSide(side)}
              className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 capitalize ${
                currentSide === side
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
              style={
                currentSide === side
                  ? {
                      backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                      backgroundColor: '#1e5fb8',
                    }
                  : {}
              }
            >
              {side === 'front' ? '🪪 Front' : '↩ Back'}
            </button>
          ))}
        </div>
      )}

      {/* Card with responsive scaling */}
      <ScaleWrapper cardRef={cardRef}>{card}</ScaleWrapper>
    </div>
  );
}
