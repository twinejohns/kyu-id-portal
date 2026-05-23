import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('kyu_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: 'No active session' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to read session' }, { status: 550 });
  }
}
