import { z } from 'zod';
import { slugify } from './produit';

export type Article = {
  id: string;
  slug: string;
  titre: string;
  extrait: string | null;
  contenu_md: string;
  image_url: string | null;
  produits_lies: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const articleInputSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, - uniquement)')
    .optional(),
  extrait: z.string().max(400).nullish(),
  contenu_md: z.string().max(50000).default(''),
  image_url: z.string().url().nullish(),
  produits_lies: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20).optional(),
  published_at: z
    .union([z.string().datetime({ offset: true }), z.string().length(0), z.null()])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export function normalizeArticleInput(raw: unknown): Omit<ArticleInput, 'slug'> & { slug: string } {
  const parsed = articleInputSchema.parse(raw);
  return {
    ...parsed,
    slug: parsed.slug && parsed.slug.length > 0 ? parsed.slug : slugify(parsed.titre),
    produits_lies: parsed.produits_lies ?? [],
  };
}

export function isPublished(article: Pick<Article, 'published_at'>, now = new Date()): boolean {
  if (!article.published_at) return false;
  return new Date(article.published_at).getTime() <= now.getTime();
}

export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
