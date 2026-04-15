'use client'

import { useState } from 'react';
import ProductCard from './ProductCard';
import { Search } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.categorie)))];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeTab === 'Tous' || p.categorie === activeTab;
    const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const allUnavailable = filteredProducts.length > 0 && filteredProducts.every(p => !p.disponible);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:py-8">
      {/* Barre de recherche et Onglets Sticky */}
      <div className="sticky top-[80px] z-50 bg-neutral-50 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" strokeWidth={1.5} />
          </div>
          <input
            type="text"
            placeholder="Rechercher un produit (ex: Fraises, Tomates...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary transition-colors text-sm font-serif placeholder:font-sans placeholder:text-neutral-400 shadow-sm"
          />
        </div>

        <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar border-b border-neutral-200 bg-neutral-50">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic();
                setActiveTab(cat);
              }}
              className={`whitespace-nowrap px-4 py-3 text-[11px] uppercase tracking-widest font-medium transition-colors focus:outline-none border-b-2 -mb-[2px] ${activeTab === cat ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de produits */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 font-serif text-lg border border-neutral-200 bg-white">Aucun produit ne correspond à votre recherche.</div>
      ) : allUnavailable ? (
        <div className="text-center py-16 px-4 text-neutral-600 bg-neutral-50 border border-neutral-200">
          <p className="font-serif text-xl mb-2">Rupture de stock</p>
          <p className="text-sm">Aucun produit n&apos;est disponible pour le moment dans cette sélection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product, index) => (
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
