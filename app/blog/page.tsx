import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseAdmin } from '@/lib/supabase';
import { SITE } from '@/lib/site';
import { formatArticleDate, type Article } from '@/lib/article';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Recettes & conseils',
  description: `Recettes de saison, conseils de conservation et idées d'accords autour des fruits, légumes et fromages de ${SITE.name}.`,
  alternates: { canonical: '/blog' },
  openGraph: {
    title: `Recettes & conseils — ${SITE.name}`,
    description: `Recettes de saison et conseils autour des produits frais.`,
    url: `${SITE.url}/blog`,
    type: 'website',
  },
};

async function getPublishedArticles(): Promise<Article[]> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (error) {
    console.error('[blog] fetch articles', error);
    return [];
  }
  return (data || []) as Article[];
}

export default async function BlogPage() {
  const articles = await getPublishedArticles();

  return (
    <main className="flex-grow bg-neutral-50 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-green-primary font-medium mb-4">
            Journal
          </p>
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 tracking-tight mb-4">
            Recettes &amp; conseils
          </h1>
          <p className="text-neutral-600 text-lg leading-relaxed">
            Idées de saison, accords, conservation — à glaner entre deux paniers.
          </p>
        </header>

        {articles.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 italic">
            Les premiers articles arrivent bientôt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/blog/${a.slug}`}
                className="group bg-white border border-neutral-200 hover:border-green-primary transition-colors flex flex-col"
              >
                {a.image_url ? (
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                    <Image
                      src={a.image_url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-neutral-100" aria-hidden />
                )}
                <div className="p-6 flex-grow flex flex-col">
                  <time className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
                    {a.published_at ? formatArticleDate(a.published_at) : ''}
                  </time>
                  <h2 className="text-xl font-serif text-neutral-900 mb-3 tracking-tight group-hover:text-green-primary transition-colors">
                    {a.titre}
                  </h2>
                  {a.extrait && (
                    <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">
                      {a.extrait}
                    </p>
                  )}
                  <span className="mt-4 text-xs uppercase tracking-widest text-green-primary font-medium">
                    Lire la recette →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
