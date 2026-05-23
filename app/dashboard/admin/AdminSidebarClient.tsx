"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  ScrollText,
  LogOut,
  ShieldCheck,
  Printer,
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

const ADMIN_LINKS = [
  { href: '/dashboard/admin',              label: 'Overview',        icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/admin/users',        label: 'Users & Roles',   icon: Users,           exact: false },
  { href: '/dashboard/admin/departments',  label: 'Departments',     icon: Building2,       exact: false },
  { href: '/dashboard/admin/applications', label: 'Applications',    icon: FileText,        exact: false },
  { href: '/dashboard/admin/settings',     label: 'System Settings', icon: Settings,        exact: false },
  { href: '/dashboard/admin/audit',        label: 'Audit Log',       icon: ScrollText,      exact: false },
];

const OPERATIONAL_LINKS = [
  { href: '/dashboard/media',    label: 'Media Verification', icon: ShieldCheck, exact: false },
  { href: '/dashboard/hr',       label: 'HR Verification',    icon: FileText,    exact: false },
  { href: '/dashboard/printer',  label: 'Print Queue',        icon: Printer,     exact: false },
  { href: '/dashboard/issuance', label: 'ID Handover',        icon: ShieldCheck, exact: false },
];

interface AdminSidebarClientProps {
  session: {
    name?: string;
    role?: string;
    email?: string;
  };
}

export default function AdminSidebarClient({ session }: AdminSidebarClientProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const [opsOpen, setOpsOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const isCollapsed = state === 'collapsed';

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
                Admin Control Centre
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#8dc63f' }} />
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
              {session.role || 'SUPERADMIN'} MODE
            </span>
          </div>
        )}
      </SidebarHeader>

      {/* ── Sidebar Content ────────────────────────────────── */}
      <SidebarContent className="py-4 px-3 space-y-0.5 overflow-y-auto" style={{ background: 'transparent' }}>

        {/* Administration Section */}
        <SidebarGroup className="p-0">
          {!isCollapsed && (
            <div className="w-full bg-black/90 border-t-2 border-[#1e5fb8] py-2 px-3 rounded-lg flex items-center shadow-sm mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#f9b012] flex items-center gap-1.5">
                <Zap size={9} className="inline mr-1" />
                Administration
              </span>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {ADMIN_LINKS.map(link => {
                const active = isActive(link.href, link.exact);
                const Icon = link.icon;
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={link.label}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 sidebar-link',
                        active
                          ? 'sidebar-link-active text-white'
                          : 'text-gray-300 hover:text-white',
                      )}
                    >
                      <Link href={link.href} className="flex items-center w-full gap-3.5">
                        <Icon
                          size={20}
                          className={cn('shrink-0 transition-all duration-200', active ? 'text-[#f9b012]' : 'text-gray-400')}
                        />
                        {!isCollapsed && (
                          <span className="text-sm font-medium tracking-wide">{link.label}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <SidebarSeparator className="my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Operator Portal Section */}
        <SidebarGroup className="p-0">
          {!isCollapsed && (
            <button
              onClick={() => setOpsOpen(v => !v)}
              className="w-full bg-black/90 border-t-2 border-[#1e5fb8] py-2 px-3 rounded-lg flex items-center justify-between shadow-sm hover:bg-black transition-all duration-200 mb-2"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-white/90 flex items-center gap-1.5">
                <ShieldCheck size={9} className="inline text-blue-400 mr-1" />
                Operator Portal
              </span>
              {opsOpen
                ? <ChevronDown size={10} className="text-gray-400 shrink-0" />
                : <ChevronRight size={10} className="text-gray-400 shrink-0" />}
            </button>
          )}
          {(opsOpen || isCollapsed) && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {OPERATIONAL_LINKS.map(link => {
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
                          active
                            ? 'sidebar-link-active text-white'
                            : 'text-gray-400 hover:text-white',
                        )}
                      >
                        <Link href={link.href} className="flex items-center w-full gap-3.5">
                          <Icon
                            size={18}
                            className={cn('shrink-0', active ? 'text-[#f9b012]' : 'text-gray-500')}
                          />
                          {!isCollapsed && (
                            <span className="text-sm font-medium tracking-wide">{link.label}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ────────────────────────────────────────── */}
      <SidebarFooter
        className="p-4 border-t border-white/5 shrink-0"
        style={{ background: 'transparent' }}
      >
        <div className={cn('flex items-center gap-3', isCollapsed ? 'flex-col' : 'flex-row')}>
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #1e5fb8, #0f3c78)', border: '1.5px solid rgba(249,176,18,0.3)' }}>
            {session.name ? session.name.substring(0, 2).toUpperCase() : 'SA'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <div className="text-xs font-extrabold text-white truncate leading-tight">
                {session.name || 'Super Admin'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1"
                style={{ color: '#f9b012' }}>
                <ShieldCheck size={9} />
                {session.role || 'SUPERADMIN'}
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
