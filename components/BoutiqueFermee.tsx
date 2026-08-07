import Link from 'next/link';
import { Truck, Gift, Phone, MessageCircle } from 'lucide-react';
import { SITE } from '@/lib/site';

export default function BoutiqueFermee() {
  return (
    <main className="flex-grow min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white border border-neutral-200 p-8 md:p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200 mb-6">
          <Truck size={24} className="text-amber-700" strokeWidth={1.75} />
        </div>

        <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">
          Boutique en pause
        </p>
        <h1 className="text-2xl md:text-3xl font-serif text-neutral-800 mb-3">
          🚚 Réouverture le 25 août
        </h1>
        <p className="text-neutral-600 mb-8 leading-relaxed">
          Les commandes en ligne sont mises en pause le temps de nos congés.
          On se retrouve très vite, avec les meilleurs produits de Rungis.
        </p>

        <div className="border border-green-primary/30 bg-green-50/60 p-6 mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-green-primary/30 mb-4">
            <Gift size={20} className="text-green-primary" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-serif text-neutral-800 mb-2">🎁 Offre de rentrée</h2>
          <p className="text-neutral-700 text-lg font-medium">
            10 € offerts dès 50 € d&apos;achat 🎉
          </p>
          <p className="text-[11px] uppercase tracking-widest text-neutral-500 mt-3">
            Code <span className="text-green-dark font-medium">RENTREE10</span>
          </p>
        </div>

        <div className="border-t border-neutral-200 pt-6 space-y-4 text-left">
          <div className="flex items-start gap-3">
            <Phone size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-0.5">Téléphone</div>
              <a href={`tel:${SITE.telephone}`} className="text-neutral-800 hover:text-green-primary">
                {SITE.telephoneDisplay}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-0.5">WhatsApp</div>
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-800 hover:text-green-primary"
              >
                {SITE.whatsappDisplay}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-200">
          <Link
            href="/"
            className="inline-block text-[11px] uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
