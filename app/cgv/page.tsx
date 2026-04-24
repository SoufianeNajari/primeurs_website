import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description: `Conditions générales de vente de ${SITE.name}.`,
  alternates: { canonical: '/cgv' },
  robots: { index: true, follow: true },
};

export default function CgvPage() {
  return (
    <LegalLayout title="Conditions générales de vente" lastUpdate="24 avril 2026">
      <section>
        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes conditions générales de vente (ci-après «&nbsp;CGV&nbsp;») régissent les commandes
          passées en ligne sur le site <a href={SITE.url}>{SITE.url}</a> auprès de {SITE.name} (ci-après
          «&nbsp;le Vendeur&nbsp;»), dont les coordonnées figurent dans les mentions légales.
        </p>
        <p>
          Les commandes sont exclusivement destinées à un <strong>retrait en boutique</strong> à
          l&apos;adresse suivante&nbsp;: {SITE.address.street}, {SITE.address.postalCode} {SITE.address.city}.
          Aucune livraison n&apos;est proposée.
        </p>
      </section>

      <section>
        <h2>Article 2 — Produits</h2>
        <p>
          Les produits proposés sont des denrées alimentaires fraîches, notamment fruits, légumes et
          fromages. Ils sont vendus au poids ou à la pièce, selon les indications portées sur chaque fiche
          produit. Les photographies et descriptifs sont fournis à titre indicatif et n&apos;engagent pas
          le Vendeur en cas de variations mineures (calibre, couleur, maturité) inhérentes aux produits
          frais.
        </p>
        <p>
          La disponibilité des produits peut varier en fonction des arrivages et de la saison. Un produit
          affiché comme indisponible ne peut être commandé.
        </p>
      </section>

      <section>
        <h2>Article 3 — Prix</h2>
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises (TTC), applicables au jour de la commande.
          Ils sont susceptibles d&apos;évoluer selon les cours du marché. Le prix retenu est celui affiché
          sur le site au moment de la validation de la commande.
        </p>
        <p>
          Le montant affiché lors de la commande est une <strong>estimation</strong> calculée sur la base des
          quantités demandées. Le prix définitif est arrêté lors du retrait en boutique, après pesée effective
          des produits vendus au kilo.
        </p>
      </section>

      <section>
        <h2>Article 4 — Commande</h2>
        <p>
          La commande s&apos;effectue en ligne&nbsp;: sélection des produits, choix du jour et du créneau de
          retrait, validation des informations client (nom, email, téléphone). Un email de confirmation est
          adressé au client après validation.
        </p>
        <p>
          Le Vendeur se réserve le droit de refuser ou d&apos;annuler toute commande qui présenterait un
          caractère anormal (quantités manifestement excessives, coordonnées fantaisistes, etc.).
        </p>
      </section>

      <section>
        <h2>Article 5 — Paiement</h2>
        <p>
          Le paiement s&apos;effectue <strong>en boutique au moment du retrait</strong>, en espèces ou par
          carte bancaire. Aucun paiement en ligne n&apos;est demandé à la commande.
        </p>
      </section>

      <section>
        <h2>Article 6 — Retrait en boutique</h2>
        <p>
          Le client s&apos;engage à venir retirer sa commande au jour et dans le créneau choisi. En cas
          d&apos;empêchement, il est invité à prévenir la boutique par téléphone au{' '}
          <a href={`tel:${SITE.telephone}`}>{SITE.telephoneDisplay}</a>.
        </p>
        <p>
          Toute commande non retirée sans information préalable dans un délai raisonnable pourra être remise
          en vente, les produits frais ne pouvant être conservés.
        </p>
      </section>

      <section>
        <h2>Article 7 — Droit de rétractation</h2>
        <p>
          Conformément à l&apos;article <strong>L.221-28 4° du Code de la consommation</strong>, le droit de
          rétractation ne peut être exercé pour les contrats de fourniture de biens susceptibles de se détériorer
          ou de se périmer rapidement, ce qui est le cas des denrées alimentaires fraîches proposées sur ce
          site.
        </p>
        <p>
          Toutefois, en cas de produit manifestement non conforme ou défectueux constaté lors du retrait,
          le client peut le signaler immédiatement en boutique pour échange ou remboursement, sans préjudice
          des garanties légales ci-dessous.
        </p>
      </section>

      <section>
        <h2>Article 8 — Garanties légales</h2>
        <p>
          Le Vendeur est tenu des garanties légales de conformité (articles L.217-3 et suivants du Code de la
          consommation) et des vices cachés (articles 1641 et suivants du Code civil), dans les conditions
          prévues par la loi.
        </p>
      </section>

      <section>
        <h2>Article 9 — Médiation de la consommation</h2>
        <p>
          Conformément à l&apos;article L.612-1 du Code de la consommation, en cas de litige persistant après
          réclamation écrite auprès du Vendeur, le client peut recourir gratuitement à un médiateur de la
          consommation. [À COMPLÉTER — nom et coordonnées du médiateur adhéré par la boutique].
        </p>
        <p>
          Plateforme européenne de règlement en ligne des litiges&nbsp;:{' '}
          <a href="https://ec.europa.eu/consumers/odr" rel="noopener">ec.europa.eu/consumers/odr</a>.
        </p>
      </section>

      <section>
        <h2>Article 10 — Données personnelles</h2>
        <p>
          Les données collectées lors de la commande sont traitées conformément à notre{' '}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Article 11 — Droit applicable et litiges</h2>
        <p>
          Les présentes CGV sont régies par le droit français. En cas de litige, et après tentative de
          résolution amiable, compétence est donnée aux juridictions françaises.
        </p>
      </section>
    </LegalLayout>
  );
}
