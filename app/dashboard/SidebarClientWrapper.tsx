"use client";

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import GlobalChatSidebar from '@/components/GlobalChatSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarClientWrapperProps {
  session: { id: string; name?: string; role: string };
  children: React.ReactNode;
}

const DIVISION_META: Record<string, { division: string; title: string; indicatorBg: string }> = {
  HR: { division: "HR & Registry Division", title: "HR Verification Ledger", indicatorBg: "bg-[#1e5fb8]" },
  MEDIAOFFICER: { division: "DICTS Media & Biometrics Division", title: "Media Verification Centre", indicatorBg: "bg-[#cbd5e1]" },
  PRINTER: { division: "DICTS Infrastructure Division", title: "Card Production Terminal", indicatorBg: "bg-[#f9b012]" },
  ISSUANCE: { division: "DICTS Security Division", title: "Handover & Issuance Centre", indicatorBg: "bg-[#8dc63f]" },
};

export default function SidebarClientWrapper({ session, children }: SidebarClientWrapperProps) {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/dashboard/admin');

  if (isAdminPath) {
    return <>{children}</>;
  }

  const meta = DIVISION_META[session.role] || { 
    division: "DICTS Infrastructure Division", 
    title: "Staff Operator Centre", 
    indicatorBg: "bg-[#1e5fb8]" 
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 flex w-full font-sans">
        
        {/* Dynamic Professional Collapsible Sidebar */}
        <Sidebar session={session} />

        {/* Main Workspace Body using SidebarInset */}
        <SidebarInset className="flex-1 flex flex-col min-h-screen dashboard-bg-theme overflow-hidden relative">
          
          {/* Decorative Floating Background Blobs matching Landing/Login pages */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[0]">
            <div className="absolute top-[-250px] right-[-150px] w-[650px] h-[650px] rounded-full bg-[#bfdbfe] dark:bg-[#1e5fb8]/10 blur-[130px] opacity-45" />
            <div className="absolute bottom-[-150px] left-[-200px] w-[550px] h-[550px] rounded-full bg-[rgba(249,176,18,0.18)] dark:bg-[rgba(249,176,18,0.05)] blur-[130px] opacity-45" />
          </div>
          
          {/* Header Ribbon */}
          <header className="bg-white/80 dark:bg-[#1e293b]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-[50] shadow-sm flex items-center justify-between px-6 h-16 shrink-0 relative">
            {/* KyU Division-Specific Branding Indicator Strip */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-[3px]", meta.indicatorBg)} />
            
            <div className="flex items-center gap-4 z-10">
              <SidebarTrigger className="text-slate-600 dark:text-slate-300" />
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{meta.division}</span>
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none mt-0.5">{meta.title}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider leading-none">Active Operator</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1 leading-none">{session.name || 'Staff User'}</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-white dark:border-slate-900 shadow-sm" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 w-full overflow-y-auto px-6 py-8 animate-fade-in z-10">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* System Footer */}
          <footer className="border-t border-slate-200/85 dark:border-slate-800/80 bg-white/80 dark:bg-[#1e293b]/85 backdrop-blur-md py-4 shrink-0 z-10">
            <div className="px-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest gap-2">
              <div>Kyambogo University © {new Date().getFullYear()} · DICTS Infrastructure Division</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Secure Operator Node Online</span>
              </div>
            </div>
          </footer>

        </SidebarInset>

        {/* Global Lounge Chat Drawer */}
        <GlobalChatSidebar session={{ name: session.name || 'Staff User', role: session.role }} />
      </div>
    </SidebarProvider>
  );
}
