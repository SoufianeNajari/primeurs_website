import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeArticleInput } from '@/lib/article';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const input = normalizeArticleInput(body);

    const { data, error } = await supabaseAdmin
      .from('articles')
      .update(input)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un article avec ce slug existe déjà' }, { status: 409 });
      }
      console.error('[admin/articles PATCH]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });

    return NextResponse.json({ article: data });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/articles PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { error } = await supabaseAdmin.from('articles').delete().eq('id', params.id);
  if (error) {
    console.error('[admin/articles DELETE]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
