import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const resolvedParams = await params;
    const notes = await prisma.applicationNote.findMany({
      where: { applicationId: resolvedParams.appId },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('Fetch application notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const resolvedParams = await params;
    const { senderName, senderRole, message } = await req.json();

    if (!senderName || !senderRole || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const note = await prisma.applicationNote.create({
      data: {
        applicationId: resolvedParams.appId,
        senderName,
        senderRole,
        message
      }
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Post application note error:', error);
    return NextResponse.json({ error: 'Failed to post note' }, { status: 500 });
  }
}
