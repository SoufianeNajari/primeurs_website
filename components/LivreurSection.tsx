import Link from 'next/link';
import { MessageCircle, ArrowRight, Sunrise, Truck, Wallet } from 'lucide-react';
import { SITE } from '@/lib/site';

// Bloc home « Nos services » : présente l'offre de livraison Primeurs Chez Vous.
// Version condensée de la page /qui-livre, avec CTA vers le détail.
export default function LivreurSection() {
  const whatsappHref = `https://wa.me/${SITE.whatsapp}`;

  return (
    <section className="py-16 md:py-20 bg-[#FAF9F7] border-t border-neutral-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
            Nos services
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-5">
            Vos fruits et légumes frais, sélectionnés à Rungis et livrés chez vous.
          </h2>
          <p className="text-neutral-700 leading-relaxed text-[15px] md:text-base">
            Chaque matin de livraison, nous sélectionnons à la main au marché de Rungis des fruits
            et légumes frais et de qualité auprès de nos fournisseurs, au meilleur de leur saison. Vous commandez en ligne, on vous
            livre à domicile le mardi ou le vendredi après-midi, et vous réglez à la réception.
            Une question, un créneau à décaler&nbsp;? On vous répond directement sur WhatsApp, 7j/7.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          <div className="bg-white border border-neutral-200 p-6">
            <Sunrise size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Sélection à Rungis</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Produits choisis à la main le matin même, au plus frais et au meilleur de la saison.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Truck size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Livraison à domicile</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Mardi et vendredi après-midi, créneaux de 2&nbsp;h entre 15h et 21h. Livraison offerte
              dès 55&nbsp;€.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 p-6">
            <Wallet size={24} className="text-green-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg text-neutral-800 mb-2">Paiement à la réception</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Aucun paiement en ligne, aucun abonnement. Vous réglez à la livraison, en toute
              simplicité.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/qui-livre"
            className="inline-flex items-center justify-center gap-2 bg-green-primary text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-dark transition-colors"
          >
            En savoir plus <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-green-primary text-green-primary px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-primary hover:text-white transition-colors"
          >
            <MessageCircle size={16} strokeWidth={1.5} /> WhatsApp 7j/7
          </a>
        </div>
      </div>
    </section>
  );
}
