import Link from 'next/link';
import { 
  ArrowRight, ShieldCheck, Camera, CreditCard, 
  Lock, Sparkles, Cpu, Building2, HelpCircle 
} from 'lucide-react';

export default function Home() {
  return (
    <main className="landing-container min-h-screen py-16 px-4 dashboard-bg-theme relative overflow-hidden flex items-center justify-center">
      
      {/* Decorative floating blur blobs for premium background depth */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2" style={{ top: 'auto', bottom: '-250px', left: '-150px' }}></div>
      
      <div className="landing-content max-w-4xl w-full mx-auto relative z-10 flex flex-col items-center gap-10">
        
        {/* Main Glassmorphic Hero Card */}
        <div className="glass-card w-full shadow-2xl p-8 md:p-14 relative overflow-hidden border border-white/60 dark:border-slate-800/80 text-center flex flex-col items-center">
          
          {/* Spectrol gold/blue brand indicator strip at top */}
          <div className="absolute top-0 left-0 right-0 h-[4.5px]" style={{ background: 'linear-gradient(to right, #1e5fb8, #cbd5e1, #8dc63f, #f9b012)' }} />
          
          {/* Kyambogo Crest with animated rotating background glow ring */}
          <div className="relative mb-6 group cursor-pointer">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#1e5fb8] via-[#8dc63f] to-[#f9b012] rounded-3xl blur-md opacity-25 group-hover:opacity-45 transition duration-1000 group-hover:duration-200 animate-spin-slow"></div>
            <img 
              src="/logo.jpg" 
              alt="Kyambogo University Crest" 
              className="relative w-22 h-22 md:w-26 md:h-26 object-contain p-2 bg-white rounded-2xl shadow-xl border border-slate-100/80" 
            />
          </div>

          {/* Premium Tag Badge */}
          <div className="badge inline-flex items-center gap-1.5 bg-[#f9b012]/12 text-[#d49205] border border-[#f9b012]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-5">
            <Sparkles size={11} className="stroke-[3]" /> Kyambogo University Registry
          </div>

          {/* Heading with brand gradient color */}
          <h1 className="text-4xl md:text-5.5xl font-black tracking-tight mb-4 leading-tight text-slate-900 dark:text-white max-w-xl">
            Staff Identity Card <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1e5fb8] via-[#1051a8] to-[#0f3c78] dark:from-blue-400 dark:to-blue-600 block sm:inline">Registry Portal</span>
          </h1>

          {/* Captivating description */}
          <p className="text-slate-600 dark:text-slate-350 max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-10 font-medium">
            Streamline your credential issuance. Securely log your details, scanned appointment documents, and biometric signatures for rapid DICTS & HR auditing. 
            <span className="block mt-2 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wide">
              Already requested? Enter below to monitor progress in real-time.
            </span>
          </p>
          
          {/* Main Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-4.5 justify-center w-full max-w-md mx-auto mb-4">
            
            {/* Primary Request Trigger */}
            <Link 
              href="/apply" 
              className="btn-primary py-4 px-8 text-sm md:text-base font-black uppercase tracking-wider text-white shadow-[0_5px_15px_rgba(30,95,184,0.3)] hover:shadow-[0_8px_25px_rgba(30,95,184,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 flex items-center justify-center gap-2"
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8'
              }}
            >
              Start ID Application <ArrowRight size={16} className="stroke-[3]" />
            </Link>

            {/* Secondary Tracker Trigger */}
            <Link 
              href="/status" 
              className="btn-secondary py-4 px-8 text-sm md:text-base font-black uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 flex items-center justify-center gap-2 shadow-sm"
            >
              Check Request Status
            </Link>

          </div>

        </div>

        {/* 3-Column Premium Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          
          {/* Feature 1 */}
          <div className="glass-card p-6 border border-white/60 dark:border-slate-800/80 bg-white/45 flex flex-col justify-between items-start text-left min-h-48 group">
            <div className="w-11 h-11 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-center text-[#1e5fb8] group-hover:scale-110 transition-transform duration-300 shadow-sm border border-blue-100/30">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                Secure Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Provide scanned official appointment documentation for direct HR matching and anti-forgery audit validation.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-6 border border-white/60 dark:border-slate-800/80 bg-white/45 flex flex-col justify-between items-start text-left min-h-48 group">
            <div className="w-11 h-11 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center text-[#059669] group-hover:scale-110 transition-transform duration-300 shadow-sm border border-emerald-100/30">
              <Camera size={22} className="stroke-[2.5]" />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                AI Photo Auditing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Real-time automated biometric quality validations check background neutrality and pose compliance instantly.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-6 border border-white/60 dark:border-slate-800/80 bg-white/45 flex flex-col justify-between items-start text-left min-h-48 group">
            <div className="w-11 h-11 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-purple-100/30">
              <CreditCard size={22} className="stroke-[2.5]" />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                Virtual ID Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Retrieve a premium landscape Virtual ID Card immediately upon HR clearance while the physical card is printed.
              </p>
            </div>
          </div>

        </div>

        {/* Auth / Admin Portal Entry Footer */}
        <div className="flex items-center justify-center gap-4 text-[10.5px] font-black uppercase tracking-widest text-slate-400/80 dark:text-slate-500/80 mt-2 hover:text-[#1e5fb8] transition-colors">
          <Link href="/login" className="flex items-center gap-1.5 group select-none">
            <Lock size={10.5} className="group-hover:animate-pulse text-slate-400/80 group-hover:text-[#1e5fb8] transition-colors" />
            <span>Authorized Operators Access</span>
          </Link>
        </div>

      </div>

    </main>
  );
}
