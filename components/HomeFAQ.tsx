import { ChevronDown } from 'lucide-react';
import { SITE } from '@/lib/site';

// FAQ home : lève les freins muets avant le 1ᵉʳ CTA boutique.
// 7 questions sélectionnées pour adresser les objections récurrentes
// d'un nouveau visiteur (cible 40-45 ans peu équipée techno).
// Native <details> pour zéro JS et accessibilité gratuite.
type QA = { question: string; reponse: React.ReactNode };

const FAQ_ITEMS: QA[] = [
  {
    question: 'Comment ça marche ?',
    reponse: (
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>Vous choisissez vos produits sur la boutique en ligne.</li>
        <li>Vous sélectionnez votre créneau (mardi ou vendredi après-midi, créneaux de 2 h entre 15 h et 21 h) avant la veille 18 h.</li>
        <li>Le livreur passe à l&apos;heure prévue avec votre commande fraîchement préparée.</li>
        <li>Vous réglez à la livraison, en carte ou en espèces.</li>
      </ol>
    ),
  },
  {
    question: 'Comment je règle ma commande ?',
    reponse: (
      <p>
        À la livraison uniquement, en carte bancaire (terminal sans contact)
        ou en espèces. Aucun paiement n&apos;est demandé en avance, vous payez
        ce qui vous est livré, ni plus ni moins.
      </p>
    ),
  },
  {
    question: 'Et si un produit est en rupture ou pesé différemment de prévu ?',
    reponse: (
      <p>
        Pour les produits vendus au kilo, le prix est annoncé à titre indicatif :
        le poids réel est ajusté à la livraison (à plus ou moins 10 %). Si un
        produit est manquant ou de qualité insuffisante à Rungis le matin même,
        nous vous appelons avant de partir pour proposer un remplacement ou un retrait.
      </p>
    ),
  },
  {
    question: 'Que se passe-t-il si je ne suis pas chez moi ?',
    reponse: (
      <p>
        Le livreur tente de vous joindre à son arrivée. En cas d&apos;absence
        prolongée, la commande est rapportée et vous pouvez la récupérer ou
        la reporter au prochain créneau (en cas d&apos;imprévu, contactez-nous
        au {SITE.telephoneDisplay} pour reprogrammer gratuitement).
      </p>
    ),
  },
  {
    question: 'Pourquoi vos prix vs un drive de supermarché ?',
    reponse: (
      <p>
        Nos fruits et légumes sont sélectionnés à la main chaque matin de
        livraison, à Rungis, parmi des produits frais cueillis à maturité —
        pas calibrés pour la grande distribution. La différence se sent au goût
        et à la conservation. Notre marge nous permet de payer un primeur,
        un livreur, et de soutenir un commerce de proximité.
      </p>
    ),
  },
  {
    question: 'Vos produits viennent-ils vraiment de Rungis ?',
    reponse: (
      <p>
        Oui. Chaque tournée commence par une sélection physique au marché de
        Rungis avant 6 h du matin. Pas de plateforme intermédiaire, pas de
        stockage long. Ce que nous achetons le matin, nous le livrons l&apos;après-midi
        ou en début de soirée.
      </p>
    ),
  },
  {
    question: 'Quels sont les frais et le minimum de commande ?',
    reponse: (
      <p>
        Le minimum de commande est de <strong>30 €</strong>. La livraison est
        <strong> offerte dès 55 €</strong> de commande sur les 7 villes desservies.
        Aucun abonnement, aucun frais caché.
      </p>
    ),
  },
];

export default function HomeFAQ() {
  return (
    <section className="py-16 md:py-20 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
            Questions fréquentes
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-neutral-800">
            Tout ce qu&apos;il faut savoir
          </h2>
        </div>

        <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
          {FAQ_ITEMS.map((item, idx) => (
            <details key={idx} className="group">
              <summary className="flex items-center justify-between gap-4 cursor-pointer py-5 px-2 list-none [&::-webkit-details-marker]:hidden">
                <span className="font-serif text-base md:text-lg text-neutral-800">
                  {item.question}
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  className="text-neutral-400 transition-transform group-open:rotate-180 flex-shrink-0"
                />
              </summary>
              <div className="px-2 pb-5 text-[15px] text-neutral-700 leading-relaxed">
                {item.reponse}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
