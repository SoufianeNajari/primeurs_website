'use client'

import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart, cartKey } from './CartContext';
import { triggerHaptic } from '@/lib/haptic';
import { formatPrixMontant, type Product, type ProduitOption } from '@/lib/produit';

type Variant = 'card' | 'detail';

/**
 * Sélecteur d'options de commande partagé (mobile-first, cibles ≥44px).
 * - 1 option : bouton "Ajouter" simple ; +/- si déjà présent.
 * - ≥2 options : rangées full-width empilées, chacune avec son propre état +/-.
 */
export default function OptionPicker({ product, variant = 'card' }: { product: Product; variant?: Variant }) {
  if (!product.disponible) {
    return (
      <div className={`w-full bg-neutral-100 text-neutral-500 text-center font-medium border border-neutral-200 uppercase tracking-widest text-[10px] ${variant === 'detail' ? 'py-4 text-[11px]' : 'py-3'}`}>
        {variant === 'detail' ? 'Actuellement indisponible' : 'Indisponible'}
      </div>
    );
  }

  const options = product.options || [];
  if (options.length === 0) return null;

  const single = options.length === 1;

  return (
    <div className={`flex flex-col ${variant === 'detail' ? 'gap-3' : 'gap-2'}`}>
      {!single && variant === 'detail' && (
        <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium">Choisissez votre option</div>
      )}
      {options.map((opt) => (
        <OptionRow key={opt.id} product={product} option={opt} variant={variant} single={single} />
      ))}
    </div>
  );
}

function OptionRow({ product, option, variant, single }: { product: Product; option: ProduitOption; variant: Variant; single: boolean }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const key = cartKey(product.id, option.id);
  const item = cart[key];
  const quantity = item?.quantite ?? 0;
  const prixLabel = formatPrixMontant(option.prix ?? null);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    addToCart({
      produitId: product.id,
      optionId: option.id,
      nom: product.nom,
      categorie: product.categorie,
      libelle: option.libelle,
      prix: option.prix ?? null,
      quantite: 1,
    });
  };

  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    updateQuantity(key, quantity + 1);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    if (quantity > 1) updateQuantity(key, quantity - 1);
    else removeFromCart(key);
  };

  const h = variant === 'detail' ? 'h-12' : 'h-11';
  const px = variant === 'detail' ? 'px-4' : 'px-3';
  const cardSingleTall = variant === 'card' && single;
  const rowH = cardSingleTall ? 'h-[96px]' : h;
  const btnCls = cardSingleTall ? 'w-11 h-11' : `${h} aspect-square`;

  if (quantity > 0) {
    if (cardSingleTall) {
      return (
        <div className="flex flex-col border border-green-primary bg-green-primary/5 h-[96px] overflow-hidden">
          <div className="flex-1 flex items-center justify-between px-3 text-[11px] min-w-0 border-b border-green-primary/20">
            <span className="font-medium text-neutral-800 truncate">{option.libelle}</span>
            {prixLabel && <span className="text-green-dark font-medium shrink-0 ml-2">{prixLabel}</span>}
          </div>
          <div className="flex-1 flex items-stretch">
            <button
              onClick={handleDec}
              aria-label={`Diminuer ${option.libelle}`}
              className="w-12 flex items-center justify-center text-green-dark hover:bg-green-primary/10 active:bg-green-primary/20 focus:outline-none border-r border-green-primary/20"
            >
              <Minus size={16} strokeWidth={2} />
            </button>
            <div className="flex-1 flex items-center justify-center text-green-dark font-semibold text-sm">
              {quantity}
            </div>
            <button
              onClick={handleInc}
              aria-label={`Augmenter ${option.libelle}`}
              className="w-12 flex items-center justify-center text-green-dark hover:bg-green-primary/10 active:bg-green-primary/20 focus:outline-none border-l border-green-primary/20"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex items-center border border-green-primary bg-green-primary/5 ${rowH}`}>
        <button
          onClick={handleDec}
          aria-label={`Diminuer ${option.libelle}`}
          className={`${btnCls} flex items-center justify-center text-green-dark hover:bg-green-primary/10 active:bg-green-primary/20 focus:outline-none`}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <div className={`flex-1 flex items-center justify-between ${px} text-sm min-w-0`}>
          <span className="font-medium text-neutral-800 truncate">
            {option.libelle}
            <span className="ml-2 text-green-dark font-semibold">· {quantity}</span>
          </span>
          {prixLabel && <span className="text-green-dark font-medium shrink-0 ml-2">{prixLabel}</span>}
        </div>
        <button
          onClick={handleInc}
          aria-label={`Augmenter ${option.libelle}`}
          className={`${btnCls} flex items-center justify-center text-green-dark hover:bg-green-primary/10 active:bg-green-primary/20 focus:outline-none`}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (single) {
    if (variant === 'card') {
      return (
        <button
          onClick={handleAdd}
          className="w-full h-[96px] border border-green-primary bg-transparent text-green-primary hover:bg-green-primary hover:text-white flex flex-col items-center justify-center gap-1.5 transition-colors px-3"
        >
          <span className="flex items-center gap-2 uppercase tracking-widest text-[11px] font-medium">
            <ShoppingBag size={14} strokeWidth={2} />
            Ajouter au panier
          </span>
          <span className="text-[11px] font-medium opacity-80 truncate max-w-full">
            {prixLabel || option.libelle}
          </span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAdd}
        className={`w-full ${h} border font-medium flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-[11px] bg-green-primary text-white border-green-primary hover:bg-green-dark`}
      >
        <ShoppingBag size={14} strokeWidth={2} />
        {prixLabel ? `Ajouter — ${prixLabel} ${option.libelle}` : `Ajouter — ${option.libelle}`}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full ${h} ${px} border border-neutral-300 bg-white flex items-center justify-between text-sm hover:border-green-primary hover:bg-green-primary/5 active:bg-green-primary/10 transition-colors min-w-0`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Plus size={16} strokeWidth={2} className="text-green-primary shrink-0" />
        <span className="font-medium text-neutral-800 truncate">{option.libelle}</span>
      </span>
      <span className="text-neutral-700 font-medium shrink-0 ml-2">{prixLabel || '—'}</span>
    </button>
  );
}
