import type { Metadata } from 'next';
import LegalLayout from '@/components/LegalLayout';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: `Mentions légales du site ${SITE.name}.`,
  alternates: { canonical: '/mentions-legales' },
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdate="24 avril 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site <strong>{SITE.name}</strong> (accessible à l&apos;adresse{' '}
          <a href={SITE.url}>{SITE.url}</a>) est édité par&nbsp;:
        </p>
        <ul>
          <li><strong>Raison sociale&nbsp;:</strong> Pontault Primeurs</li>
          <li><strong>Forme juridique&nbsp;:</strong> Entrepreneur individuel</li>
          <li><strong>Siège social&nbsp;:</strong> {SITE.address.street}, {SITE.address.postalCode} {SITE.address.city}, France</li>
          <li><strong>SIRET&nbsp;:</strong> 388 873 002 00033</li>
          <li><strong>RCS&nbsp;:</strong> Melun 388 873 002 (immatriculée le 1<sup>er</sup> octobre 1992)</li>
          <li><strong>Code APE&nbsp;:</strong> 4721Z — Commerce de détail de fruits et légumes en magasin spécialisé</li>
          <li><strong>N° TVA intracommunautaire&nbsp;:</strong> FR18388873002</li>
          <li><strong>Téléphone&nbsp;:</strong> <a href={`tel:${SITE.telephone}`}>{SITE.telephoneDisplay}</a></li>
          <li><strong>Email&nbsp;:</strong> <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        </ul>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>Lahcen Najari, en qualité d&apos;entrepreneur individuel.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
          Covina, CA 91723, États-Unis. Site&nbsp;: <a href="https://vercel.com" rel="noopener">vercel.com</a>.
        </p>
        <p>
          Base de données et stockage fournis par <strong>Supabase Inc.</strong>, 970 Toa Payoh North,
          #07-04, Singapour 318992. Site&nbsp;: <a href="https://supabase.com" rel="noopener">supabase.com</a>.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du contenu du site (textes, images, logo, charte graphique, base de données)
          est la propriété exclusive de {SITE.name} ou de ses partenaires, et protégé par le droit
          d&apos;auteur et le droit des bases de données. Toute reproduction, représentation ou diffusion,
          totale ou partielle, sans autorisation écrite préalable est interdite et constitue une contrefaçon
          sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
        </p>
      </section>

      <section>
        <h2>Responsabilité</h2>
        <p>
          {SITE.name} s&apos;efforce de fournir des informations exactes et à jour sur ce site, notamment
          concernant la disponibilité des produits et leurs prix. Toutefois, des erreurs ou omissions peuvent
          survenir. En cas de divergence entre les informations affichées sur le site et celles constatées en
          boutique, seules les informations constatées en boutique feront foi.
        </p>
      </section>

      <section>
        <h2>Droit applicable</h2>
        <p>
          Le présent site est soumis au droit français. En cas de litige, et à défaut de résolution amiable,
          compétence est donnée aux tribunaux français.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question relative au site, vous pouvez nous contacter par email à{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> ou par téléphone au{' '}
          <a href={`tel:${SITE.telephone}`}>{SITE.telephoneDisplay}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
