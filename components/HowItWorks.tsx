import { ShoppingBag, Calendar, Store } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: "Sélectionnez vos produits",
      icon: <ShoppingBag size={28} className="text-green-primary" strokeWidth={1.5} />,
    },
    {
      id: 2,
      title: "Choisissez un jour de retrait",
      icon: <Calendar size={28} className="text-green-primary" strokeWidth={1.5} />,
    },
    {
      id: 3,
      title: "Récupérez en boutique",
      icon: <Store size={28} className="text-green-primary" strokeWidth={1.5} />,
    }
  ];

  return (
    <section className="py-20 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-serif text-center text-neutral-800 mb-16">Le fonctionnement</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-4 relative">
          {/* Decorative horizontal line on desktop */}
          <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-px bg-neutral-200 z-0"></div>
          
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-neutral-50 w-16 h-16 flex items-center justify-center border border-neutral-300 mb-6">
                {step.icon}
              </div>
              <h3 className="text-lg font-serif text-neutral-800 max-w-[200px] leading-snug">
                {step.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
