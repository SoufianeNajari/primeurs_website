import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

// Sprint H1 — endpoint dédié à la mise à jour rapide des prix d'options
// (page /admin/prix). On ne touche qu'à la colonne `options` ; le trigger
// produits_prix_updated_at bump prix_updated_at automatiquement si la
// valeur jsonb change.

const bodySchema = z.object({
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        prix: z.coerce.number().min(0).max(9999).nullable(),
      }),
    )
    .min(1)
    .max(6),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const { options: prixUpdates } = bodySchema.parse(body);

    const { data: existing, error: readErr } = await supabaseAdmin
      .from('produits')
      .select('options')
      .eq('id', params.id)
      .single();

    if (readErr || !existing) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const current = (existing.options || []) as { id: string; libelle: string; prix?: number | null }[];
    const prixById = new Map(prixUpdates.map((p) => [p.id, p.prix]));

    const merged = current.map((opt) => {
      if (!prixById.has(opt.id)) return opt;
      const newPrix = prixById.get(opt.id);
      return { ...opt, prix: newPrix === null ? null : Number(newPrix) };
    });

    const { data, error } = await supabaseAdmin
      .from('produits')
      .update({ options: merged })
      .eq('id', params.id)
      .select('id, options, prix_updated_at')
      .single();

    if (error) {
      console.error('[admin/produits/prix PATCH]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ produit: data });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/produits/prix PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
