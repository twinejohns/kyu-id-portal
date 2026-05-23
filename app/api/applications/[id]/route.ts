import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const application = await prisma.staffApplication.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        department: true, 
        position: true,
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Fetch Application Error:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();

    // Remove immutable fields if present
    const { id, createdAt, updatedAt, notes, department, position, ...updateData } = data;

    // Convert date fields to Date objects if present
    if (updateData.appointmentDate) {
      updateData.appointmentDate = new Date(updateData.appointmentDate);
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    const application = await prisma.staffApplication.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: { department: true, position: true }
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error('Update Application Error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
