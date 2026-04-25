import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';

export async function POST() {
  const session = await getClientSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
