import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: `Politique de confidentialité et gestion des données personnelles de ${SITE.name}.`,
  alternates: { canonical: '/confidentialite' },
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdate="24 avril 2026">
      <section>
        <p>
          {SITE.name} accorde une attention particulière à la protection des données personnelles de ses
          clients. La présente politique décrit la façon dont vos données sont collectées, utilisées et
          protégées, conformément au Règlement général sur la protection des données (RGPD, règlement UE
          2016/679) et à la loi «&nbsp;Informatique et Libertés&nbsp;» du 6 janvier 1978 modifiée.
        </p>
      </section>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Le responsable du traitement est <strong>{SITE.name}</strong>, dont le siège social et les
          coordonnées figurent dans les <a href="/mentions-legales">mentions légales</a>.
        </p>
        <p>
          Pour toute question relative à vos données, vous pouvez nous contacter par email à{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </section>

      <section>
        <h2>Données collectées</h2>
        <p>
          Lors d&apos;une commande en ligne, nous collectons les données suivantes&nbsp;:
        </p>
        <ul>
          <li><strong>Nom</strong> (nécessaire pour identifier la commande au retrait)</li>
          <li><strong>Adresse email</strong> (envoi de la confirmation de commande)</li>
          <li><strong>Numéro de téléphone</strong> (pour vous joindre en cas de besoin)</li>
          <li><strong>Détail et créneau de retrait</strong> de votre commande</li>
        </ul>
        <p>
          Aucune donnée bancaire n&apos;est collectée sur le site, le paiement s&apos;effectuant exclusivement
          en boutique.
        </p>
      </section>

      <section>
        <h2>Finalités et bases légales</h2>
        <ul>
          <li>
            <strong>Gestion de la commande</strong> (préparation, email de confirmation, rappel téléphonique
            éventuel) — base légale&nbsp;: exécution du contrat (art. 6.1.b RGPD).
          </li>
          <li>
            <strong>Respect des obligations comptables et fiscales</strong> — base légale&nbsp;: obligation
            légale (art. 6.1.c RGPD).
          </li>
          <li>
            <strong>Mesure d&apos;audience anonyme</strong> (Vercel Analytics) — base légale&nbsp;: intérêt
            légitime (art. 6.1.f RGPD), voir section Cookies ci-dessous.
          </li>
        </ul>
      </section>

      <section>
        <h2>Destinataires des données</h2>
        <p>
          Vos données sont accessibles uniquement au personnel autorisé de {SITE.name}. Nous recourons aux
          sous-traitants techniques suivants, encadrés par des clauses contractuelles conformes au RGPD&nbsp;:
        </p>
        <ul>
          <li><strong>Vercel</strong> (hébergement du site) — États-Unis, accords de transfert appropriés.</li>
          <li><strong>Supabase</strong> (base de données) — Singapour / UE selon la région du projet.</li>
          <li><strong>Resend</strong> (envoi des emails de confirmation) — États-Unis / UE.</li>
          <li><strong>Google</strong> (affichage des avis publics Google Reviews) — États-Unis.</li>
        </ul>
        <p>
          Aucune donnée n&apos;est vendue ou cédée à des tiers à des fins commerciales.
        </p>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <ul>
          <li><strong>Données de commande&nbsp;:</strong> conservées pendant 3 ans à des fins de suivi client, puis archivées à des fins comptables pendant 10 ans conformément au Code de commerce.</li>
          <li><strong>Emails&nbsp;:</strong> conservés le temps nécessaire à la délivrance, puis supprimés.</li>
          <li><strong>Données d&apos;audience anonymes&nbsp;:</strong> selon les paramètres de Vercel Analytics (données agrégées, non rattachées à une personne).</li>
        </ul>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants sur vos données&nbsp;:</p>
        <ul>
          <li><strong>Droit d&apos;accès</strong> à vos données</li>
          <li><strong>Droit de rectification</strong> des données inexactes</li>
          <li><strong>Droit à l&apos;effacement</strong> («&nbsp;droit à l&apos;oubli&nbsp;»)</li>
          <li><strong>Droit à la limitation</strong> du traitement</li>
          <li><strong>Droit à la portabilité</strong> de vos données</li>
          <li><strong>Droit d&apos;opposition</strong> au traitement</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous par email à{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Nous répondrons dans un délai maximum d&apos;un mois.
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la{' '}
          <a href="https://www.cnil.fr" rel="noopener">CNIL</a> (Commission Nationale de l&apos;Informatique
          et des Libertés), 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07.
        </p>
      </section>

      <section>
        <h2>Cookies et traceurs</h2>
        <p>
          Le site utilise un nombre minimal de cookies et traceurs&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Cookies strictement nécessaires</strong> (session administrateur) — dispensés de consentement
            car indispensables au fonctionnement du site.
          </li>
          <li>
            <strong>Stockage local (localStorage)</strong> — utilisé pour conserver le contenu de votre panier
            entre vos visites. Ce stockage reste sur votre appareil et n&apos;est pas transmis à nos serveurs.
          </li>
          <li>
            <strong>Vercel Analytics</strong> — mesure d&apos;audience anonyme et agrégée, sans cookie
            d&apos;identification persistant ni donnée personnelle. Conforme aux lignes directrices CNIL
            dispensant du recueil de consentement.
          </li>
        </ul>
        <p>
          Aucun cookie publicitaire ni traceur tiers à finalité marketing n&apos;est déposé.
        </p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données&nbsp;:
          chiffrement HTTPS des communications, contrôle d&apos;accès à la base de données, authentification
          protégée de l&apos;espace d&apos;administration.
        </p>
      </section>

      <section>
        <h2>Modifications</h2>
        <p>
          La présente politique peut être mise à jour pour refléter l&apos;évolution du site ou de la
          réglementation. La date de dernière mise à jour figure en tête de cette page.
        </p>
      </section>
    </LegalLayout>
  );
}
