import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protège toutes les routes /admin/* (sauf /admin lui-même qui affiche le login)
// et les routes API /api/admin/*. Sans cookie admin_auth, les requêtes sont
// redirigées vers /admin (UI) ou bloquées en 401 (API) — cela évite que les
// données de l'admin fuient dans le payload RSC envoyé au client non autorisé.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = request.cookies.get('admin_auth')?.value === 'true';

  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // /admin = page de login, on laisse passer. Tout le reste de /admin/* redirige.
  if (pathname === '/admin' || pathname === '/admin/') return NextResponse.next();

  const loginUrl = new URL('/admin', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
