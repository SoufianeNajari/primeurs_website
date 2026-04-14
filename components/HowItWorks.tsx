import { ShoppingCart, Calendar, MapPin } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: "Choisissez vos produits",
      icon: <ShoppingCart size={40} className="text-[#1D9E75]" />,
    },
    {
      id: 2,
      title: "Indiquez votre jour de retrait",
      icon: <Calendar size={40} className="text-[#1D9E75]" />,
    },
    {
      id: 3,
      title: "Venez récupérer en magasin",
      icon: <MapPin size={40} className="text-[#1D9E75]" />,
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Comment commander ?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {/* Decorative horizontal line on desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gray-200 z-0"></div>
          
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-6">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-800 max-w-[200px] leading-tight">
                {step.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
