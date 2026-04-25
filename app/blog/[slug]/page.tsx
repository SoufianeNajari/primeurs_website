import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabaseAdmin } from '@/lib/supabase';
import { SITE, absoluteUrl } from '@/lib/site';
import { formatArticleDate, isPublished, type Article } from '@/lib/article';

export const dynamic = 'force-dynamic';

async function getArticle(slug: string): Promise<Article | null> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[blog/slug] fetch', error);
    return null;
  }
  return data as Article | null;
}

import { formatPrixResume, type ProduitOption } from '@/lib/produit';

type LinkedProduit = {
  slug: string;
  nom: string;
  image_url: string | null;
  options: ProduitOption[] | null;
  categorie: string;
};

async function getLinkedProduits(slugs: string[]): Promise<LinkedProduit[]> {
  if (!slugs.length) return [];
  const { data } = await supabaseAdmin
    .from('produits')
    .select('slug, nom, image_url, options, categorie')
    .in('slug', slugs)
    .eq('disponible', true);
  return (data || []) as LinkedProduit[];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article || !isPublished(article)) {
    return { title: 'Article introuvable', robots: { index: false, follow: false } };
  }
  const ogImage = article.image_url || undefined;
  return {
    title: article.titre,
    description: article.extrait || undefined,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.titre,
      description: article.extrait || undefined,
      url: `${SITE.url}/blog/${article.slug}`,
      publishedTime: article.published_at || undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);
  if (!article || !isPublished(article)) notFound();

  const linked = await getLinkedProduits(article.produits_lies || []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.titre,
    description: article.extrait || undefined,
    image: article.image_url ? [article.image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png') },
    },
    mainEntityOfPage: `${SITE.url}/blog/${article.slug}`,
  };

  return (
    <main className="flex-grow bg-neutral-50 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4">
        <nav className="mb-8 text-sm">
          <Link
            href="/blog"
            className="text-neutral-500 hover:text-green-primary transition-colors"
          >
            ← Tous les articles
          </Link>
        </nav>

        <header className="mb-10">
          <time className="block text-xs uppercase tracking-widest text-neutral-500 mb-4">
            {article.published_at ? formatArticleDate(article.published_at) : ''}
          </time>
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 tracking-tight leading-[1.15] mb-6">
            {article.titre}
          </h1>
          {article.extrait && (
            <p className="text-lg text-neutral-600 leading-relaxed">{article.extrait}</p>
          )}
        </header>

        {article.image_url && (
          <div className="relative aspect-[16/9] mb-12 overflow-hidden bg-neutral-100">
            <Image
              src={article.image_url}
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="prose-legal text-neutral-800 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.contenu_md}</ReactMarkdown>
        </div>

        {linked.length > 0 && (
          <section className="mt-16 pt-10 border-t border-neutral-200">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-6">
              Produits associés
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {linked.map((p) => (
                <Link
                  key={p.slug}
                  href={`/boutique/${p.slug}`}
                  className="group bg-white border border-neutral-200 hover:border-green-primary transition-colors"
                >
                  {p.image_url && (
                    <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                      <Image
                        src={p.image_url}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 200px, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-serif text-neutral-900 text-sm group-hover:text-green-primary transition-colors">
                      {p.nom}
                    </p>
                    {formatPrixResume(p.options) && (
                      <p className="text-xs text-neutral-500 mt-1">{formatPrixResume(p.options)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
