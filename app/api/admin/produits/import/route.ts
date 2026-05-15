import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeProduitInput } from '@/lib/produit-schema';
import { parseCsv, parseOptions, parseBool, parseInt12, parseIntOrNull } from '@/lib/csv';
import { findCategorieByNom, findOrCreateCategorieByNom } from '@/lib/categories';
import type { ProduitOption } from '@/lib/produit';

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_ROWS = 500;

export type ImportRowResult = {
  ligne: number;
  nom: string;
  status: 'created' | 'updated' | 'unchanged' | 'error';
  message?: string;
};

type ExistingProduit = {
  id: string;
  nom: string;
  categorie: string;
  categorie_id: string | null;
  slug: string | null;
  description: string | null;
  description_longue: string | null;
  origine: string | null;
  conseils_conservation: string | null;
  bio: boolean | null;
  local: boolean;
  variete: string | null;
  qualite: string | null;
  calibre: string | null;
  disponible: boolean | null;
  mis_en_avant: boolean;
  ordre: number | null;
  mois_debut: number | null;
  mois_fin: number | null;
  image_url: string | null;
  options: ProduitOption[] | null;
};

// Normalisation pour matcher les options du CSV (libellé typé par l'utilisateur)
// avec celles déjà en DB et préserver leur UUID. Sans ça, randomUUID() à chaque
// import régénère les ids → jsonb toujours distinct → UPDATE forcé + trigger
// prix_updated_at + paniers clients qui perdent leurs items au reconcile.
function normalizeLibelle(s: string): string {
  return s.trim().toLowerCase();
}

function preserveOptionIds(
  fromCsv: Array<{ libelle: string; prix: number | null }>,
  existing: ProduitOption[] | null,
): Array<{ id: string; libelle: string; prix: number | null }> {
  const idByLibelle = new Map<string, string>();
  for (const o of existing || []) {
    idByLibelle.set(normalizeLibelle(o.libelle), o.id);
  }
  return fromCsv.map((o) => ({
    id: idByLibelle.get(normalizeLibelle(o.libelle)) ?? randomUUID(),
    libelle: o.libelle,
    prix: o.prix,
  }));
}

// null/undefined/'' → traité comme équivalents pour les colonnes nullable.
function nullish(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v === '') return null;
  return v;
}

// Champs touchés par l'import (cf. enriched plus bas). Comparer juste ceux-là :
// `created_at`, `prix_updated_at`, `categorie_id` (dérivé), `id` n'entrent pas.
const COMPARED_FIELDS = [
  'nom', 'categorie', 'slug',
  'description', 'description_longue', 'origine', 'conseils_conservation',
  'bio', 'local', 'variete', 'qualite', 'calibre',
  'disponible', 'mis_en_avant',
  'ordre', 'mois_debut', 'mois_fin',
  'image_url',
] as const;

function isUnchanged(
  enriched: Record<string, unknown>,
  existing: ExistingProduit,
): boolean {
  for (const k of COMPARED_FIELDS) {
    if (nullish(enriched[k]) !== nullish((existing as unknown as Record<string, unknown>)[k])) {
      return false;
    }
  }
  const a = (enriched.options as Array<{ id: string; libelle: string; prix: number | null }> | undefined) || [];
  const b = existing.options || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if (a[i].libelle !== b[i].libelle) return false;
    if ((a[i].prix ?? null) !== (b[i].prix ?? null)) return false;
  }
  return true;
}

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

  // Récupère TOUS les produits existants en une requête. Sert à la fois à
  // distinguer create/update (par slug) et à comparer ligne par ligne pour
  // éviter les UPDATE no-op + préserver les optionIds (pour ne pas faire churner
  // les paniers clients à chaque réimport).
  const { data: existing } = await supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, categorie_id, slug, description, description_longue, origine, conseils_conservation, bio, local, variete, qualite, calibre, disponible, mis_en_avant, ordre, mois_debut, mois_fin, image_url, options');
  const slugToExisting = new Map<string, ExistingProduit>();
  for (const p of (existing || []) as ExistingProduit[]) {
    if (p.slug) slugToExisting.set(p.slug, p);
  }

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ligne = i + 2; // +2 = header + base 1
    const nom = (row.nom || '').trim();

    try {
      if (!nom) throw new Error('Nom manquant');

      const optionsRaw = parseOptions(row);
      if (optionsRaw.length === 0) throw new Error('Aucune option valide (remplir au moins opt1_libelle, ou colonne options legacy)');

      // On résout d'abord le produit existant (par slug si présent, sinon
      // par slug auto-généré ci-dessous). Permet de préserver les optionIds
      // existants et de récupérer mis_en_avant (non porté par le CSV).
      const slugPrelim = (row.slug || '').trim() || null;
      const existingForSlug = slugPrelim ? slugToExisting.get(slugPrelim) ?? null : null;

      const options = preserveOptionIds(optionsRaw, existingForSlug?.options ?? null);

      const input = normalizeProduitInput({
        nom,
        categorie: row.categorie || '',
        slug: row.slug || undefined,
        description: row.description || null,
        description_longue: row.description_longue || null,
        origine: row.origine || null,
        conseils_conservation: row.conseils_conservation || null,
        bio: parseBool(row.bio) ?? false,
        local: parseBool(row.local) ?? false,
        variete: row.variete || null,
        qualite: row.qualite || null,
        calibre: row.calibre || null,
        disponible: parseBool(row.disponible) ?? true,
        // mis_en_avant : pas de colonne CSV → on hérite de la ligne existante
        // pour ne pas écraser silencieusement les "coup de coeur" pilotés via
        // l'UI admin. À l'INSERT, défaut false.
        mis_en_avant: existingForSlug?.mis_en_avant ?? false,
        ordre: parseIntOrNull(row.ordre),
        mois_debut: parseInt12(row.mois_debut),
        mois_fin: parseInt12(row.mois_fin),
        image_url: row.image_url || null,
        options,
      });

      // Résolution catégorie : crée auto si inconnue, mention dans le rapport
      const existingCat = await findCategorieByNom(input.categorie);
      const cat = existingCat ?? await findOrCreateCategorieByNom(input.categorie);
      const catCreatedNote = existingCat ? '' : `Catégorie « ${cat.nom} » créée auto. `;
      const enriched = { ...input, categorie: cat.nom, categorie_id: cat.id };

      // Si row.slug était vide, normalizeProduitInput a généré un slug auto.
      // On re-checke contre la map au cas où ça matcherait un produit existant.
      const existingFinal = existingForSlug ?? slugToExisting.get(input.slug!) ?? null;

      if (existingFinal) {
        if (isUnchanged(enriched as unknown as Record<string, unknown>, existingFinal)) {
          // No-op : aucun champ ne change. On évite l'UPDATE (qui ferait
          // bumper prix_updated_at via trigger et broadcaster un event
          // Realtime inutile à tous les clients).
          results.push({ ligne, nom, status: 'unchanged', message: catCreatedNote || undefined });
        } else {
          const { error } = await supabaseAdmin
            .from('produits')
            .update(enriched)
            .eq('id', existingFinal.id);
          if (error) throw new Error(error.message);
          results.push({ ligne, nom, status: 'updated', message: catCreatedNote || undefined });
        }
      } else {
        const { error } = await supabaseAdmin.from('produits').insert(enriched);
        if (error) {
          if (error.code === '23505') throw new Error('Slug déjà utilisé');
          throw new Error(error.message);
        }
        results.push({ ligne, nom, status: 'created', message: catCreatedNote || undefined });
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
    unchanged: results.filter((r) => r.status === 'unchanged').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return NextResponse.json({ results, summary, parseErrors });
}
