import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeProduitInput } from '@/lib/produit-schema';

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const input = normalizeProduitInput(body);

    const { data, error } = await supabaseAdmin
      .from('produits')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un produit avec ce slug existe déjà' }, { status: 409 });
      }
      console.error('[admin/produits POST]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ produit: data }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/produits POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
