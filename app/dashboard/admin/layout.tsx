import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebarClient from './AdminSidebarClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('kyu_session')?.value;
  
  if (!sessionStr) redirect('/login');
  
  const session = JSON.parse(sessionStr);
  if (session.role !== 'SUPERADMIN') redirect('/dashboard');

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 flex w-full font-sans">
        
        {/* Sleek Radix Left Sidebar */}
        <AdminSidebarClient session={session} />

        {/* Main Workspace Body */}
        <SidebarInset className="flex-1 flex flex-col min-h-screen dashboard-bg-theme overflow-hidden relative">
          
          {/* Decorative Floating Background Blobs matching Landing/Login pages */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[0]">
            <div className="absolute top-[-250px] right-[-150px] w-[650px] h-[650px] rounded-full bg-[#bfdbfe] dark:bg-[#1e5fb8]/10 blur-[130px] opacity-45" />
            <div className="absolute bottom-[-150px] left-[-200px] w-[550px] h-[550px] rounded-full bg-[rgba(249,176,18,0.18)] dark:bg-[rgba(249,176,18,0.05)] blur-[130px] opacity-45" />
          </div>
          
          {/* Header Ribbon */}
          <header className="bg-white/80 dark:bg-[#1e293b]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-[50] shadow-sm flex items-center justify-between px-6 h-16 shrink-0 relative">
            {/* KyU Full Spectrum Branding Indicator Strip */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(to right, #1e5fb8, #cbd5e1, #8dc63f, #f9b012)' }} />
            
            <div className="flex items-center gap-4 z-10">
              <SidebarTrigger className="text-slate-600 dark:text-slate-300" />
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">DICTS Infrastructure Division</span>
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none mt-0.5">Super Admin Control Centre</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-none">Active Operator</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1 leading-none">{session.name || 'Super Admin'}</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-white dark:border-slate-900 shadow-sm" />
            </div>
          </header>

          {/* Main Canvas Area */}
          <main className="flex-1 w-full overflow-y-auto px-6 py-8 animate-fade-in z-10">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* System Footer */}
          <footer className="border-t border-slate-200/85 dark:border-slate-800/80 bg-white/80 dark:bg-[#1e293b]/85 backdrop-blur-md py-4 shrink-0 z-10">
            <div className="px-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest gap-2">
              <div>Kyambogo University © {new Date().getFullYear()} · DICTS Infrastructure Division</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Secure Enterprise Node Online</span>
              </div>
            </div>
          </footer>

        </SidebarInset>

      </div>
    </SidebarProvider>
  );
}

