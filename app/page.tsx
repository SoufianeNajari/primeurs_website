import HeroSection from '@/components/HeroSection';
import CategoryCard from '@/components/CategoryCard';
import HowItWorks from '@/components/HowItWorks';
import { Clock, MapPin, Phone } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Section "Notre sélection" */}
      <section className="py-20 max-w-6xl mx-auto px-4 w-full">
        <h2 className="text-3xl md:text-4xl font-serif text-center text-neutral-800 mb-12">Notre sélection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <CategoryCard title="Fruits" imageSrc="/images/fruits.jpg" />
          <CategoryCard title="Légumes" imageSrc="/images/legumes.jpg" />
          <CategoryCard title="Fromages" imageSrc="/images/fromages.jpg" />
        </div>
      </section>

      {/* 3. Section "Comment ça marche" */}
      <HowItWorks />

      {/* 4. Section "Infos pratiques" */}
      <section className="py-20 bg-white border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif text-center text-neutral-800 mb-12">Infos pratiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Horaires */}
            <div className="bg-neutral-50 p-10 border border-neutral-200">
              <h3 className="text-2xl font-serif text-neutral-800 mb-6 flex items-center gap-3">
                <Clock className="text-green-primary" size={24} strokeWidth={1.5} />
                Horaires
              </h3>
              <ul className="space-y-4 text-neutral-600 font-medium">
                <li className="flex justify-between border-b border-neutral-200 pb-2"><span>Lundi</span> <span>Fermé</span></li>
                <li className="flex justify-between border-b border-neutral-200 pb-2"><span>Mardi - Vendredi</span> <span>8h00 - 19h30</span></li>
                <li className="flex justify-between border-b border-neutral-200 pb-2"><span>Samedi</span> <span>8h00 - 19h00</span></li>
                <li className="flex justify-between border-b border-neutral-200 pb-2"><span>Dimanche</span> <span>8h00 - 13h00</span></li>
              </ul>
            </div>
            
            {/* Contact & Accès */}
            <div className="bg-neutral-50 p-10 border border-neutral-200 flex flex-col gap-8">
              <div>
                <h3 className="text-2xl font-serif text-neutral-800 mb-4 flex items-center gap-3">
                  <MapPin className="text-green-primary" size={24} strokeWidth={1.5} />
                  Adresse
                </h3>
                <p className="text-neutral-600 leading-relaxed font-medium">
                  12 rue du Marché<br />
                  75000 Paris
                </p>
              </div>
              <div className="w-12 h-px bg-neutral-300"></div>
              <div>
                <h3 className="text-2xl font-serif text-neutral-800 mb-4 flex items-center gap-3">
                  <Phone className="text-green-primary" size={24} strokeWidth={1.5} />
                  Téléphone
                </h3>
                <p className="text-neutral-800 font-serif text-xl hover:text-green-primary transition-colors cursor-pointer">
                  01 23 45 67 89
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
