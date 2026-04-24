import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { AdminSession } from '@/lib/admin-auth';

// Protège /admin/* (sauf /admin = login) et /api/admin/*.
// Utilise iron-session (cookie signé) — impossible de forger côté client.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();

  let isAuthed = false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 32) {
    try {
      const session = await getIronSession<AdminSession>(request, res, {
        password: secret,
        cookieName: 'pp_admin',
      });
      isAuthed = session.isAdmin === true;
    } catch {
      isAuthed = false;
    }
  }

  if (isAuthed) return res;

  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // /admin = page de login, on laisse passer.
  if (pathname === '/admin' || pathname === '/admin/') return res;

  const loginUrl = new URL('/admin', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
