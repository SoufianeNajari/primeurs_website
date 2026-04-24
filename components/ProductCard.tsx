'use client'

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from './CartContext';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';
import { formatPrix, getProductTags, type Product } from '@/lib/produit';
import ProductTags from './ProductTags';

export default function ProductCard({ product }: { product: Product }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = cart[product.id];
  const quantity = cartItem ? cartItem.quantite : 0;
  const tags = getProductTags(product);
  const prixFormate = formatPrix(product.prix_kg, product.unite);
  const href = product.slug ? `/boutique/${product.slug}` : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic();
    addToCart(product.id, product.nom, product.categorie, 1, { prix_kg: product.prix_kg, unite: product.unite });
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (quantity > 1) updateQuantity(product.id, quantity - 1);
    else removeFromCart(product.id);
  };

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
      {prixFormate && (
        <div className="text-sm font-medium text-green-dark mb-4">{prixFormate}</div>
      )}
      {product.origine && (
        <div className="text-xs text-neutral-500 mb-4">Origine&nbsp;: {product.origine}</div>
      )}

      <div className="mt-auto">
        {!product.disponible ? (
          <div className="w-full bg-neutral-100 text-neutral-500 py-3 text-center font-medium border border-neutral-200 uppercase tracking-widest text-[10px]">
            Indisponible
          </div>
        ) : quantity > 0 ? (
          <div className="flex items-center justify-between border border-neutral-300 p-1">
            <button
              onClick={handleDecrease}
              aria-label={`Diminuer la quantité de ${product.nom}`}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none active:bg-neutral-200"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <span className="font-medium text-neutral-800 text-sm w-8 text-center">{quantity}</span>
            <button
              onClick={handleIncrease}
              aria-label={`Augmenter la quantité de ${product.nom}`}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none active:bg-neutral-200"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="w-full bg-transparent text-green-primary border border-green-primary py-3 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-green-primary hover:text-white focus:outline-none active:bg-green-dark uppercase tracking-widest text-[11px]"
          >
            <ShoppingBag size={14} strokeWidth={2} />
            Ajouter au panier
          </button>
        )}
      </div>
    </div>
  );

  const cardClasses = `bg-white border border-neutral-200 flex flex-col h-full overflow-hidden transition-colors ${
    !product.disponible ? 'opacity-50 bg-neutral-50 cursor-not-allowed' : 'hover:border-green-primary'
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
