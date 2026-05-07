import { getCurrentArrivage } from '@/lib/arrivages';
import ArrivageForm from './ArrivageForm';

export const dynamic = 'force-dynamic';

export default async function AdminArrivagesPage() {
  const current = await getCurrentArrivage();
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Ce matin à Rungis</h2>
        <p className="text-sm text-neutral-500">
          Photo + 3 produits phares affichés sur la home. Publier un nouvel arrivage remplace l&apos;actuel.
        </p>
      </div>
      <ArrivageForm current={current} />
    </div>
  );
}
