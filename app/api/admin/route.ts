import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const SETTINGS_PATH = path.join(process.cwd(), 'system-settings.json');
const AUDIT_PATH    = path.join(process.cwd(), 'audit-log.json');

// ─── Helpers ────────────────────────────────────────────────────────────────
function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {}
  return {
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
}

function writeSettings(data: Record<string, unknown>) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
}

function appendAudit(entry: Record<string, unknown>) {
  let log: unknown[] = [];
  try {
    if (fs.existsSync(AUDIT_PATH)) log = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  } catch {}
  log.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (log.length > 200) log = log.slice(0, 200); // cap at 200 entries
  try { fs.writeFileSync(AUDIT_PATH, JSON.stringify(log, null, 2)); } catch {}
}

function readAudit() {
  try {
    if (fs.existsSync(AUDIT_PATH)) return JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  } catch {}
  return [];
}

// ─── GET — settings + audit ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('kyu_session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const resource = searchParams.get('resource');

    if (resource === 'settings') return NextResponse.json({ success: true, settings: readSettings() });
    if (resource === 'audit')    return NextResponse.json({ success: true, log: readAudit() });

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── POST — all admin actions ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('kyu_session');
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body  = await req.json();
    const { action } = body;
    const actor = session.name || session.email || 'SuperAdmin';

    // ── USER ACTIONS ──────────────────────────────────────────────────────────
    if (action === 'add-user') {
      const { name, email, password, role } = body;
      if (!name || !email || !password || !role)
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      const user = await prisma.user.create({ data: { name, email, password, role } });
      appendAudit({ actor, action: 'add-user', detail: `Created user ${name} (${role})` });
      return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
    }

    if (action === 'edit-user') {
      const { id, name, email, password, role } = body;
      if (!id || !name || !email || !role)
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (conflict) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      const updateData: Record<string, unknown> = { name, email, role };
      if (password?.trim()) updateData.password = password;
      const user = await prisma.user.update({ where: { id }, data: updateData });
      appendAudit({ actor, action: 'edit-user', detail: `Updated user ${name} → role ${role}` });
      return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
    }

    if (action === 'delete-user') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      if (session.id === id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { id } });
      await prisma.user.delete({ where: { id } });
      appendAudit({ actor, action: 'delete-user', detail: `Deleted user ${user?.name} (${user?.role})` });
      return NextResponse.json({ success: true });
    }

    // ── DEPARTMENT ACTIONS ───────────────────────────────────────────────────
    if (action === 'add-department') {
      const { name } = body;
      if (!name) return NextResponse.json({ error: 'Missing department name' }, { status: 400 });
      const existing = await prisma.department.findUnique({ where: { name } });
      if (existing) return NextResponse.json({ error: 'Department already exists' }, { status: 400 });
      const dept = await prisma.department.create({ data: { name } });
      appendAudit({ actor, action: 'add-department', detail: `Created department: ${name}` });
      return NextResponse.json({ success: true, department: dept });
    }

    if (action === 'edit-department') {
      const { id, name } = body;
      if (!id || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      const dept = await prisma.department.update({ where: { id }, data: { name } });
      appendAudit({ actor, action: 'edit-department', detail: `Renamed department to: ${name}` });
      return NextResponse.json({ success: true, department: dept });
    }

    if (action === 'delete-department') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing department ID' }, { status: 400 });
      const dept = await prisma.department.findUnique({ where: { id } });
      await prisma.department.delete({ where: { id } });
      appendAudit({ actor, action: 'delete-department', detail: `Deleted department: ${dept?.name}` });
      return NextResponse.json({ success: true });
    }

    // ── POSITION ACTIONS ─────────────────────────────────────────────────────
    if (action === 'add-position') {
      const { title, departmentId } = body;
      if (!title || !departmentId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      const existing = await prisma.position.findFirst({ where: { title, departmentId } });
      if (existing) return NextResponse.json({ error: 'Position already exists in this dept' }, { status: 400 });
      const pos = await prisma.position.create({ data: { title, departmentId } });
      appendAudit({ actor, action: 'add-position', detail: `Added position: ${title}` });
      return NextResponse.json({ success: true, position: pos });
    }

    if (action === 'delete-position') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing position ID' }, { status: 400 });
      const pos = await prisma.position.findUnique({ where: { id } });
      await prisma.position.delete({ where: { id } });
      appendAudit({ actor, action: 'delete-position', detail: `Deleted position: ${pos?.title}` });
      return NextResponse.json({ success: true });
    }

    if (action === 'bulk-import-departments') {
      const { departments } = body;
      if (!departments || !Array.isArray(departments)) {
        return NextResponse.json({ error: 'Missing or invalid departments array' }, { status: 400 });
      }

      let deptsAdded = 0;
      let positionsAdded = 0;
      const importedDepts = [];

      for (const item of departments) {
        const { name, positions } = item;
        if (!name || typeof name !== 'string' || !name.trim()) continue;
        const normalizedName = name.trim();

        // 1. Find or create department
        let dept = await prisma.department.findUnique({
          where: { name: normalizedName },
          include: { positions: true }
        });

        if (!dept) {
          dept = await prisma.department.create({
            data: { name: normalizedName },
            include: { positions: true }
          });
          deptsAdded++;
        }

        // 2. Add new positions
        if (positions && Array.isArray(positions)) {
          for (const posTitle of positions) {
            if (!posTitle || typeof posTitle !== 'string' || !posTitle.trim()) continue;
            const normalizedTitle = posTitle.trim();

            const exists = dept.positions.some(
              p => p.title.toLowerCase() === normalizedTitle.toLowerCase()
            );

            if (!exists) {
              const newPos = await prisma.position.create({
                data: {
                  title: normalizedTitle,
                  departmentId: dept.id
                }
              });
              dept.positions.push(newPos);
              positionsAdded++;
            }
          }
        }

        importedDepts.push({
          id: dept.id,
          name: dept.name,
          positions: dept.positions.map(p => ({
            id: p.id,
            title: p.title,
            departmentId: p.departmentId
          }))
        });
      }

      appendAudit({
        actor,
        action: 'bulk-import-departments',
        detail: `Bulk imported ${deptsAdded} new departments and ${positionsAdded} new positions`
      });

      return NextResponse.json({
        success: true,
        importedCount: deptsAdded,
        positionsCount: positionsAdded,
        departments: importedDepts
      });
    }

    // ── SETTINGS ─────────────────────────────────────────────────────────────
    if (action === 'save-settings') {
      const { settings } = body;
      if (!settings) return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
      writeSettings(settings);
      appendAudit({ actor, action: 'save-settings', detail: 'System settings updated' });
      return NextResponse.json({ success: true, settings });
    }

    // ── FORCE APPLICATION STATUS ─────────────────────────────────────────────
    if (action === 'force-status') {
      const { id, status, comment } = body;
      if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      const app = await prisma.staffApplication.update({
        where: { id },
        data: { status, hrComments: comment || null },
        include: { department: true, position: true }
      });
      appendAudit({ actor, action: 'force-status', detail: `Forced app ${id.slice(0,8)} → ${status}` });
      return NextResponse.json({ success: true, application: app });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
