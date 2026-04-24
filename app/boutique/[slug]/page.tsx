import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Leaf, MapPin, Refrigerator, CalendarRange } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { formatPrix, getProductTags, isEnSaison, type Product } from '@/lib/produit';
import StickyCartButton from '@/components/StickyCartButton';
import ProductAddButton from '@/components/ProductAddButton';
import ProductGallery from '@/components/ProductGallery';
import ProductTags from '@/components/ProductTags';
import { SITE } from '@/lib/site';
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

  const prix = formatPrix(product.prix_kg, product.unite);
  const description =
    product.description_longue?.slice(0, 160) ||
    product.description?.slice(0, 160) ||
    `${product.nom} ${prix ? `à ${prix}` : ''} — ${product.categorie} chez Pontault Primeurs.`;

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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const tags = getProductTags(product);
  const prix = formatPrix(product.prix_kg, product.unite);
  const images = [product.image_url, ...(product.images || [])].filter((u): u is string => Boolean(u));
  const enSaison = isEnSaison(product.mois_debut, product.mois_fin);

  const productUrl = `${SITE.url}/boutique/${product.slug}`;
  const absImages = images.map((i) => (i.startsWith('http') ? i : `${SITE.url}${i}`));

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
    ...(product.prix_kg != null && {
      offers: {
        '@type': 'Offer',
        url: productUrl,
        price: product.prix_kg,
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: product.prix_kg,
          priceCurrency: 'EUR',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: product.unite || 'kg' },
        },
        availability: product.disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@id': `${SITE.url}/#localbusiness` },
      },
    }),
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

      <StickyCartButton />
    </main>
  );
}
