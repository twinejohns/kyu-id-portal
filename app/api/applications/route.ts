import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate inputs
    if (!data.fullName || !data.email || !data.positionId || !data.departmentId || !data.applicationType || !data.appointmentLetterUrl || !data.photoUrl || !data.signatureUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { phoneNumber } = data;

    const application = await prisma.staffApplication.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: phoneNumber || null,
        positionId: data.positionId,
        departmentId: data.departmentId,
        applicationType: data.applicationType,
        currentIdNumber: data.currentIdNumber,
        replacementReason: data.replacementReason || null,
        employmentTerm: data.employmentTerm || 'PERMANENT',
        appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : new Date(),
        appointmentLetterUrl: data.appointmentLetterUrl,
        photoUrl: data.photoUrl,
        signatureUrl: data.signatureUrl,
        status: 'SUBMITTED'
      }
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Submit Error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const applications = await prisma.staffApplication.findMany({
      where: { email },
      include: { department: true, position: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, applications });
  } catch (error) {
    console.error('Fetch status error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

