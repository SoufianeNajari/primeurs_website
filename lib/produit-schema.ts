import { z } from 'zod';
import { slugify } from './produit';

export const produitOptionSchema = z.object({
  id: z.string().min(1).max(64),
  libelle: z.string().min(1, 'Libellé requis').max(40),
  prix: z.coerce.number().min(0).max(9999).nullish(),
});

export const produitInputSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(120),
  categorie: z.string().min(1, 'Catégorie requise').max(60),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, - uniquement)').optional(),
  description: z.string().max(400).nullish(),
  description_longue: z.string().max(4000).nullish(),
  origine: z.string().max(200).nullish(),
  conseils_conservation: z.string().max(1000).nullish(),
  options: z.array(produitOptionSchema).min(1, 'Au moins une option de commande est requise').max(6),
  bio: z.coerce.boolean().optional(),
  local: z.coerce.boolean().optional(),
  variete: z.string().max(120).nullish(),
  qualite: z.string().max(60).nullish(),
  disponible: z.coerce.boolean().optional(),
  ordre: z.coerce.number().int().nullish(),
  mois_debut: z.coerce.number().int().min(1).max(12).nullish(),
  mois_fin: z.coerce.number().int().min(1).max(12).nullish(),
  image_url: z.string().url().nullish(),
  images: z.array(z.string().url()).optional(),
});

export type ProduitInput = z.infer<typeof produitInputSchema>;

export function normalizeProduitInput(raw: unknown): ProduitInput {
  const parsed = produitInputSchema.parse(raw);
  // Unicité des ids d'options
  const ids = new Set<string>();
  for (const o of parsed.options) {
    if (ids.has(o.id)) throw new z.ZodError([{ code: 'custom', path: ['options'], message: 'ID d\'option dupliqué' }]);
    ids.add(o.id);
  }
  return {
    ...parsed,
    slug: parsed.slug && parsed.slug.length > 0 ? parsed.slug : slugify(parsed.nom),
    bio: parsed.bio ?? false,
    local: parsed.local ?? false,
    variete: parsed.variete && parsed.variete.trim() !== '' ? parsed.variete.trim() : null,
    qualite: parsed.qualite && parsed.qualite.trim() !== '' ? parsed.qualite.trim() : null,
    disponible: parsed.disponible ?? true,
    options: parsed.options.map((o) => ({
      id: o.id,
      libelle: o.libelle.trim(),
      prix: o.prix == null ? null : Number(o.prix),
    })),
  };
}
