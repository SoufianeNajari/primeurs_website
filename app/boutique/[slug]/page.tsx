import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Leaf, MapPin, Refrigerator, CalendarRange, Sprout, Award } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { formatPrixResume, getProductTags, isEnSaison, type Product } from '@/lib/produit';
import { isCommandesBloquees } from '@/lib/parametres';
import BoutiqueFermee from '@/components/BoutiqueFermee';
import StickyCartButton from '@/components/StickyCartButton';
import ProductAddButton from '@/components/ProductAddButton';
import ProductGallery from '@/components/ProductGallery';
import ProductTags from '@/components/ProductTags';
import { SITE } from '@/lib/site';
import { formatArticleDate, type Article } from '@/lib/article';
import type { Metadata } from 'next';

export const revalidate = 3600;

async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('produits')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Product;
}

export async function generateStaticParams() {
  const { data, error } = await supabaseAdmin
    .from('produits')
    .select('slug')
    .not('slug', 'is', null);
  if (error) {
    console.warn('[fiche produit] generateStaticParams — migration slug non appliquée ?', error.message);
    return [];
  }
  return (data || []).filter((p) => p.slug).map((p) => ({ slug: p.slug as string }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Produit introuvable — Pontault Primeurs' };

  const prix = formatPrixResume(product.options);
  const description =
    product.description_longue?.slice(0, 160) ||
    product.description?.slice(0, 160) ||
    `${product.nom} ${prix ? `— ${prix}` : ''} — ${product.categorie} chez Pontault Primeurs.`;

  return {
    title: product.nom,
    description,
    alternates: { canonical: `/boutique/${product.slug}` },
    openGraph: {
      title: product.nom,
      description,
      url: `/boutique/${product.slug}`,
      images: product.image_url ? [{ url: product.image_url, alt: product.nom }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.nom,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

const MOIS_LABELS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function saisonLabel(debut: number, fin: number): string {
  return `de ${MOIS_LABELS[debut - 1]} à ${MOIS_LABELS[fin - 1]}`;
}

async function getRelatedArticles(slug: string): Promise<Article[]> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, slug, titre, extrait, image_url, published_at')
    .contains('produits_lies', [slug])
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(3);
  if (error) return [];
  return (data || []) as Article[];
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  if (await isCommandesBloquees()) {
    return <BoutiqueFermee />;
  }
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const relatedArticles = await getRelatedArticles(params.slug);

  const tags = getProductTags(product);
  const prix = formatPrixResume(product.options);
  const images = [product.image_url, ...(product.images || [])].filter((u): u is string => Boolean(u));
  const enSaison = isEnSaison(product.mois_debut, product.mois_fin);

  const productUrl = `${SITE.url}/boutique/${product.slug}`;
  const absImages = images.map((i) => (i.startsWith('http') ? i : `${SITE.url}${i}`));

  const optionsAvecPrix = (product.options || []).filter((o) => o.prix != null);
  const availability = product.disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  let offers: Record<string, unknown> | undefined;
  if (optionsAvecPrix.length === 1) {
    const o = optionsAvecPrix[0];
    offers = {
      '@type': 'Offer',
      url: productUrl,
      price: o.prix,
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: o.prix,
        priceCurrency: 'EUR',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: o.libelle },
      },
      availability,
      seller: { '@id': `${SITE.url}/#localbusiness` },
    };
  } else if (optionsAvecPrix.length > 1) {
    const prices = optionsAvecPrix.map((o) => Number(o.prix));
    offers = {
      '@type': 'AggregateOffer',
      url: productUrl,
      priceCurrency: 'EUR',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: optionsAvecPrix.length,
      availability,
      seller: { '@id': `${SITE.url}/#localbusiness` },
    };
  }

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    '@id': productUrl,
    url: productUrl,
    name: product.nom,
    category: product.categorie,
    description: product.description_longue || product.description || product.nom,
    image: absImages.length > 0 ? absImages : undefined,
    ...(product.origine && { countryOfOrigin: product.origine }),
    brand: { '@type': 'Brand', name: SITE.name },
    ...(offers && { offers }),
  };

  return (
    <main className="flex-grow pb-28 min-h-screen bg-neutral-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
        <Link
          href="/boutique"
          className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-green-primary transition-colors"
        >
          <ChevronLeft size={16} /> Retour à la boutique
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <ProductGallery images={images} alt={product.nom} />

        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-medium mb-2">
            {product.categorie}
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-3 leading-tight">{product.nom}</h1>

          {tags.length > 0 && (
            <div className="mb-4">
              <ProductTags tags={tags} variant="inline" />
            </div>
          )}

          {prix && <div className="text-2xl font-medium text-green-dark mb-6">{prix}</div>}

          {(product.description_longue || product.description) && (
            <p className="text-neutral-700 leading-relaxed mb-6 whitespace-pre-line">
              {product.description_longue || product.description}
            </p>
          )}

          <ul className="border-t border-neutral-200 divide-y divide-neutral-200 mb-6">
            {product.variete && (
              <li className="flex items-start gap-3 py-3">
                <Sprout size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Variété</div>
                  <div className="text-sm text-neutral-800">{product.variete}</div>
                </div>
              </li>
            )}
            {product.qualite && (
              <li className="flex items-start gap-3 py-3">
                <Award size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Qualité</div>
                  <div className="text-sm text-neutral-800">{product.qualite}</div>
                </div>
              </li>
            )}
            {product.origine && (
              <li className="flex items-start gap-3 py-3">
                <MapPin size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Origine</div>
                  <div className="text-sm text-neutral-800">{product.origine}</div>
                </div>
              </li>
            )}
            {product.mois_debut && product.mois_fin && (
              <li className="flex items-start gap-3 py-3">
                <CalendarRange size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Saison</div>
                  <div className="text-sm text-neutral-800">
                    {saisonLabel(product.mois_debut, product.mois_fin)}
                    {enSaison && <span className="ml-2 text-green-primary font-medium">· en ce moment</span>}
                  </div>
                </div>
              </li>
            )}
            {product.bio && (
              <li className="flex items-start gap-3 py-3">
                <Leaf size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Certification</div>
                  <div className="text-sm text-neutral-800">Issu de l&apos;agriculture biologique</div>
                </div>
              </li>
            )}
            {product.conseils_conservation && (
              <li className="flex items-start gap-3 py-3">
                <Refrigerator size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-neutral-500 mb-0.5">Conservation</div>
                  <div className="text-sm text-neutral-800 whitespace-pre-line">{product.conseils_conservation}</div>
                </div>
              </li>
            )}
          </ul>

          <ProductAddButton product={product} />
          <p className="text-xs text-neutral-500 mt-3 text-center">Le règlement s&apos;effectue en boutique lors du retrait.</p>
        </div>
      </div>

      {relatedArticles.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-20 pt-12 border-t border-neutral-200">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-6">
            Recettes &amp; conseils
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((a) => (
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
                      sizes="(min-width: 768px) 280px, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-neutral-100" aria-hidden />
                )}
                <div className="p-4 flex-grow flex flex-col">
                  <time className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
                    {a.published_at ? formatArticleDate(a.published_at) : ''}
                  </time>
                  <h3 className="font-serif text-neutral-900 text-base group-hover:text-green-primary transition-colors leading-snug">
                    {a.titre}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <StickyCartButton />
    </main>
  );
}
