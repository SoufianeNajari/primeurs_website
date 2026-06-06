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
    <LegalLayout title="Conditions générales de vente" lastUpdate="6 mai 2026">
      <section>
        <div style={{ background: '#FFF4E5', border: '2px dashed #E0A030', padding: '12px 16px', marginBottom: '24px', color: '#7A4A00' }}>
          <strong>⚠️ À COMPLÉTER avant mise en production</strong> — Les CGV ci-dessous mentionnent
          {' '}{SITE.name} comme nom commercial. L&apos;identité juridique du Vendeur (raison sociale,
          SIRET, adresse) doit être renseignée dans les <a href="/mentions-legales">mentions légales</a> dès
          immatriculation de la micro-entreprise.
        </div>

        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes conditions générales de vente (ci-après «&nbsp;CGV&nbsp;») régissent les commandes
          passées en ligne sur le site <a href={SITE.url}>{SITE.url}</a> auprès de {SITE.name} (ci-après
          «&nbsp;le Vendeur&nbsp;»), dont les coordonnées juridiques figurent dans les{' '}
          <a href="/mentions-legales">mentions légales</a>.
        </p>
        <p>
          Les commandes sont exclusivement destinées à une <strong>livraison à domicile</strong> sur les
          communes desservies (voir <a href="/zones-livrees">zones desservies</a>).
        </p>
      </section>

      <section>
        <h2>Article 2 — Produits</h2>
        <p>
          Les produits proposés sont des denrées alimentaires fraîches, notamment fruits et
          légumes. Ils sont vendus au poids ou à la pièce, selon les indications portées sur chaque fiche
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
          quantités demandées. Le prix définitif est arrêté à la préparation, après pesée effective des
          produits vendus au kilo, et communiqué au client à la livraison.
        </p>
        <p>
          Des <strong>frais de livraison</strong> peuvent s&apos;appliquer selon la commune et la période. Le
          montant éventuel est affiché clairement avant validation de la commande.
        </p>
      </section>

      <section>
        <h2>Article 4 — Commande</h2>
        <p>
          La commande s&apos;effectue en ligne&nbsp;: sélection des produits, saisie de l&apos;adresse de
          livraison, choix d&apos;un créneau de livraison parmi ceux proposés, validation des informations
          client (nom, email, téléphone). Un email de confirmation est adressé au client après validation.
        </p>
        <p>
          Un <strong>montant minimum de commande</strong> est exigé pour valider la livraison. Ce seuil est
          affiché dans le récapitulatif du panier.
        </p>
        <p>
          Le Vendeur se réserve le droit de refuser ou d&apos;annuler toute commande qui présenterait un
          caractère anormal (quantités manifestement excessives, coordonnées fantaisistes, adresse hors zone, etc.).
        </p>
      </section>

      <section>
        <h2>Article 5 — Paiement</h2>
        <p>
          Le paiement s&apos;effectue <strong>à la livraison</strong>, en espèces ou par carte bancaire.
          Aucun paiement en ligne ni acompte ne sont demandés à la commande.
        </p>
      </section>

      <section>
        <h2>Article 6 — Livraison</h2>
        <p>
          Les livraisons sont effectuées sur les communes listées dans la page{' '}
          <a href="/zones-livrees">Zones desservies</a>, dans les créneaux annoncés (actuellement&nbsp;:
          mardi et vendredi après-midi, créneaux de 2 h entre 15h et 21h). La date de cutoff est fixée à <strong>la veille du créneau,
          18h</strong>&nbsp;: au-delà, seul le créneau suivant est proposé.
        </p>
        <p>
          Le client s&apos;engage à être présent à l&apos;adresse indiquée pendant le créneau choisi. En cas
          d&apos;empêchement, il est invité à prévenir la boutique par téléphone au{' '}
          <a href={`tel:${SITE.telephone}`}>{SITE.telephoneDisplay}</a>.
        </p>
        <p>
          Toute commande non honorée par le client (absence à l&apos;adresse, absence de réponse) sans information
          préalable pourra entraîner&nbsp;: (i) la remise en vente des produits frais, (ii) le refus de toute
          nouvelle commande en cas de récidive.
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
          Toutefois, en cas de produit manifestement non conforme ou défectueux constaté à la livraison,
          le client peut le signaler immédiatement au livreur ou au Vendeur pour échange ou remboursement,
          sans préjudice des garanties légales ci-dessous.
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
