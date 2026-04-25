import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { AdminSession } from '@/lib/admin-auth';
import type { ClientSession } from '@/lib/client-auth';

// Middleware unifié :
//   - /admin/* + /api/admin/* → cookie pp_admin (iron-session)
//   - /boutique, /boutique/*, /order, /order/*, /api/order → cookie pp_client
//   - reste public (home, /blog, /connexion, etc.)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res = NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Sans secret, on ne peut pas vérifier les cookies. On bloque tout pour
    // éviter une faille de configuration en prod.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }
    if (pathname === '/admin' || pathname === '/admin/') return res;
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin/');
  const isClientRoute =
    pathname === '/boutique' ||
    pathname.startsWith('/boutique/') ||
    pathname === '/order' ||
    pathname.startsWith('/order/') ||
    pathname === '/api/order';

  if (isAdminRoute) {
    let isAuthed = false;
    try {
      const s = await getIronSession<AdminSession>(request, res, {
        password: secret,
        cookieName: 'pp_admin',
      });
      isAuthed = s.isAdmin === true;
    } catch {}

    if (isAuthed) return res;
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    if (pathname === '/admin' || pathname === '/admin/') return res;
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (isClientRoute) {
    let isAuthed = false;
    try {
      const s = await getIronSession<ClientSession>(request, res, {
        password: secret,
        cookieName: 'pp_client',
      });
      isAuthed = Boolean(s.clientId);
    } catch {}

    if (isAuthed) return res;
    if (pathname === '/api/order') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const loginUrl = new URL('/connexion', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/boutique',
    '/boutique/:path*',
    '/order',
    '/order/:path*',
    '/api/order',
  ],
};
