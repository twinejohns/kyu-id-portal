import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: { id: user.id, role: user.role, name: user.name } });
    
    // Set a very simple cookie for MVP auth (DO NOT USE IN PROD)
    response.cookies.set('kyu_session', JSON.stringify({ id: user.id, role: user.role, name: user.name }), {
      httpOnly: true,
      secure: false, // http for local
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
