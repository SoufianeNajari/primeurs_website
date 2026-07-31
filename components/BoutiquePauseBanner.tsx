import { Truck, Gift } from 'lucide-react';

/**
 * Bandeau affiché en tête de boutique quand les commandes sont bloquées
 * (paramètre `commandes_bloquees`). Le catalogue reste consultable : le client
 * peut composer son panier, seule la validation de commande est fermée.
 */
export default function BoutiquePauseBanner() {
  return (
    <div className="px-4 pt-6">
      <div className="max-w-3xl mx-auto bg-white border border-amber-200 shadow-sm">
        <div className="flex flex-col sm:flex-row">
          <div className="flex-1 p-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <Truck size={18} className="text-amber-700 shrink-0" strokeWidth={1.75} />
              <span className="text-[11px] uppercase tracking-widest text-amber-700 font-medium">
                Commandes en pause
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif text-neutral-800 mb-2">
              🚚 Réouverture le 25 août
            </h2>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Vous pouvez parcourir la boutique et préparer votre panier dès maintenant —
              la validation des commandes rouvre le 25&nbsp;août.
            </p>
          </div>

          <div className="sm:w-64 shrink-0 border-t sm:border-t-0 sm:border-l border-amber-200 bg-green-50/60 p-6 text-center flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift size={18} className="text-green-primary shrink-0" strokeWidth={1.75} />
              <span className="text-[11px] uppercase tracking-widest text-green-dark font-medium">
                🎁 Offre de rentrée
              </span>
            </div>
            <p className="text-neutral-800 font-serif text-lg leading-snug">
              10 € offerts dès 50 € d&apos;achat 🎉
            </p>
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 mt-2">
              Code <span className="text-green-dark font-medium">RENTREE</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
