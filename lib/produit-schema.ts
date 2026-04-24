import { z } from 'zod';
import { slugify } from './produit';

export const produitInputSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(120),
  categorie: z.string().min(1, 'Catégorie requise').max(60),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, - uniquement)').optional(),
  description: z.string().max(400).nullish(),
  description_longue: z.string().max(4000).nullish(),
  origine: z.string().max(200).nullish(),
  conseils_conservation: z.string().max(1000).nullish(),
  prix_kg: z.coerce.number().min(0).max(9999).nullish(),
  unite: z.string().max(20).nullish(),
  bio: z.coerce.boolean().optional(),
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
  return {
    ...parsed,
    slug: parsed.slug && parsed.slug.length > 0 ? parsed.slug : slugify(parsed.nom),
    unite: parsed.unite || 'kg',
    bio: parsed.bio ?? false,
    disponible: parsed.disponible ?? true,
  };
}
