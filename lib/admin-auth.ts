import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import type { NextRequest } from 'next/server';

export type AdminSession = {
  isAdmin?: boolean;
  loggedInAt?: number;
};

function getPassword(): string {
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
    cookieName: 'pp_admin',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8h
    },
  };
}

export async function getSession() {
  return getIronSession<AdminSession>(cookies(), sessionOptions());
}

export async function getSessionFromRequest(req: NextRequest, res: Response) {
  // Pour middleware — iron-session gère Request/Response aussi
  return getIronSession<AdminSession>(req, res, sessionOptions());
}

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getSession();
    return session.isAdmin === true;
  } catch {
    return false;
  }
}
