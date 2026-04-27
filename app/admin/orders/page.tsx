import { supabaseAdmin } from '@/lib/supabase'
import { getFourchetteBornes } from '@/lib/fourchette'
import OrderList from './OrderList'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [{ data: commandes, error }, fourchette] = await Promise.all([
    supabaseAdmin
      .from('commandes')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    getFourchetteBornes(),
  ])

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
      <OrderList initialOrders={commandes || []} fourchette={fourchette} />
    </div>
  )
}
