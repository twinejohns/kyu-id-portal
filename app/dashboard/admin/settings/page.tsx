import fs from 'fs';
import path from 'path';
import SettingsClient from './SettingsClient';

const SETTINGS_PATH = path.join(process.cwd(), 'system-settings.json');

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
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

export default async function SettingsPage() {
  const currentSettings = getSettings();
  return <SettingsClient initialSettings={currentSettings} />;
}
