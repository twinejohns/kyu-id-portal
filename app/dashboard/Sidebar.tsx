"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  LogOut,
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Settings,
  ScrollText,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  session: { id: string; name?: string; role: string; email?: string };
}

const ADMIN_SUB_LINKS = [
  { href: '/dashboard/admin',              label: 'Overview',        icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/admin/users',        label: 'Users & Roles',   icon: Users,           exact: false },
  { href: '/dashboard/admin/departments',  label: 'Departments',     icon: Building2,       exact: false },
  { href: '/dashboard/admin/applications', label: 'Applications',    icon: FileText,        exact: false },
  { href: '/dashboard/admin/settings',     label: 'System Settings', icon: Settings,        exact: false },
  { href: '/dashboard/admin/audit',        label: 'Audit Log',       icon: ScrollText,      exact: false },
];

export default function OperatorSidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith('/dashboard/admin'));

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const isCollapsed = state === 'collapsed';

  // Check which divisions this user is allowed to see
  const showMedia = ['SUPERADMIN', 'MEDIAOFFICER'].includes(session.role);
  const showHr = ['SUPERADMIN', 'HR'].includes(session.role);
  const showPrinter = ['SUPERADMIN', 'PRINTER'].includes(session.role);
  const showIssuance = ['SUPERADMIN', 'ISSUANCE'].includes(session.role);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/5"
      style={{ background: 'linear-gradient(180deg, #0f3c78 0%, #081d3d 100%)' }}
    >
      {/* ── Brand Header ─────────────────────────────────────── */}
      <SidebarHeader
        className="h-auto flex flex-col border-b border-white/5 shrink-0 p-6"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="KyU Logo"
            className="w-10 h-10 object-contain p-0.5 bg-white rounded-lg shadow-md shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col transition-all duration-200 animate-fade-in overflow-hidden">
              <span className="text-base font-extrabold tracking-tight text-white leading-tight whitespace-nowrap">
                KyU ID Portal
              </span>
              <span className="text-[10px] font-bold mt-0.5 tracking-wider uppercase whitespace-nowrap"
                style={{ color: '#f9b012' }}>
                Staff Registry
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#8dc63f' }} />
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
              {session.role} MODE
            </span>
          </div>
        )}
      </SidebarHeader>

      {/* ── Sidebar Content ────────────────────────────────── */}
      <SidebarContent className="py-4 px-3 space-y-0.5 overflow-y-auto" style={{ background: 'transparent' }}>
        
        {/* Core Workspace Section */}
        <SidebarGroup className="p-0">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[9px] font-extrabold uppercase tracking-widest mb-2 px-1 text-slate-400">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              
              {/* Dashboard Home */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard', true)}
                  tooltip="Dashboard Home"
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                    isActive('/dashboard', true) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                  )}
                >
                  <Link href="/dashboard" className="flex items-center w-full gap-3.5">
                    <LayoutDashboard size={20} className={cn('shrink-0', isActive('/dashboard', true) ? 'text-[#f9b012]' : 'text-gray-400')} />
                    {!isCollapsed && <span className="text-sm font-medium tracking-wide">Dashboard Home</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Applications Progress */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard/applications', false)}
                  tooltip="Applications Progress"
                  className={cn(
                    'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                    isActive('/dashboard/applications', false) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                  )}
                >
                  <Link href="/dashboard/applications" className="flex items-center w-full gap-3.5">
                    <FileText size={20} className={cn('shrink-0', isActive('/dashboard/applications', false) ? 'text-[#f9b012]' : 'text-gray-400')} />
                    {!isCollapsed && <span className="text-sm font-medium tracking-wide">Applications Progress</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Division Operations Section */}
        <SidebarGroup className="p-0">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[9px] font-extrabold uppercase tracking-widest mb-2 px-1 text-slate-400">
              Operations Division
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              
              {/* Media Verification */}
              {showMedia && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard/media', false)}
                    tooltip="Media Verification"
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                      isActive('/dashboard/media', false) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                    )}
                  >
                    <Link href="/dashboard/media" className="flex items-center w-full gap-3.5">
                      <ShieldCheck size={20} className={cn('shrink-0', isActive('/dashboard/media', false) ? 'text-[#f9b012]' : 'text-gray-400')} />
                      {!isCollapsed && <span className="text-sm font-medium tracking-wide">Media Verification</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* HR Verification */}
              {showHr && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard/hr', false)}
                    tooltip="HR Verification"
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                      isActive('/dashboard/hr', false) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                    )}
                  >
                    <Link href="/dashboard/hr" className="flex items-center w-full gap-3.5">
                      <FileText size={20} className={cn('shrink-0', isActive('/dashboard/hr', false) ? 'text-[#f9b012]' : 'text-gray-400')} />
                      {!isCollapsed && <span className="text-sm font-medium tracking-wide">HR Verification</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Print Queue */}
              {showPrinter && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard/printer', false)}
                    tooltip="Print Queue"
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                      isActive('/dashboard/printer', false) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                    )}
                  >
                    <Link href="/dashboard/printer" className="flex items-center w-full gap-3.5">
                      <Printer size={20} className={cn('shrink-0', isActive('/dashboard/printer', false) ? 'text-[#f9b012]' : 'text-gray-400')} />
                      {!isCollapsed && <span className="text-sm font-medium tracking-wide">Print Queue</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* ID Handover */}
              {showIssuance && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard/issuance', false)}
                    tooltip="ID Handover"
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                      isActive('/dashboard/issuance', false) ? 'sidebar-link-active text-white' : 'text-gray-300 hover:text-white',
                    )}
                  >
                    <Link href="/dashboard/issuance" className="flex items-center w-full gap-3.5">
                      <ShieldCheck size={20} className={cn('shrink-0', isActive('/dashboard/issuance', false) ? 'text-[#f9b012]' : 'text-gray-400')} />
                      {!isCollapsed && <span className="text-sm font-medium tracking-wide">ID Handover</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Superadmin Administrative Control Shortcut */}
        {session.role === 'SUPERADMIN' && (
          <>
            <SidebarSeparator className="my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <SidebarGroup className="p-0">
              {!isCollapsed && (
                <button
                  onClick={() => setAdminOpen(v => !v)}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 mb-1 text-gray-405 hover:text-white hover:bg-white/5 text-left"
                >
                  <Zap size={10} className="text-[#f9b012] shrink-0" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest flex-1 text-slate-400">
                    System Control
                  </span>
                  {adminOpen
                    ? <ChevronDown size={12} className="text-gray-500 shrink-0" />
                    : <ChevronRight size={12} className="text-gray-500 shrink-0" />}
                </button>
              )}
              {(adminOpen || isCollapsed) && (
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {ADMIN_SUB_LINKS.map(link => {
                      const active = isActive(link.href, link.exact);
                      const Icon = link.icon;
                      return (
                        <SidebarMenuItem key={link.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={link.label}
                            className={cn(
                              'w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 sidebar-link',
                              active ? 'sidebar-link-active text-white' : 'text-gray-400 hover:text-white',
                            )}
                          >
                            <Link href={link.href} className="flex items-center w-full gap-3.5">
                              <Icon size={18} className={cn('shrink-0', active ? 'text-[#f9b012]' : 'text-gray-500')} />
                              {!isCollapsed && <span className="text-xs font-semibold tracking-wide">{link.label}</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </>
        )}

      </SidebarContent>

      {/* ── Footer ────────────────────────────────────────── */}
      <SidebarFooter
        className="p-4 border-t border-white/5 shrink-0"
        style={{ background: 'transparent' }}
      >
        <div className={cn('flex items-center gap-3', isCollapsed ? 'flex-col' : 'flex-row')}>
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm text-white shadow-md animate-gradient"
            style={{
              background: 'linear-gradient(135deg, #1e5fb8, #0f3c78)',
              border: '1.5px solid rgba(249,176,18,0.3)'
            }}
          >
            {session.name ? session.name.substring(0, 2).toUpperCase() : 'OP'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <div className="text-xs font-extrabold text-white truncate leading-tight">
                {session.name || 'Staff Operator'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1"
                style={{ color: '#f9b012' }}>
                <ShieldCheck size={9} />
                {session.role}
              </div>
            </div>
          )}
          <Link
            href="/api/auth/logout"
            prefetch={false}
            title="Logout"
            className="flex items-center justify-center w-8 h-8 rounded-xl text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all duration-200 shrink-0"
          >
            <LogOut size={16} />
          </Link>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
