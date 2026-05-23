import { NextRequest, NextResponse } from 'next/server';

// Pages each role is allowed to visit (prefix-matched).
// SUPERADMIN: empty array means "allowed everywhere" (checked separately).
const ROLE_ALLOWED: Record<string, string[]> = {
  MEDIAOFFICER: ['/dashboard/media', '/dashboard/applications'],
  HR:           ['/dashboard/hr', '/dashboard/applications'],
  PRINTER:      ['/dashboard/printer', '/dashboard/applications'],
  ISSUANCE:     ['/dashboard/issuance', '/dashboard/applications'],
  SUPERADMIN:   [], // handled by early-return below
};

// Where to redirect each role when they land on an off-limits page.
const ROLE_HOME: Record<string, string> = {
  MEDIAOFFICER: '/dashboard/media',
  HR:           '/dashboard/hr',
  PRINTER:      '/dashboard/printer',
  ISSUANCE:     '/dashboard/issuance',
  SUPERADMIN:   '/dashboard/admin',
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /dashboard routes; skip /dashboard/admin (handled by the page itself).
  if (!pathname.startsWith('/dashboard') || pathname.startsWith('/dashboard/admin')) {
    return NextResponse.next();
  }

  // Parse session cookie
  const sessionCookie = req.cookies.get('kyu_session');
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  let session: { role: string } | null = null;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = session?.role;
  if (!role) return NextResponse.redirect(new URL('/login', req.url));

  // SUPERADMIN can go anywhere inside /dashboard
  if (role === 'SUPERADMIN') return NextResponse.next();

  const allowed = ROLE_ALLOWED[role] || [];
  const home    = ROLE_HOME[role] || '/dashboard';

  // Redirect bare /dashboard to the role's home page
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Prefix-match: allow if pathname equals or is nested under an allowed path
  const isAllowed = allowed.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  if (!isAllowed) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
