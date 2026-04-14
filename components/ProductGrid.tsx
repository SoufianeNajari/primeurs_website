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
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Onglets (Tabs) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 ${activeTab === cat ? 'bg-green-primary text-white shadow-md' : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille de produits */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 font-medium">Aucun produit dans cette catégorie.</div>
      ) : allUnavailable ? (
        <div className="text-center py-12 px-4 text-neutral-700 bg-neutral-100 rounded-xl border border-neutral-200 shadow-inner">
          <p className="font-semibold text-lg mb-1">C&apos;est la rupture de stock !</p>
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
