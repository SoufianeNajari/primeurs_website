import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeProduitInput } from '@/lib/produit-schema';
import { parseCsv, parseOptions, parseBool, parseInt12, parseIntOrNull } from '@/lib/csv';

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_ROWS = 500;

export type ImportRowResult = {
  ligne: number;
  nom: string;
  status: 'created' | 'updated' | 'error';
  message?: string;
};

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let text: string;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier CSV manquant' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (> 1 Mo)' }, { status: 413 });
    }
    text = await file.text();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'CSV vide ou en-têtes manquants', parseErrors },
      { status: 400 },
    );
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Trop de lignes (max ${MAX_ROWS})` },
      { status: 413 },
    );
  }

  // Récupère slugs existants en une requête pour distinguer create/update
  const { data: existing } = await supabaseAdmin.from('produits').select('id, slug');
  const slugToId = new Map<string, string>();
  for (const p of existing || []) {
    if (p.slug) slugToId.set(p.slug, p.id as string);
  }

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ligne = i + 2; // +2 = header + base 1
    const nom = (row.nom || '').trim();

    try {
      if (!nom) throw new Error('Nom manquant');

      const optionsRaw = parseOptions(row.options);
      const options = optionsRaw.map((o) => ({
        id: randomUUID(),
        libelle: o.libelle,
        prix: o.prix,
      }));

      const input = normalizeProduitInput({
        nom,
        categorie: row.categorie || '',
        slug: row.slug || undefined,
        description: row.description || null,
        description_longue: row.description_longue || null,
        origine: row.origine || null,
        conseils_conservation: row.conseils_conservation || null,
        bio: parseBool(row.bio) ?? false,
        disponible: parseBool(row.disponible) ?? true,
        ordre: parseIntOrNull(row.ordre),
        mois_debut: parseInt12(row.mois_debut),
        mois_fin: parseInt12(row.mois_fin),
        image_url: row.image_url || null,
        options,
      });

      const existingId = slugToId.get(input.slug!);
      if (existingId) {
        const { error } = await supabaseAdmin
          .from('produits')
          .update(input)
          .eq('id', existingId);
        if (error) throw new Error(error.message);
        results.push({ ligne, nom, status: 'updated' });
      } else {
        const { error } = await supabaseAdmin.from('produits').insert(input);
        if (error) {
          if (error.code === '23505') throw new Error('Slug déjà utilisé');
          throw new Error(error.message);
        }
        results.push({ ligne, nom, status: 'created' });
      }
    } catch (err) {
      let message = 'Erreur inconnue';
      if (err instanceof ZodError) {
        message = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ');
      } else if (err instanceof Error) {
        message = err.message;
      }
      results.push({ ligne, nom: nom || '(vide)', status: 'error', message });
    }
  }

  const summary = {
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return NextResponse.json({ results, summary, parseErrors });
}
