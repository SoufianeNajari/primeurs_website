import HeroSection from '@/components/HeroSection';
import CategoryCard from '@/components/CategoryCard';
import HowItWorks from '@/components/HowItWorks';
import SaisonSection from '@/components/SaisonSection';
import GoogleReviews from '@/components/GoogleReviews';
import VillesDesservies from '@/components/VillesDesservies';
import LivreurSection from '@/components/LivreurSection';
import ArrivageRungis from '@/components/ArrivageRungis';
import HomeFAQ from '@/components/HomeFAQ';
import { Sunrise, Leaf, ShieldCheck, Phone } from 'lucide-react';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Villes desservies (juste sous le hero pour répondre direct "tu livres chez moi ?") */}
      <VillesDesservies />

      {/* 2bis. Visage humain de la marque — incarne la promesse de proximité */}
      <LivreurSection />

      {/* 2ter. Ce matin à Rungis — alimenté par /admin/arrivages, masqué si rien à publier */}
      <ArrivageRungis />

      {/* 3. De saison en ce moment */}
      <SaisonSection />

      {/* 4. Section "Notre sélection" */}
      <section className="py-20 max-w-6xl mx-auto px-4 w-full">
        <h2 className="text-3xl md:text-4xl font-serif text-center text-neutral-800 mb-12">Notre sélection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <CategoryCard title="Fruits" imageSrc="/images/fruits.jpg" />
          <CategoryCard title="Légumes" imageSrc="/images/legumes.jpg" />
          <CategoryCard title="Fromages" imageSrc="/images/fromages.jpg" />
        </div>
      </section>

      {/* 5. Section "Comment ça marche" */}
      <HowItWorks />

      {/* 6. Section "Au plus près des producteurs" — story Rungis */}
      <section className="py-20 bg-white border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
              <Sunrise size={14} strokeWidth={1.5} /> Notre engagement fraîcheur
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-4">
              Au plus près des producteurs
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Chaque matin avant le lever du jour, nous parcourons les allées du marché de Rungis — premier
              marché de produits frais au monde — pour sélectionner les meilleurs fruits, légumes et fromages
              affinés. Livrés chez vous dans la foulée, sans intermédiaire superflu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 border border-neutral-200 p-8 text-center">
              <Sunrise size={28} className="text-green-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-serif text-lg text-neutral-800 mb-2">Sélection à 4h du matin</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Direct des grossistes de Rungis, avant que les produits ne partent dans les circuits classiques.
              </p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 p-8 text-center">
              <Leaf size={28} className="text-green-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-serif text-lg text-neutral-800 mb-2">Saison &amp; maturité</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Fruits cueillis à maturité, légumes du moment, fromages affinés à point. Pas de vitrine,
                pas de transport longue distance inutile.
              </p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 p-8 text-center">
              <ShieldCheck size={28} className="text-green-primary mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="font-serif text-lg text-neutral-800 mb-2">Garantie qualité</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Si un produit ne vous convient pas à la livraison, signalez-le au livreur :
                échange ou remboursement immédiat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Avis Google */}
      <GoogleReviews />

      {/* 7bis. FAQ — désamorce les freins avant le contact */}
      <HomeFAQ />

      {/* 8. Contact direct */}
      <section className="py-16 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-serif text-neutral-800 mb-3">Une question ?</h2>
          <p className="text-neutral-600 mb-6">
            Notre équipe répond directement, du mardi au samedi.
          </p>
          <a
            href={`tel:${SITE.telephone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-3 text-2xl font-serif text-green-primary hover:text-green-dark transition-colors"
          >
            <Phone size={24} strokeWidth={1.5} />
            {SITE.telephoneDisplay}
          </a>
        </div>
      </section>
    </main>
  );
}
