import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '@/utils/emailSender';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.endsWith('@kyu.ac.ug')) {
      return NextResponse.json(
        { error: 'Only @kyu.ac.ug email addresses are accepted.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (user) {
      // In production: generate a secure token and send a reset link.
      // For now: send an admin-contact message (MVP).
      await sendEmail({
        to: email,
        subject: 'KyU ID Portal — Password Reset Request',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px">
          <h2 style="color:#1e5fb8">Kyambogo University Staff ID Portal</h2>
          <p>A password reset was requested for your account (<strong>${email}</strong>).</p>
          <p>Please contact the DICTS System Administrator or your Super Admin to reset your password directly in the portal.</p>
          <p style="background:#f0f4ff;padding:12px;border-radius:8px;font-weight:bold">Contact: admin@kyu.ac.ug</p>
          <p style="font-size:11px;color:#777">If you did not make this request, please ignore this email.</p>
        </div>`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If your email exists in our system, reset instructions have been sent.',
    });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
