'use client'

import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { Search, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';
import { isEnSaison, type Product } from '@/lib/produit';

type SortMode = 'pertinence' | 'prix-asc' | 'prix-desc' | 'alpha';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'prix-asc', label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'alpha', label: 'Alphabétique' },
];

function getMinPrice(p: Product): number | null {
  const prix = (p.options || [])
    .map((o) => (o.prix == null ? null : Number(o.prix)))
    .filter((x): x is number => x != null && !Number.isNaN(x));
  return prix.length === 0 ? null : Math.min(...prix);
}

function isLocal(p: Product): boolean {
  return Boolean(p.local);
}

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBio, setFilterBio] = useState(false);
  const [filterSaison, setFilterSaison] = useState(false);
  const [filterLocal, setFilterLocal] = useState(false);
  const [hideIndispos, setHideIndispos] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('pertinence');

  const categories = ['Tous', ...Array.from(new Set(products.map((p) => p.categorie)))];

  const activeFiltersCount = [filterBio, filterSaison, filterLocal, hideIndispos].filter(Boolean).length;
  const hasActive = activeFiltersCount > 0 || activeTab !== 'Tous' || searchQuery.length > 0 || sortMode !== 'pertinence';

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (activeTab !== 'Tous' && p.categorie !== activeTab) return false;
      if (q && !p.nom.toLowerCase().includes(q)) return false;
      if (filterBio && !p.bio) return false;
      if (filterSaison && !isEnSaison(p.mois_debut, p.mois_fin)) return false;
      if (filterLocal && !isLocal(p)) return false;
      if (hideIndispos && !p.disponible) return false;
      return true;
    });
  }, [products, activeTab, searchQuery, filterBio, filterSaison, filterLocal, hideIndispos]);

  const sorted = useMemo(() => {
    if (sortMode === 'pertinence') return filtered;
    const arr = [...filtered];
    if (sortMode === 'alpha') {
      arr.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    } else {
      // tri prix : produits sans prix relégués à la fin dans tous les cas
      arr.sort((a, b) => {
        const pa = getMinPrice(a);
        const pb = getMinPrice(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return sortMode === 'prix-asc' ? pa - pb : pb - pa;
      });
    }
    return arr;
  }, [filtered, sortMode]);

  const allUnavailable = sorted.length > 0 && sorted.every((p) => !p.disponible);

  const resetAll = () => {
    setActiveTab('Tous');
    setSearchQuery('');
    setFilterBio(false);
    setFilterSaison(false);
    setFilterLocal(false);
    setHideIndispos(false);
    setSortMode('pertinence');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:py-8">
      {/* Barre de recherche, onglets et filtres sticky */}
      <div className="sticky top-[80px] z-40 bg-neutral-50 pt-2 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" strokeWidth={1.5} />
          </div>
          <input
            type="text"
            placeholder="Rechercher un produit (ex: Fraises, Tomates...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary transition-colors text-sm font-serif placeholder:font-sans placeholder:text-neutral-400 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              aria-label="Effacer la recherche"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar border-b border-neutral-200 bg-neutral-50">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic();
                setActiveTab(cat);
              }}
              className={`whitespace-nowrap px-4 py-3 text-[11px] uppercase tracking-widest font-medium transition-colors focus:outline-none border-b-2 -mb-[2px] ${
                activeTab === cat ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filtres + tri */}
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill active={filterBio} onClick={() => setFilterBio((v) => !v)} label="Bio" />
            <FilterPill active={filterSaison} onClick={() => setFilterSaison((v) => !v)} label="De saison" />
            <FilterPill active={filterLocal} onClick={() => setFilterLocal((v) => !v)} label="Local" />
            <FilterPill active={hideIndispos} onClick={() => setHideIndispos((v) => !v)} label="Masquer indispos" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Trier</label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="text-xs bg-white border border-neutral-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary"
              aria-label="Trier les produits"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActive && (
          <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
            <span>
              {sorted.length} produit{sorted.length > 1 ? 's' : ''}
              {activeFiltersCount > 0 && (
                <span className="text-neutral-400"> · {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}</span>
              )}
            </span>
            <button
              onClick={resetAll}
              className="text-green-primary hover:text-green-dark uppercase tracking-widest text-[10px] font-medium"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Grille de produits */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 font-serif text-lg border border-neutral-200 bg-white">
          Aucun produit ne correspond à votre recherche.
        </div>
      ) : allUnavailable ? (
        <div className="text-center py-16 px-4 text-neutral-600 bg-neutral-50 border border-neutral-200">
          <p className="font-serif text-xl mb-2">Rupture de stock</p>
          <p className="text-sm">Aucun produit n&apos;est disponible pour le moment dans cette sélection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {sorted.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in-stagger"
              style={{ animationDelay: `${(index % 8) * 50}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className={`text-[11px] uppercase tracking-widest font-medium px-3 py-1.5 border transition-colors ${
        active
          ? 'border-green-primary text-green-primary bg-green-primary/5'
          : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 bg-white'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
