'use client'

import { useState } from 'react';
import ProductCard from './ProductCard';

type Product = {
  id: string;
  nom: string;
  categorie: string;
  disponible: boolean;
};

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState<string>('Tous');

  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.categorie)))];

  const filteredProducts = activeTab === 'Tous' 
    ? products 
    : products.filter(p => p.categorie === activeTab);

  const allUnavailable = filteredProducts.length > 0 && filteredProducts.every(p => !p.disponible);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Onglets (Tabs) */}
      <div className="flex overflow-x-auto gap-3 mb-10 pb-2 hide-scrollbar border-b border-neutral-200">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`whitespace-nowrap px-4 py-3 text-[11px] uppercase tracking-widest font-medium transition-colors focus:outline-none border-b-2 -mb-[2px] ${activeTab === cat ? 'border-green-primary text-green-primary' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille de produits */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 font-serif text-lg">Aucun produit dans cette catégorie.</div>
      ) : allUnavailable ? (
        <div className="text-center py-16 px-4 text-neutral-600 bg-neutral-50 border border-neutral-200">
          <p className="font-serif text-xl mb-2">Rupture de stock</p>
          <p className="text-sm">Aucun produit n&apos;est disponible pour le moment dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="animate-fade-in-stagger"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
