import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const payloadSchema = z.object({
  ingredients: z
    .array(
      z.object({
        produit_id: z.string().regex(UUID_RE, 'produit_id invalide'),
        quantite_kg_4pers: z.number().positive().max(50),
      }),
    )
    .max(30),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('article_ingredients')
    .select('produit_id, quantite_kg_4pers, ordre')
    .eq('article_id', params.id)
    .order('ordre', { ascending: true });

  if (error) {
    console.error('[admin/articles/ingredients GET]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ ingredients: data ?? [] });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation', issues: parsed.error.issues }, { status: 400 });
  }

  // Vérifie que l'article existe avant de toucher aux ingrédients.
  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });

  // Déduplique sur produit_id (la PK composite refuserait sinon).
  const seen = new Set<string>();
  const rows = parsed.data.ingredients
    .filter((i) => {
      if (seen.has(i.produit_id)) return false;
      seen.add(i.produit_id);
      return true;
    })
    .map((i, idx) => ({
      article_id: params.id,
      produit_id: i.produit_id,
      quantite_kg_4pers: i.quantite_kg_4pers,
      ordre: idx,
    }));

  const { error: delError } = await supabaseAdmin
    .from('article_ingredients')
    .delete()
    .eq('article_id', params.id);
  if (delError) {
    console.error('[admin/articles/ingredients PUT delete]', delError);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }

  if (rows.length > 0) {
    const { error: insError } = await supabaseAdmin.from('article_ingredients').insert(rows);
    if (insError) {
      console.error('[admin/articles/ingredients PUT insert]', insError);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: rows.length });
}
