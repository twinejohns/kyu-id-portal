import { PrismaClient } from '@prisma/client';
import { 
  Building2, 
  FileText, 
  Activity, 
  Award, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  ArrowUp, 
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const prisma = new PrismaClient();

// High-contrast custom colors for status indicators matching Wowdash tags
const STATUS_COLORS: Record<string, { label: string; classes: string }> = {
  SUBMITTED: { 
    label: 'Submitted', 
    classes: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' 
  },
  MEDIA_APPROVED: { 
    label: 'Media Approved', 
    classes: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' 
  },
  APPROVED: { 
    label: 'HR Approved', 
    classes: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' 
  },
  PRINTED: { 
    label: 'Printed', 
    classes: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' 
  },
  ISSUED: { 
    label: 'Issued', 
    classes: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
  },
  REJECTED_MEDIA: { 
    label: 'Rejected (Media)', 
    classes: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' 
  },
  REJECTED_HR: { 
    label: 'Rejected (HR)', 
    classes: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' 
  },
};

export default async function AdminOverviewPage() {
  const [users, departments, applications] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.department.findMany({ include: { positions: true } }),
    prisma.staffApplication.findMany({
      include: { department: true, position: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const stats = {
    users:     users.length,
    depts:     departments.length,
    positions: departments.reduce((a, d) => a + d.positions.length, 0),
    total:     applications.length,
    submitted:     applications.filter(a => a.status === 'SUBMITTED').length,
    mediaApproved: applications.filter(a => a.status === 'MEDIA_APPROVED').length,
    approved:      applications.filter(a => a.status === 'APPROVED').length,
    printed:       applications.filter(a => a.status === 'PRINTED').length,
    issued:        applications.filter(a => a.status === 'ISSUED').length,
    rejected:      applications.filter(a => a.status.startsWith('REJECTED')).length,
  };

  const recent = applications.slice(0, 8);

  const statsCards = [
    {
      title: "Departments",
      value: stats.depts,
      icon: Building2,
      iconBg: "bg-blue-600 dark:bg-blue-500",
      gradientClass: "from-blue-600/10 to-white dark:to-slate-800/40",
      trend: "+2 this week",
      trendColor: "text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20",
      trendIcon: ArrowUp,
      description: "Active departments",
      href: "/dashboard/admin/departments",
    },
    {
      title: "Active Positions",
      value: stats.positions,
      icon: Award,
      iconBg: "bg-amber-500 dark:bg-amber-400",
      gradientClass: "from-amber-600/10 to-white dark:to-slate-800/40",
      trend: "Live catalog",
      trendColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20",
      trendIcon: Award,
      description: "Position registry",
      href: "/dashboard/admin/departments",
    },
    {
      title: "Total Applications",
      value: stats.total,
      icon: FileText,
      iconBg: "bg-indigo-600 dark:bg-indigo-500",
      gradientClass: "from-indigo-600/10 to-white dark:to-slate-800/40",
      trend: "+14% progress",
      trendColor: "text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20",
      trendIcon: ArrowUp,
      description: "All card requests",
      href: "/dashboard/admin/applications",
    },
    {
      title: "Printed & Issued",
      value: stats.printed + stats.issued,
      icon: TrendingUp,
      iconBg: "bg-emerald-600 dark:bg-emerald-500",
      gradientClass: "from-emerald-600/10 to-white dark:to-slate-800/40",
      trend: `${stats.total > 0 ? Math.round(((stats.printed + stats.issued) / stats.total) * 100) : 0}% rate`,
      trendColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20",
      trendIcon: ArrowUp,
      description: "Completed ID cycles",
      href: "/dashboard/admin/applications",
    },
    {
      title: "Pending Review",
      value: stats.submitted + stats.mediaApproved + stats.approved,
      icon: Clock,
      iconBg: "bg-rose-500 dark:bg-rose-400",
      gradientClass: "from-rose-600/10 to-white dark:to-slate-800/40",
      trend: "Active pipe",
      trendColor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20",
      trendIcon: Clock,
      description: "Pending validation",
      href: "/dashboard/admin/applications",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">
            Control Centre
          </h1>
          <p className="text-slate-600 mt-1.5 text-sm dark:text-slate-300 font-medium">
            Full system overview — live metrics, pipeline status, and quick navigation.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live System Active</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          const TrendIcon = card.trendIcon;
          return (
            <Link key={idx} href={card.href} className="group">
              <Card className={`bg-gradient-to-r ${card.gradientClass} p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-none cursor-pointer h-full transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden backdrop-blur-sm`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400/90">{card.title}</p>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-primary transition-colors mt-1">
                        {card.value}
                      </h3>
                    </div>
                    <div className={`w-12 h-12 ${card.iconBg} rounded-full flex items-center justify-center shadow-sm shrink-0 border border-white/20`}>
                      <Icon className="text-white w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs mt-5">
                    <span className={`flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-full ${card.trendColor}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      {card.trend}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">{card.description}</span>
                  </div>
                </CardContent>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-primary/30 transition-all duration-300" />
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Side-by-side Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
        {/* Left Side: Pipeline + Recent Activity */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Application Pipeline */}
          <Card className="glass-card border border-white/60 dark:border-slate-800/60 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/40 dark:border-slate-800/30 pb-4">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Activity className="text-primary w-5 h-5 animate-pulse" /> Staff ID Application Pipeline
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Distribution of staff accounts across multiple validation levels
                </CardDescription>
              </div>
              <Link href="/dashboard/admin/applications" className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 hover:underline transition-all">
                Administrative ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'L1 — Submitted',      count: stats.submitted,     colorClass: 'bg-blue-500', textClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-500/10' },
                  { label: 'L2 — Media Approved', count: stats.mediaApproved, colorClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/10' },
                  { label: 'L3 — HR Approved',    count: stats.approved,      colorClass: 'bg-indigo-600', textClass: 'text-indigo-600 dark:text-indigo-400', bgClass: 'bg-indigo-500/10' },
                  { label: 'L4 — Printed',        count: stats.printed,       colorClass: 'bg-purple-600', textClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-500/10' },
                  { label: 'L5 — Issued',         count: stats.issued,        colorClass: 'bg-emerald-600', textClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/10' },
                  { label: 'Rejected / Flagged',  count: stats.rejected,      colorClass: 'bg-rose-500', textClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-500/10' },
                ].map(row => {
                  const pct = stats.total > 0 ? Math.round((row.count / stats.total) * 100) : 0;
                  return (
                    <div key={row.label} className="p-4 rounded-xl border border-white/60 dark:border-slate-800/40 bg-white/25 dark:bg-slate-900/10 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300 hover:shadow-sm group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">{row.label}</span>
                        <Badge variant="outline" className={`font-black text-[11px] border-transparent ${row.bgClass} ${row.textClass}`}>
                          {row.count}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-full h-2 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${row.colorClass}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase">
                          <span>Progress</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Applications Activity */}
          <Card className="glass-card border border-white/60 dark:border-slate-800/60 shadow-none flex flex-col">
            <CardHeader className="border-b border-white/40 dark:border-slate-800/30 flex flex-row items-center justify-between py-5">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-primary animate-spin-slow" /> Recent Applications Activity
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Latest submissions entering the ID processing pipeline
                </CardDescription>
              </div>
              <Link href="/dashboard/admin/applications" className="text-xs font-black text-primary hover:text-primary-dark flex items-center gap-1 hover:underline transition-all">
                View All Ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <div className="divide-y divide-white/30 dark:divide-slate-800/30">
              {recent.length === 0 && (
                <div className="text-center py-16">
                  <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">No applications submitted yet.</p>
                </div>
              )}
              {recent.map(app => {
                const sc = STATUS_COLORS[app.status] || { label: app.status, classes: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 border-slate-200' };
                // Calculate initials
                const names = app.fullName.trim().split(/\s+/);
                const initials = names.length > 1 
                  ? (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
                  : names[0].charAt(0).toUpperCase();

                // Dynamic background colors based on applicant initials for wowdash aesthetic
                const avatarBgs = [
                  'bg-blue-600/10 text-blue-600 border-blue-200/50 dark:bg-blue-600/20 dark:text-blue-400 dark:border-blue-850/30',
                  'bg-emerald-600/10 text-emerald-600 border-emerald-200/50 dark:bg-emerald-600/20 dark:text-emerald-400 dark:border-emerald-850/30',
                  'bg-amber-600/10 text-amber-600 border-amber-200/50 dark:bg-amber-600/20 dark:text-amber-400 dark:border-amber-850/30',
                  'bg-purple-600/10 text-purple-600 border-purple-200/50 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-850/30',
                  'bg-rose-600/10 text-rose-600 border-rose-200/50 dark:bg-rose-600/20 dark:text-rose-400 dark:border-rose-850/30'
                ];
                const charCodeSum = app.fullName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                const avatarStyle = avatarBgs[charCodeSum % avatarBgs.length];

                return (
                  <div key={app.id} className="px-6 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 hover:bg-white/20 dark:hover:bg-slate-800/10 transition-all duration-200 group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-black shrink-0 transition-transform duration-300 group-hover:scale-105 ${avatarStyle}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate group-hover:text-primary transition-colors">
                          {app.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-extrabold dark:text-slate-400 uppercase tracking-widest mt-0.5">
                          {app.department.name} · {app.position.title}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-black border rounded-full px-2.5 py-1 text-center shrink-0 uppercase tracking-widest ${sc.classes}`}>
                        {sc.label}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md shrink-0">
                        {new Date(app.createdAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Side: Quick Navigation Widget */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="glass-card border border-white/60 dark:border-slate-800/60 shadow-none p-6 flex flex-col h-full justify-between">
            <div className="space-y-6">
              <div>
                <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="text-secondary w-5 h-5 animate-pulse" /> Quick Controls
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                  Direct pathways to system settings & database ledgers
                </CardDescription>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Manage System Users',   desc: 'Control admin accounts & assign roles', href: '/dashboard/admin/users',       color: '#1e5fb8', bg: 'rgba(30, 95, 184, 0.1)',  border: 'border-blue-200/40 dark:border-blue-900/20' },
                  { label: 'Faculties & Positions', desc: 'Register departments & active lists',  href: '/dashboard/admin/departments', color: '#f9b012', bg: 'rgba(249, 176, 18, 0.12)', border: 'border-amber-200/30 dark:border-amber-900/20' },
                  { label: 'Applications Ledger',   desc: 'Process ID requests & level overrides', href: '/dashboard/admin/applications', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)',  border: 'border-emerald-200/40 dark:border-emerald-900/20' },
                  { label: 'System Configuration',  desc: 'Branding, validation logic & SMTP',    href: '/dashboard/admin/settings',    color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.1)',  border: 'border-indigo-200/40 dark:border-indigo-900/20' },
                  { label: 'Security & Audit Logs', desc: 'Timestamped ledger of system actions',  href: '/dashboard/admin/audit',       color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)', border: 'border-pink-200/40 dark:border-pink-900/20' },
                ].map((q, idx) => (
                  <Link key={idx} href={q.href}
                    className="flex items-center gap-4 bg-white/30 dark:bg-slate-900/10 border border-white/60 dark:border-slate-800/40 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${q.border} transition-transform duration-300 group-hover:scale-105`} style={{ background: q.bg }}>
                      <div className="w-3.5 h-3.5 rounded-full shadow-sm animate-pulse" style={{ background: q.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{q.label}</div>
                      <div className="text-[10px] text-slate-500 font-bold dark:text-slate-400 uppercase tracking-widest mt-0.5 truncate">{q.desc}</div>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700 group-hover:text-primary font-black text-base transition-all group-hover:translate-x-1 pr-1">›</span>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
