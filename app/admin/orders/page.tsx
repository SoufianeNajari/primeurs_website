import { supabaseAdmin } from '@/lib/supabase'
import { getFourchetteBornes } from '@/lib/fourchette'
import OrderList from './OrderList'

export const dynamic = 'force-dynamic'

type Periode = 'today' | '7d' | '30d'

function periodeStart(p: Periode): Date {
  const d = new Date()
  if (p === 'today') {
    d.setHours(0, 0, 0, 0)
  } else if (p === '30d') {
    d.setDate(d.getDate() - 30)
  } else {
    d.setDate(d.getDate() - 7)
  }
  return d
}

const PERIODE_LABEL: Record<Periode, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
}

export default async function OrdersPage({ searchParams }: { searchParams?: { periode?: string } }) {
  const raw = searchParams?.periode
  const periode: Periode = raw === 'today' || raw === '30d' || raw === '7d' ? raw : '7d'
  const start = periodeStart(periode)

  const [{ data: commandes, error }, fourchette, { data: produitsActuels }] = await Promise.all([
    supabaseAdmin
      .from('commandes')
      .select('*')
      .gte('created_at', start.toISOString())
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

  const periodes: Periode[] = ['today', '7d', '30d']

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6 no-print">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Suivi des commandes</h2>
        <p className="text-sm text-neutral-500 mb-3">Fiche de préparation des commandes à retirer ({PERIODE_LABEL[periode].toLowerCase()}).</p>
        <div className="flex flex-wrap gap-2">
          {periodes.map((p) => (
            <a
              key={p}
              href={`/admin/orders?periode=${p}`}
              className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
                p === periode
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
              }`}
            >
              {PERIODE_LABEL[p]}
            </a>
          ))}
        </div>
      </div>
      <OrderList initialOrders={commandes || []} fourchette={fourchette} prixActuels={prixActuels} />
    </div>
  )
}
