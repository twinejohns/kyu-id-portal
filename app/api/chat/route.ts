import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const messages = await prisma.globalChat.findMany({
      orderBy: { createdAt: 'asc' },
      take: 100 // return last 100 messages
    });
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Fetch global chat error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { senderName, senderRole, message } = await req.json();

    if (!senderName || !senderRole || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const newMessage = await prisma.globalChat.create({
      data: {
        senderName,
        senderRole,
        message
      }
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Post global chat error:', error);
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
}
