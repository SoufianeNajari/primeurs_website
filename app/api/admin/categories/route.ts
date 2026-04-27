import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { listCategoriesAdmin, slugifyCategorie } from '@/lib/categories';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const data = await listCategoriesAdmin();
    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error('[admin/categories GET]', err);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const body = await request.json();
    const nom = String(body.nom || '').trim();
    const emoji = body.emoji ? String(body.emoji).trim().slice(0, 4) : null;
    if (!nom || nom.length > 60) {
      return NextResponse.json({ error: 'Nom requis (max 60 caractères)' }, { status: 400 });
    }
    const slug = slugifyCategorie(nom);
    if (!slug) return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });

    const { data: max } = await supabaseAdmin
      .from('categories')
      .select('ordre')
      .order('ordre', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrdre = (max?.ordre ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ slug, nom, emoji, ordre: nextOrdre })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Une catégorie avec ce nom existe déjà' }, { status: 409 });
      }
      console.error('[admin/categories POST]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
    return NextResponse.json({ categorie: data }, { status: 201 });
  } catch (err) {
    console.error('[admin/categories POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
