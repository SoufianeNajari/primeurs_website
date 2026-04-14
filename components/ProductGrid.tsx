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

  // Extraire les catégories uniques pour les onglets
  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.categorie)))];

  // Filtrer les produits selon l'onglet
  const filteredProducts = activeTab === 'Tous' 
    ? products 
    : products.filter(p => p.categorie === activeTab);

  // Vérifier si absolument tous les produits affichés sont indisponibles
  const allUnavailable = filteredProducts.length > 0 && filteredProducts.every(p => !p.disponible);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Onglets (Tabs) */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${activeTab === cat ? 'bg-[#1D9E75] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille de produits */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-500 font-medium">Aucun produit dans cette catégorie.</div>
      ) : allUnavailable ? (
        <div className="text-center py-12 px-4 text-gray-600 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
          <p className="font-medium text-lg mb-1">C'est la rupture de stock !</p>
          <p className="text-sm">Aucun produit n'est disponible pour le moment dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
