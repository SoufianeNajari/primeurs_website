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

  return [...staticRoutes, ...productRoutes];
}
