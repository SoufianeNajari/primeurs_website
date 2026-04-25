import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isClientAuthorized } from '@/lib/client-auth';
import ConnexionForm from './ConnexionForm';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous avec votre numéro de téléphone pour accéder à la boutique en ligne.',
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  if (await isClientAuthorized()) {
    redirect(searchParams.from || '/boutique');
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-neutral-800 mb-2">Espace client</h1>
          <p className="text-sm text-neutral-500">
            La commande en ligne est réservée aux clients du magasin.
            <br />
            Pour toute question : <a className="underline" href={`tel:${SITE.telephone}`}>{SITE.telephoneDisplay}</a>
          </p>
        </div>
        <ConnexionForm fromPath={searchParams.from || '/boutique'} />
      </div>
    </main>
  );
}
