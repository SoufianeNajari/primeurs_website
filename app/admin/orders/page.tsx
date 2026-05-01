import { supabaseAdmin } from '@/lib/supabase'
import { getFourchetteBornes } from '@/lib/fourchette'
import OrderList from './OrderList'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [{ data: commandes, error }, fourchette, { data: produitsActuels }] = await Promise.all([
    supabaseAdmin
      .from('commandes')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    getFourchetteBornes(),
    supabaseAdmin.from('produits').select('id, options'),
  ])

  // Map (produitId:optionId) → prix actuel
  const prixActuels: Record<string, number | null> = {}
  for (const p of produitsActuels || []) {
    const opts = (p.options || []) as { id: string; prix?: number | null }[]
    for (const o of opts) {
      prixActuels[`${p.id}:${o.id}`] = o.prix == null ? null : Number(o.prix)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-soft text-red-text p-4 border border-red-text/20">
          Erreur de chargement des commandes: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-end no-print">
        <div>
          <h2 className="text-2xl font-serif text-neutral-800 mb-2">Suivi des commandes</h2>
          <p className="text-sm text-neutral-500">Fiche de préparation des commandes à retirer (7 derniers jours).</p>
        </div>
      </div>
      <OrderList initialOrders={commandes || []} fourchette={fourchette} prixActuels={prixActuels} />
    </div>
  )
}
