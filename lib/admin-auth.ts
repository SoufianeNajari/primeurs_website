import { cookies } from 'next/headers';

export function isAdmin(): boolean {
  const c = cookies().get('admin_auth');
  return c?.value === 'true';
}
