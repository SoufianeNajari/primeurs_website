import { ShoppingBag, Truck, Home } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: 'Choisissez vos produits',
      desc: 'Composez votre panier dans la boutique, minimum 30 €.',
      icon: <ShoppingBag size={28} className="text-green-primary" strokeWidth={1.5} />,
    },
    {
      id: 2,
      title: 'Choisissez votre créneau',
      desc: 'Mardi ou vendredi après-midi (créneaux de 2 h, 15h-21h), jusqu\'à la veille 18h.',
      icon: <Truck size={28} className="text-green-primary" strokeWidth={1.5} />,
    },
    {
      id: 3,
      title: 'On vous livre à domicile',
      desc: 'Paiement à la réception, en CB ou en espèces.',
      icon: <Home size={28} className="text-green-primary" strokeWidth={1.5} />,
    }
  ];

  return (
    <section className="py-20 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-serif text-center text-neutral-800 mb-4">Comment ça marche</h2>
        <p className="text-center text-neutral-500 mb-16 max-w-xl mx-auto">
          Du marché de Rungis à votre porte, en trois étapes simples.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-4 relative">
          {/* Decorative horizontal line on desktop */}
          <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-px bg-neutral-200 z-0"></div>

          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-neutral-50 w-16 h-16 flex items-center justify-center border border-neutral-300 mb-6">
                {step.icon}
              </div>
              <h3 className="text-lg font-serif text-neutral-800 max-w-[220px] leading-snug mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-neutral-500 max-w-[240px] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
