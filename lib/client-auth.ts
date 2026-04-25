import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import type { NextRequest } from 'next/server';

export type ClientSession = {
  clientId?: string;
  telephone?: string;
  loggedInAt?: number;
};

function getPassword(): string {
  // Réutilise ADMIN_SESSION_SECRET — un seul secret iron-session pour tout le site.
  // Cookie name distinct (pp_client) → pas de collision avec pp_admin.
  const pwd = process.env.ADMIN_SESSION_SECRET;
  if (!pwd || pwd.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET manquant ou trop court (min 32 caractères). Définir dans .env.local et sur Vercel.',
    );
  }
  return pwd;
}

function sessionOptions(): SessionOptions {
  return {
    password: getPassword(),
    cookieName: 'pp_client',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 jours
    },
  };
}

export async function getClientSession() {
  return getIronSession<ClientSession>(cookies(), sessionOptions());
}

export async function getClientSessionFromRequest(req: NextRequest, res: Response) {
  return getIronSession<ClientSession>(req, res, sessionOptions());
}

export async function isClientAuthorized(): Promise<boolean> {
  try {
    const s = await getClientSession();
    return Boolean(s.clientId);
  } catch {
    return false;
  }
}
