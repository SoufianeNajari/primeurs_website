'use client'

import { useState } from 'react'
import { triggerHaptic } from '@/lib/haptic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;

type StatusFilter = 'tous' | 'reçue' | 'prête' | 'retirée';

export default function OrderList({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')

  const counts = {
    tous: orders.length,
    'reçue': orders.filter(o => o.statut === 'reçue').length,
    'prête': orders.filter(o => o.statut === 'prête').length,
    'retirée': orders.filter(o => o.statut === 'retirée').length,
  }

  const updateStatus = async (id: string, currentStatus: string) => {
    let newStatus = 'reçue'
    if (currentStatus === 'reçue') newStatus = 'prête'
    else if (currentStatus === 'prête') newStatus = 'retirée'
    else return; // retirée is final for now

    triggerHaptic();
    setLoadingIds(prev => new Set(prev).add(id))

    // Optimistic
    setOrders(prev => prev.map(o => o.id === id ? { ...o, statut: newStatus } : o))

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      })

      if (!res.ok) throw new Error('Erreur')
    } catch (e) {
      console.error(e)
      // Rollback
      setOrders(prev => prev.map(o => o.id === id ? { ...o, statut: currentStatus } : o))
      alert('Erreur lors de la mise à jour.')
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (orders.length === 0) {
    return <div className="text-center text-neutral-500 py-12 font-serif text-lg border border-neutral-200 bg-white">Aucune commande pour aujourd&apos;hui.</div>
  }

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'reçue', label: 'Reçues' },
    { value: 'prête', label: 'Prêtes' },
    { value: 'retirée', label: 'Retirées' },
  ]

  const visibleOrders = statusFilter === 'tous' ? orders : orders.filter(o => o.statut === statusFilter)

  // Filtrer pour ne pas trop encombrer l'écran avec les commandes "retirées" (historique)
  const activeOrders = visibleOrders.filter(o => o.statut !== 'retirée')
  const completedOrders = visibleOrders.filter(o => o.statut === 'retirée')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 mb-2">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
              statusFilter === tab.value
                ? 'border-green-primary text-green-primary bg-green-primary/5'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
            }`}
          >
            {tab.label} <span className="text-neutral-400 ml-1">({counts[tab.value]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 border-b border-neutral-200 pb-2">Commandes en cours ({activeOrders.length})</h3>
        {activeOrders.map(order => (
          <div key={order.id} className={`bg-white border p-5 ${order.statut === 'prête' ? 'border-green-primary shadow-sm' : 'border-neutral-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-serif text-lg text-neutral-800">{order.client_nom}</h4>
                <p className="text-sm text-neutral-500">{order.client_telephone}</p>
              </div>
              <button
                disabled={loadingIds.has(order.id)}
                onClick={() => updateStatus(order.id, order.statut)}
                className={`px-4 py-2 text-[11px] uppercase tracking-widest font-semibold transition-colors disabled:opacity-50
                  ${order.statut === 'reçue' ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' 
                  : 'bg-green-primary text-white border border-green-primary hover:bg-green-dark'}
                `}
              >
                {order.statut === 'reçue' ? 'Marquer Prête' : 'Marquer Retirée'}
              </button>
            </div>
            
            <div className="bg-neutral-50 p-3 border border-neutral-100 text-sm font-medium text-neutral-700 mb-3">
              Retrait prévu : {new Date(order.created_at).toLocaleDateString('fr-FR')} - <span className="uppercase">{order.message ? 'Avec Commentaire' : 'Standard'}</span>
            </div>

            <ul className="space-y-2 text-sm text-neutral-600">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {order.lignes.map((ligne: any, idx: number) => (
                <li key={idx} className="flex justify-between border-b border-neutral-100 pb-1 last:border-0 last:pb-0">
                  <span>{ligne.quantite}x {ligne.nom}</span>
                  <span className="text-[10px] uppercase text-neutral-400">{ligne.categorie}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {completedOrders.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-neutral-200 opacity-60 hover:opacity-100 transition-opacity">
          <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 border-b border-neutral-200 pb-2">Commandes retirées aujourd&apos;hui ({completedOrders.length})</h3>
          {completedOrders.map(order => (
            <div key={order.id} className="bg-neutral-50 border border-neutral-200 p-4">
              <div className="flex justify-between items-center">
                <span className="font-serif text-neutral-600">{order.client_nom}</span>
                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 border border-neutral-300 px-2 py-1">Retirée</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
