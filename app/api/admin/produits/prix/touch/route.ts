import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

// Sprint J2 — bump prix_updated_at sans modifier les prix
// "J'ai vérifié, les prix sont toujours bons"

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const { ids } = bodySchema.parse(body);

    const { error } = await supabaseAdmin
      .from('produits')
      .update({ prix_updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      console.error('[admin/produits/prix/touch POST]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ updated: ids.length });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/produits/prix/touch POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
