import { supabaseAdmin } from '@/lib/supabase'
import OrderList from './OrderList'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  // Fetch des commandes des 7 derniers jours par exemple
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: commandes, error } = await supabaseAdmin
    .from('commandes')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

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
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif text-neutral-800 mb-2">Suivi des commandes</h2>
          <p className="text-sm text-neutral-500">Gérez les commandes à préparer pour le retrait.</p>
        </div>
      </div>
      <OrderList initialOrders={commandes || []} />
    </div>
  )
}
