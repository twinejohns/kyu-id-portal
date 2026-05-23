import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '@/utils/emailSender';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { status, dictsComments, hrComments, generatedIdNumber, expiryDate } = body;
    
    // Check and archive old application if generating/setting an ID number
    if (generatedIdNumber) {
      const existingAppWithId = await prisma.staffApplication.findFirst({
        where: {
          generatedIdNumber: generatedIdNumber,
          NOT: {
            id: resolvedParams.id
          }
        }
      });

      if (existingAppWithId) {
        // Safe archival updates to release unique constraint
        await prisma.staffApplication.update({
          where: { id: existingAppWithId.id },
          data: {
            generatedIdNumber: `${existingAppWithId.generatedIdNumber}-ARCHIVED-${Date.now()}`,
            status: 'REPLACED',
            dictsComments: `Archived due to replacement request ${resolvedParams.id} on ${new Date().toLocaleDateString()}`
          }
        });
      }
    }

    // Build update data object
    const updateData: any = { status };
    
    if (dictsComments !== undefined) updateData.dictsComments = dictsComments;
    if (hrComments !== undefined) updateData.hrComments = hrComments;
    if (generatedIdNumber !== undefined) updateData.generatedIdNumber = generatedIdNumber;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;

    const app = await prisma.staffApplication.update({
      where: { id: resolvedParams.id },
      data: updateData
    });

    // Send email based on status transitions
    let subject = '';
    let html = '';
    const statusUrl = `http://localhost:3000/status/${app.id}`; // Hardcoded for local dev

    if (status === 'APPROVED') {
      subject = 'Kyambogo University ID Portal - Application APPROVED 🎉';
      html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #002f6c; padding-bottom: 15px;">
            <h2 style="color: #002f6c; margin: 0;">Kyambogo University Staff Portal</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Dear <strong>${app.fullName}</strong>,</p>
            <p>Congratulations! Your Staff ID card application has been reviewed and officially <strong>APPROVED</strong> by the HR Department.</p>
            <p>Your institutional ID Number is assigned as: <span style="font-size: 16px; font-weight: bold; color: #002f6c; background: #f0f4f8; padding: 4px 10px; border-radius: 5px;">${app.generatedIdNumber || 'KYU-TEMP'}</span></p>
            <p>While the physical ID card is being printed, you can immediately access your <strong>Virtual ID Card</strong> by clicking the link below:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${statusUrl}" style="background-color: #f9b012; color: #002f6c; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 15px;">Access Virtual ID Card</a>
            </div>
            <p>We will send you another notification as soon as the card printing process is completed.</p>
          </div>
          <div style="font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
            This is an automated message from the Kyambogo University Staff ID Portal. Please do not reply.
          </div>
        </div>
      `;
    } else if (status === 'REJECTED_MEDIA' || status === 'REJECTED_HR') {
      const rejectComments = status === 'REJECTED_MEDIA' ? app.dictsComments : app.hrComments;
      const rejector = status === 'REJECTED_MEDIA' ? 'DICTS Media' : 'HR Admin';
      
      subject = 'Kyambogo University ID Portal - Action Required ⚠️';
      html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #b71c1c; padding-bottom: 15px;">
            <h2 style="color: #b71c1c; margin: 0;">Kyambogo University Staff Portal</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Dear <strong>${app.fullName}</strong>,</p>
            <p>Your Staff ID card application has been reviewed and requires corrections by the <strong>${rejector}</strong>.</p>
            <div style="background: #ffebee; border-left: 4px solid #b71c1c; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong style="color: #c62828;">Reason for Rejection:</strong>
              <p style="margin: 5px 0 0 0; font-style: italic;">"${rejectComments || 'No details provided. Please review your biometric photos or files.'}"</p>
            </div>
            <p>Please click the button below to view your status, make the required modifications, and resubmit your details for processing:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${statusUrl}" style="background-color: #b71c1c; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 15px;">Edit & Resubmit Application</a>
            </div>
          </div>
          <div style="font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
            This is an automated message from the Kyambogo University Staff ID Portal. Please do not reply.
          </div>
        </div>
      `;
    } else if (status === 'PRINTED') {
      subject = 'Kyambogo University ID Portal - Physical ID Card Ready for Collection 📇';
      html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #002f6c; padding-bottom: 15px;">
            <h2 style="color: #002f6c; margin: 0;">Kyambogo University Staff Portal</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Dear <strong>${app.fullName}</strong>,</p>
            <p>Good news! Your physical high-security Staff ID card has been printed successfully by our printing officer.</p>
            <p>It has been forwarded to the **ID Issuance Officer** for physical handover.</p>
            <p>Please proceed to the **ICT / Registry Office** during working hours to collect your card. Remember to bring a copy of your appointment letter or national ID for identity verification.</p>
          </div>
          <div style="font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
            This is an automated message from the Kyambogo University Staff ID Portal. Please do not reply.
          </div>
        </div>
      `;
    }

    if (subject) {
      await sendEmail({ to: app.email, subject, html });
    }

    return NextResponse.json({ success: true, app });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 });
  }
}
