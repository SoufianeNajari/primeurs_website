import {
  getFraisLivraisonCents,
  getMinCommandeCents,
  getSeuilLivraisonGratuiteCents,
} from '@/lib/livraison';
import ParametresForm from './ParametresForm';

export const dynamic = 'force-dynamic';

export default async function ParametresPage() {
  const [fraisCents, minCents, seuilGratuitCents] = await Promise.all([
    getFraisLivraisonCents(),
    getMinCommandeCents(),
    getSeuilLivraisonGratuiteCents(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Paramètres livraison</h2>
        <p className="text-sm text-neutral-500">
          Minimum de commande, frais de livraison et seuil de livraison offerte. Les nouvelles valeurs s&apos;appliquent en quelques minutes côté boutique (cache CDN).
        </p>
      </div>
      <ParametresForm
        initial={{ fraisCents, minCents, seuilGratuitCents }}
      />
    </div>
  );
}
