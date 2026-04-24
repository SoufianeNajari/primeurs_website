import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeProduitInput } from '@/lib/produit-schema';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const input = normalizeProduitInput(body);

    const { data, error } = await supabaseAdmin
      .from('produits')
      .update(input)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un produit avec ce slug existe déjà' }, { status: 409 });
      }
      console.error('[admin/produits PATCH]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    return NextResponse.json({ produit: data });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/produits PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { error } = await supabaseAdmin.from('produits').delete().eq('id', params.id);
  if (error) {
    console.error('[admin/produits DELETE]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
