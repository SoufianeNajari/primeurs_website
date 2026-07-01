import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { AdminSession } from '@/lib/admin-auth';

// Middleware unifié :
//   - /admin/* + /api/admin/* → cookie pp_admin (iron-session)
//   - reste public (home, /boutique, /order, /blog, etc.)
//
// Note : la boutique et la commande étaient auparavant réservées aux clients
// autorisés (gate par téléphone, cookie pp_client). Ce pare-feu servait aux
// tests privés — il est désactivé pour l'ouverture publique du site.
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

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
