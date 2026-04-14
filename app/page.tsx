import HeroSection from '@/components/HeroSection';
import CategoryCard from '@/components/CategoryCard';
import HowItWorks from '@/components/HowItWorks';

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Section "Notre sélection" */}
      <section className="py-16 max-w-6xl mx-auto px-4 w-full">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Notre sélection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <CategoryCard title="Fruits" imageSrc="/images/fruits.jpg" />
          <CategoryCard title="Légumes" imageSrc="/images/legumes.jpg" />
          <CategoryCard title="Fromages" imageSrc="/images/fromages.jpg" />
        </div>
      </section>

      {/* 3. Section "Comment ça marche" */}
      <HowItWorks />

      {/* 4. Section "Infos pratiques" */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Infos pratiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Horaires */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🕒 Horaires
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex justify-between"><span>Lundi</span> <span>Fermé (TODO)</span></li>
                <li className="flex justify-between"><span>Mardi - Vendredi</span> <span>8h - 19h (TODO)</span></li>
                <li className="flex justify-between"><span>Samedi</span> <span>8h - 19h (TODO)</span></li>
                <li className="flex justify-between"><span>Dimanche</span> <span>8h - 13h (TODO)</span></li>
              </ul>
            </div>
            
            {/* Contact & Accès */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  📍 Adresse
                </h3>
                <p className="text-gray-600">
                  TODO — 12 rue du Marché<br />
                  75000 Paris
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  📞 Téléphone
                </h3>
                <p className="text-[#1D9E75] font-semibold text-lg hover:underline cursor-pointer">
                  TODO — 01 XX XX XX XX
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
