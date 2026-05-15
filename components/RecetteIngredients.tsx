'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, ShoppingBasket } from 'lucide-react';
import { useCart } from '@/components/CartContext';
import type { ProduitOption } from '@/lib/produit';

export type IngredientLigne = {
  produit: {
    id: string;
    nom: string;
    categorie: string;
    slug: string | null;
    image_url: string | null;
    disponible: boolean;
    masque_boutique: boolean | null;
    options: ProduitOption[] | null;
  };
  quantite_kg_4pers: number;
};

const PORTIONS = [1, 2, 4, 6] as const;
type Portion = (typeof PORTIONS)[number];
const PAS_KG = 0.25;

// Arrondi au 0,25 kg supérieur, plancher à 0,25 kg.
function roundUpQuarter(kg: number): number {
  const v = Math.ceil(kg / PAS_KG) * PAS_KG;
  return Math.max(PAS_KG, Math.round(v * 100) / 100);
}

function formatKg(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)} g`;
  }
  const txt = kg % 1 === 0 ? `${kg}` : kg.toFixed(2).replace(/0$/, '').replace('.', ',');
  return `${txt} kg`;
}

function formatPrix(p: number): string {
  return `${p.toFixed(2).replace('.', ',')} €`;
}

function pickOptionKg(options: ProduitOption[] | null | undefined): ProduitOption | null {
  if (!options) return null;
  return options.find((o) => /\bkg\b|kilo/i.test(o.libelle)) ?? null;
}

type LigneCalculee = {
  produitId: string;
  produitNom: string;
  produitCategorie: string;
  produitSlug: string | null;
  produitImage: string | null;
  optionKg: ProduitOption | null;
  qteKg: number;
  prixLigne: number | null;
  // Indispo possibles : produit retiré (disponible=false), masqué, sans option kg, ou option kg sans prix.
  indispoRaison: 'rupture' | 'sans-option-kg' | 'sans-prix' | null;
};

export default function RecetteIngredients({ lignes }: { lignes: IngredientLigne[] }) {
  const { cart, addToCart, setIsCartOpen } = useCart();
  const [portions, setPortions] = useState<Portion>(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);

  // La barre sticky mobile apparaît dès que le bloc principal est sorti du viewport vers le haut.
  useEffect(() => {
    const sentinel = document.getElementById('recette-ingredients-anchor');
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Sticky visible quand le bloc d'ingrédients n'est plus visible
        // ET qu'on a scrollé en dessous (boundingClientRect.top < 0).
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: '0px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const ratio = portions / 4;

  const calcs: LigneCalculee[] = useMemo(() => {
    return lignes.map((l) => {
      const p = l.produit;
      const optionKg = pickOptionKg(p.options);
      const qteKg = roundUpQuarter(l.quantite_kg_4pers * ratio);
      const indispoRaison: LigneCalculee['indispoRaison'] = !p.disponible || p.masque_boutique
        ? 'rupture'
        : !optionKg
        ? 'sans-option-kg'
        : optionKg.prix == null
        ? 'sans-prix'
        : null;
      const prixLigne = optionKg?.prix != null ? Number(optionKg.prix) * qteKg : null;
      return {
        produitId: p.id,
        produitNom: p.nom,
        produitCategorie: p.categorie,
        produitSlug: p.slug,
        produitImage: p.image_url,
        optionKg,
        qteKg,
        prixLigne,
        indispoRaison,
      };
    });
  }, [lignes, ratio]);

  const dispo = calcs.filter((c) => c.indispoRaison === null);
  const totalEstime = dispo.reduce((s, c) => s + (c.prixLigne ?? 0), 0);

  function dejaDansLePanier(c: LigneCalculee): boolean {
    if (!c.optionKg) return false;
    return Boolean(cart[`${c.produitId}:${c.optionKg.id}`]);
  }

  function handleAdd() {
    let added = 0;
    for (const c of dispo) {
      if (!c.optionKg) continue;
      addToCart({
        produitId: c.produitId,
        optionId: c.optionKg.id,
        nom: c.produitNom,
        categorie: c.produitCategorie,
        libelle: c.optionKg.libelle,
        prix: c.optionKg.prix ?? null,
        quantite: c.qteKg,
      });
      added++;
    }
    if (added > 0) {
      setFeedback(`${added} ingrédient${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au panier`);
      setTimeout(() => setFeedback(null), 3500);
    }
  }

  if (lignes.length === 0) return null;

  const nbDispo = dispo.length;
  const nbTotal = lignes.length;

  return (
    <>
      <section
        aria-labelledby="recette-ingredients-titre"
        className="mb-12 border border-neutral-200 bg-white"
      >
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-4 flex-wrap">
          <h2
            id="recette-ingredients-titre"
            className="text-xs uppercase tracking-widest text-neutral-500 font-medium"
          >
            Ingrédients
          </h2>
          <div
            className="flex items-center gap-1 bg-neutral-100 p-1"
            role="radiogroup"
            aria-label="Nombre de personnes"
          >
            {PORTIONS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={portions === p}
                onClick={() => setPortions(p)}
                className={`min-w-[36px] h-8 px-2 text-sm font-medium tracking-wide transition-colors ${
                  portions === p
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-xs text-neutral-500 px-2">pers.</span>
          </div>
        </div>

        <ul className="divide-y divide-neutral-100">
          {calcs.map((c) => {
            const indispo = c.indispoRaison !== null;
            const inCart = dejaDansLePanier(c);
            return (
              <li
                key={c.produitId}
                className={`flex items-center gap-3 px-5 py-3 ${indispo ? 'opacity-60' : ''}`}
              >
                <div className="relative w-12 h-12 bg-neutral-100 shrink-0 overflow-hidden">
                  {c.produitImage ? (
                    <Image src={c.produitImage} alt="" fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-neutral-900 text-sm truncate">{c.produitNom}</div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{formatKg(c.qteKg)}</span>
                    {c.prixLigne != null && (
                      <>
                        <span className="text-neutral-300">·</span>
                        <span>{formatPrix(c.prixLigne)}</span>
                      </>
                    )}
                    {indispo && (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">
                        {c.indispoRaison === 'rupture' ? 'Rupture' : 'Non disponible'}
                      </span>
                    )}
                    {inCart && !indispo && (
                      <span className="text-green-700 inline-flex items-center gap-1">
                        <Check size={12} strokeWidth={2} /> au panier
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-neutral-500">
            {nbDispo} sur {nbTotal} ingrédient{nbTotal > 1 ? 's' : ''} disponible{nbDispo > 1 ? 's' : ''}
            {totalEstime > 0 && (
              <span className="text-neutral-700 font-medium ml-2">
                · estimé {formatPrix(totalEstime)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={nbDispo === 0}
            className="inline-flex items-center gap-2 bg-green-primary text-white px-5 py-3 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <ShoppingBasket size={16} strokeWidth={1.5} />
            Ajouter au panier
          </button>
        </div>

        {feedback && (
          <div className="px-5 py-2 text-xs text-green-800 bg-green-soft/40 border-t border-green-primary/30 flex items-center justify-between gap-3">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="underline underline-offset-2 hover:text-green-dark"
            >
              Voir le panier
            </button>
          </div>
        )}
      </section>

      <div id="recette-ingredients-anchor" aria-hidden="true" />

      {/* Barre sticky bas mobile, visible une fois le bloc principal scrollé. */}
      <div
        className={`md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white border-t border-neutral-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-transform duration-200 ${
          stuck ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!stuck}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">
              Recette · {portions} pers.
            </div>
            <div className="text-sm text-neutral-800">
              {nbDispo} ingrédient{nbDispo > 1 ? 's' : ''}
              {totalEstime > 0 && <span className="text-neutral-500"> · {formatPrix(totalEstime)}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={nbDispo === 0}
            className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2.5 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark disabled:opacity-40 min-h-[44px]"
          >
            <ShoppingBasket size={16} strokeWidth={1.5} />
            Ajouter
          </button>
        </div>
      </div>
    </>
  );
}
