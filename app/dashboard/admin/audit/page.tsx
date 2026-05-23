import fs from 'fs';
import path from 'path';
import AuditClient from './AuditClient';

const AUDIT_PATH = path.join(process.cwd(), 'audit-log.json');

function getAuditLogs() {
  try {
    if (fs.existsSync(AUDIT_PATH)) {
      return JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

export default async function AuditLogPage() {
  const currentLogs = getAuditLogs();
  return <AuditClient initialLogs={currentLogs} />;
}
