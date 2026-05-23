import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'system-settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {}
  return {};
}

/**
 * Public endpoint — returns only display-safe settings for the virtual ID card.
 * No authentication required (these are purely presentational values).
 */
export async function GET() {
  try {
    const all = readSettings();
    // Expose only the fields needed to render the card publicly
    const publicSettings = {
      institutionName:        all.institutionName        ?? 'Kyambogo University',
      secretarySignatureUrl:  all.secretarySignatureUrl  ?? null,
      returnAddress:          all.returnAddress          ?? null,
      templateMode:           all.templateMode           ?? 'builtin',
      cardHeaderTitle:        all.cardHeaderTitle        ?? 'OFFICIAL STAFF IDENTITY CARD',
      cardSubtitle:           all.cardSubtitle           ?? 'Knowledge and Skills for Service',
      cardBannerText:         all.cardBannerText         ?? 'KYAMBOGO UNIVERSITY',
      cardWatermarkText:      all.cardWatermarkText      ?? 'KYAMBOGO UNIVERSITY',
      showWatermark:          all.showWatermark          !== false,
      showBarcode:            all.showBarcode            !== false,
      showDepartment:         all.showDepartment         !== false,
      showPosition:           all.showPosition           !== false,
    };
    return NextResponse.json({ success: true, settings: publicSettings });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
