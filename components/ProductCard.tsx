'use client'

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { formatPrixResume, getProductTags, type Product } from '@/lib/produit';
import ProductTags from './ProductTags';
import OptionPicker from './OptionPicker';

export default function ProductCard({ product }: { product: Product }) {
  const tags = getProductTags(product);
  const prixResume = formatPrixResume(product.options);
  const href = product.slug ? `/boutique/${product.slug}` : null;
  const hasMultipleOptions = (product.options?.length ?? 0) > 1;

  const imageBlock = (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.nom}
          fill
          sizes="(max-width: 400px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-300">
          <ShoppingBag size={40} strokeWidth={1} />
        </div>
      )}
      {tags.length > 0 && (
        <div className="absolute left-2 top-2">
          <ProductTags tags={tags} variant="overlay" />
        </div>
      )}
      {!product.disponible && (
        <>
          <div className="absolute inset-0 bg-white/40 pointer-events-none" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 bg-neutral-900/85 text-white text-center py-2 text-[11px] uppercase tracking-widest font-medium">
            Indisponible
          </div>
        </>
      )}
    </div>
  );

  const info = (
    <div className="flex flex-col flex-1 p-5">
      <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-medium mb-1">
        {product.categorie}
      </div>
      <h3 className="text-xl font-serif text-neutral-800 leading-snug mb-2">
        {product.nom}
      </h3>
      {prixResume && (
        <div className="text-sm font-medium text-green-dark mb-3">{prixResume}</div>
      )}
      {product.origine && (
        <div className="text-xs text-neutral-500 mb-4">Origine&nbsp;: {product.origine}</div>
      )}

      <div className="mt-auto">
        <OptionPicker product={product} variant="card" />
        {hasMultipleOptions && product.disponible && (
          <p className="mt-2 text-[10px] uppercase tracking-widest text-neutral-400">
            Choisissez votre option
          </p>
        )}
      </div>
    </div>
  );

  const cardClasses = `bg-white border border-neutral-200 flex flex-col h-full overflow-hidden transition-colors ${
    !product.disponible ? 'bg-neutral-50 cursor-not-allowed [&_h3]:text-neutral-500 [&_.text-green-dark]:text-neutral-400' : 'hover:border-green-primary'
  }`;

  if (href && product.disponible) {
    return (
      <Link href={href} className={cardClasses} aria-label={`Voir la fiche de ${product.nom}`}>
        {imageBlock}
        {info}
      </Link>
    );
  }

  return (
    <div className={cardClasses}>
      {imageBlock}
      {info}
    </div>
  );
}
