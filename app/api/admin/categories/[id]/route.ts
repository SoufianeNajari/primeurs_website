import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { slugifyCategorie } from '@/lib/categories';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const patch: Record<string, unknown> = {};

    if (typeof body.nom === 'string') {
      const nom = body.nom.trim();
      if (!nom || nom.length > 60) {
        return NextResponse.json({ error: 'Nom requis (max 60)' }, { status: 400 });
      }
      patch.nom = nom;
      patch.slug = slugifyCategorie(nom);
    }
    if ('emoji' in body) {
      patch.emoji = body.emoji ? String(body.emoji).trim().slice(0, 4) : null;
    }
    if (typeof body.ordre === 'number') {
      patch.ordre = body.ordre;
    }
    if (typeof body.actif === 'boolean') {
      patch.actif = body.actif;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 });
    }

    // Si renommage, propager sur produits.categorie text (snapshot rétrocompat)
    if (typeof patch.nom === 'string') {
      const { data: existing } = await supabaseAdmin
        .from('categories')
        .select('nom')
        .eq('id', params.id)
        .maybeSingle();
      if (existing?.nom && existing.nom !== patch.nom) {
        await supabaseAdmin
          .from('produits')
          .update({ categorie: patch.nom })
          .eq('categorie_id', params.id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Conflit de nom/slug' }, { status: 409 });
      }
      console.error('[admin/categories PATCH]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
    return NextResponse.json({ categorie: data });
  } catch (err) {
    console.error('[admin/categories PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { count } = await supabaseAdmin
      .from('produits')
      .select('id', { count: 'exact', head: true })
      .eq('categorie_id', params.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Suppression impossible : ${count} produit(s) utilise(nt) cette catégorie. Désactivez-la plutôt, ou réaffectez les produits.` },
        { status: 409 },
      );
    }

    const { error } = await supabaseAdmin.from('categories').delete().eq('id', params.id);
    if (error) {
      console.error('[admin/categories DELETE]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/categories DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
