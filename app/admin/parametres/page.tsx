import {
  getFraisLivraisonCents,
  getMinCommandeCents,
  getSeuilLivraisonGratuiteCents,
} from '@/lib/livraison';
import { getMaxMerciParParrain } from '@/lib/parrainage';
import ParametresForm from './ParametresForm';

export const dynamic = 'force-dynamic';

export default async function ParametresPage() {
  const [fraisCents, minCents, seuilGratuitCents, maxMerciParParrain] = await Promise.all([
    getFraisLivraisonCents(),
    getMinCommandeCents(),
    getSeuilLivraisonGratuiteCents(),
    getMaxMerciParParrain(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Paramètres livraison & parrainage</h2>
        <p className="text-sm text-neutral-500">
          Minimum de commande, frais de livraison, seuil offerte et plafond de récompenses parrainage. Les nouvelles valeurs s&apos;appliquent en quelques minutes côté boutique (cache CDN).
        </p>
      </div>
      <ParametresForm
        initial={{ fraisCents, minCents, seuilGratuitCents, maxMerciParParrain }}
      />
    </div>
  );
}
