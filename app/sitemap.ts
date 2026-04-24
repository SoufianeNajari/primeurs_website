import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/boutique`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/order`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cgv`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseAdmin
      .from('produits')
      .select('slug, created_at')
      .eq('disponible', true)
      .not('slug', 'is', null);

    productRoutes = (data || [])
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${base}/boutique/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    productRoutes = [];
  }

  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('slug, published_at, updated_at')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString());

    articleRoutes = (data || []).map((a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    articleRoutes = [];
  }

  return [...staticRoutes, ...productRoutes, ...articleRoutes];
}
