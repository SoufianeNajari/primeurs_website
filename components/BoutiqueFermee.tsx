import Link from 'next/link';
import { Lock, Phone, MapPin, Clock } from 'lucide-react';
import { SITE } from '@/lib/site';

const JOURS_FR: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
};

export default function BoutiqueFermee() {
  return (
    <main className="flex-grow min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white border border-neutral-200 p-8 md:p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200 mb-6">
          <Lock size={24} className="text-amber-700" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl md:text-3xl font-serif text-neutral-800 mb-3">
          Commandes en ligne temporairement indisponibles
        </h1>
        <p className="text-neutral-600 mb-8 leading-relaxed">
          Notre boutique en ligne est momentanément fermée. Nous vous remercions de votre
          compréhension. Vous pouvez nous contacter ou nous retrouver directement en magasin.
        </p>

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
            <MapPin size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-0.5">Adresse</div>
              <div className="text-neutral-800">
                {SITE.address.street}<br />
                {SITE.address.postalCode} {SITE.address.city}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-green-primary mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-0.5">Horaires</div>
              <ul className="text-neutral-800 text-sm space-y-0.5">
                {SITE.horaires.map((h) => (
                  <li key={h.day}>
                    {JOURS_FR[h.day] || h.day} : {h.open} – {h.close}
                  </li>
                ))}
              </ul>
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
