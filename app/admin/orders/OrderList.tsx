'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { triggerHaptic } from '@/lib/haptic'
import { calcFourchette, type FourchetteBornes } from '@/lib/fourchette'
import { Printer, Phone, Mail, Clock, MessageSquare } from 'lucide-react'
import { useToast } from '@/components/admin/Toast'

type Ligne = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
}

type Order = {
  id: string;
  client_nom: string;
  client_email?: string | null;
  client_telephone: string;
  lignes: Ligne[];
  message?: string | null;
  statut: string;
  created_at: string;
  date_retrait_souhaite?: string | null;
  jour_retrait?: string | null;
  creneau?: string | null;
}

type StatusFilter = 'tous' | 'reçue' | 'prête' | 'retirée';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

function shortId(id: string): string {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function formatDateLongue(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function jourBucketLabel(dateStr: string | null | undefined, fallbackCreatedAt: string): { key: string; label: string; badge: string | null } {
  const ref = dateStr || fallbackCreatedAt.slice(0, 10)
  const d = new Date(ref + (ref.length === 10 ? 'T00:00:00' : ''))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let badge: string | null = null
  if (diff === 0) badge = "AUJOURD'HUI"
  else if (diff === 1) badge = 'DEMAIN'
  else if (diff > 1 && diff <= 14) badge = `DANS ${diff} JOURS`
  else if (diff < 0) badge = `IL Y A ${-diff} JOUR${-diff > 1 ? 'S' : ''}`
  return { key: ref, label: formatDateLongue(ref), badge }
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24 && d.toDateString() === now.toDateString()) {
    return `il y a ${diffH}h`
  }
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return `hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function totalEstime(lignes: Ligne[]): { total: number | null; allIncertain: boolean; hasIncertain: boolean } {
  let total = 0
  let hasPrix = false
  let hasIncertain = false
  for (const l of lignes) {
    if (l.prix != null && !Number.isNaN(Number(l.prix))) {
      total += Number(l.prix) * l.quantite
      hasPrix = true
    } else {
      hasIncertain = true
    }
  }
  return {
    total: hasPrix ? total : null,
    allIncertain: !hasPrix && hasIncertain,
    hasIncertain,
  }
}

function loadPrepState(orderId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`prep_${orderId}`)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function savePrepState(orderId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`prep_${orderId}`, JSON.stringify(Array.from(ids)))
  } catch {
    /* quota / private mode — silently ignored */
  }
}

export default function OrderList({
  initialOrders,
  fourchette,
  prixActuels,
}: {
  initialOrders: Order[]
  fourchette: FourchetteBornes
  prixActuels: Record<string, number | null>
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    return initialOrders.some(o => o.statut === 'reçue') ? 'reçue' : 'tous'
  })
  const [prepStates, setPrepStates] = useState<Record<string, Set<string>>>({})
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    function onAfterPrint() {
      setPrintingOrderId(null)
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  function printOrder(orderId: string) {
    setPrintingOrderId(orderId)
    setTimeout(() => window.print(), 50)
  }

  useEffect(() => {
    const map: Record<string, Set<string>> = {}
    for (const o of initialOrders) map[o.id] = loadPrepState(o.id)
    setPrepStates(map)
  }, [initialOrders])

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
    else return;

    triggerHaptic();
    setLoadingIds(prev => new Set(prev).add(id))
    setOrders(prev => prev.map(o => o.id === id ? { ...o, statut: newStatus } : o))

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      })
      if (!res.ok) throw new Error('Erreur')
      const label = newStatus === 'prête' ? 'Commande prête' : newStatus === 'retirée' ? 'Commande retirée' : 'Statut mis à jour'
      toast.success(label)
    } catch (e) {
      console.error(e)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, statut: currentStatus } : o))
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const togglePrep = (orderId: string, lineKey: string) => {
    setPrepStates(prev => {
      const current = new Set(prev[orderId] || [])
      if (current.has(lineKey)) current.delete(lineKey)
      else current.add(lineKey)
      const next = { ...prev, [orderId]: current }
      savePrepState(orderId, current)
      return next
    })
  }

  const visibleOrders = statusFilter === 'tous' ? orders : orders.filter(o => o.statut === statusFilter)
  const activeOrders = visibleOrders.filter(o => o.statut !== 'retirée')
  const completedOrders = visibleOrders.filter(o => o.statut === 'retirée')

  const groupedActive = useMemo(() => {
    const groups = new Map<string, { label: string; badge: string | null; orders: Order[] }>()
    for (const o of activeOrders) {
      const b = jourBucketLabel(o.date_retrait_souhaite, o.created_at)
      if (!groups.has(b.key)) groups.set(b.key, { label: b.label, badge: b.badge, orders: [] })
      groups.get(b.key)!.orders.push(o)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [activeOrders])

  if (orders.length === 0) {
    return <div className="text-center text-neutral-500 py-12 font-serif text-lg border border-neutral-200 bg-white">Aucune commande sur les 7 derniers jours.</div>
  }

  const filterTabs: { value: StatusFilter; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'reçue', label: 'Reçues' },
    { value: 'prête', label: 'Prêtes' },
    { value: 'retirée', label: 'Retirées' },
  ]

  return (
    <div className="space-y-8">
      <style jsx global>{`
        #print-portal { display: none; }
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body { background: white !important; height: auto !important; }
          body.printing-one > *:not(#print-portal) { display: none !important; }
          body.printing-one #print-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <PrintModeToggler active={printingOrderId !== null} />
      <PrintPortal>
        {printingOrderId && (() => {
          const target = orders.find((o) => o.id === printingOrderId)
          if (!target) return null
          return <PrintableTicket order={target} prixActuels={prixActuels} fourchette={fourchette} />
        })()}
      </PrintPortal>

      <div className="flex flex-wrap gap-2 mb-2 no-print">
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

      {groupedActive.map(([key, group]) => (
        <section key={key} className="space-y-4">
          <h3 className="flex items-center gap-3 text-sm font-medium text-neutral-700 border-b border-neutral-300 pb-2">
            <span className="font-serif text-lg text-green-primary capitalize">{group.label}</span>
            {group.badge && (
              <span className="text-[10px] uppercase tracking-widest font-bold bg-green-primary text-white px-2 py-1">
                {group.badge}
              </span>
            )}
            <span className="text-neutral-400 ml-auto text-xs">{group.orders.length} commande{group.orders.length > 1 ? 's' : ''}</span>
          </h3>

          {group.orders.map(order => {
            const tot = totalEstime(order.lignes)
            const prepSet = prepStates[order.id] || new Set()
            const allPrepped = order.lignes.length > 0 && order.lignes.every((_, i) => prepSet.has(`${order.id}-${i}`))
            return (
              <article
                key={order.id}
                className={`order-card bg-white border p-4 sm:p-5 ${order.statut === 'prête' ? 'border-green-primary shadow-sm' : 'border-neutral-200'}`}
              >
                {/* HEADER */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b border-neutral-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5">{shortId(order.id)}</span>
                      <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 ${
                        order.statut === 'reçue' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        order.statut === 'prête' ? 'bg-green-primary text-white' :
                        'bg-neutral-100 text-neutral-500 border border-neutral-200'
                      }`}>{order.statut}</span>
                      <span className="text-xs text-neutral-400 inline-flex items-center gap-1"><Clock size={12} />{formatRelativeTime(order.created_at)}</span>
                    </div>
                    <h4 className="font-serif text-xl text-neutral-800 leading-tight">{order.client_nom}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm">
                      <a href={`tel:${order.client_telephone}`} className="inline-flex items-center gap-1.5 text-green-primary font-semibold hover:underline">
                        <Phone size={14} /> {order.client_telephone}
                      </a>
                      {order.client_email && (
                        <a href={`mailto:${order.client_email}`} className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 hover:underline text-xs">
                          <Mail size={12} /> {order.client_email}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 no-print">
                    <button
                      onClick={() => printOrder(order.id)}
                      title="Imprimer cette commande"
                      aria-label="Imprimer cette commande"
                      className="inline-flex items-center gap-1.5 px-3 min-h-[40px] border border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:text-neutral-900 transition-colors text-[11px] uppercase tracking-widest font-medium"
                    >
                      <Printer size={16} />
                      <span className="hidden sm:inline">Imprimer</span>
                    </button>
                    {order.statut !== 'retirée' && (
                      <button
                        disabled={loadingIds.has(order.id)}
                        onClick={() => updateStatus(order.id, order.statut)}
                        className={`px-4 py-2 text-[11px] uppercase tracking-widest font-semibold transition-colors disabled:opacity-50
                          ${order.statut === 'reçue' ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                          : 'bg-green-primary text-white border border-green-primary hover:bg-green-dark'}
                        `}
                      >
                        {order.statut === 'reçue' ? '→ Prête' : '→ Retirée'}
                      </button>
                    )}
                  </div>
                </div>

                {/* RETRAIT */}
                <div className="bg-green-primary/5 border border-green-primary/20 p-3 mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-green-primary font-semibold mb-1">À préparer pour</div>
                  <div className="font-serif text-base text-neutral-800 capitalize">
                    {order.date_retrait_souhaite ? formatDateLongue(order.date_retrait_souhaite) : `Date de commande : ${formatDateLongue(order.created_at.slice(0, 10))}`}
                  </div>
                  {(order.jour_retrait || order.creneau) && (
                    <div className="text-xs text-neutral-600 mt-0.5">
                      {order.jour_retrait}{order.creneau ? ` — ${order.creneau}` : ''}
                    </div>
                  )}
                </div>

                {/* LIGNES */}
                <div className="border border-neutral-200 mb-4">
                  <div className="hidden sm:grid grid-cols-[40px_1fr_140px_110px] gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
                    <div></div>
                    <div>Produit</div>
                    <div className="text-right">Prix unitaire</div>
                    <div className="text-right">Sous-total</div>
                  </div>
                  <ul className="divide-y divide-neutral-100">
                    {order.lignes.map((ligne, idx) => {
                      const lineKey = `${order.id}-${idx}`
                      const isChecked = prepSet.has(lineKey)
                      const incertain = ligne.prix == null
                      const sousTotal = incertain ? null : Number(ligne.prix) * ligne.quantite
                      const prixActuel = prixActuels[`${ligne.produitId}:${ligne.optionId}`]
                      const prixActuelDifferent =
                        !incertain &&
                        prixActuel != null &&
                        Math.abs(prixActuel - Number(ligne.prix)) > 0.001
                      return (
                        <li key={idx} className={`px-3 py-3 ${incertain ? 'bg-yellow-50' : ''} ${isChecked ? 'opacity-50' : ''}`}>
                          <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[40px_1fr_140px_110px] gap-2 items-center">
                            <label className="flex items-center justify-center cursor-pointer no-print">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePrep(order.id, lineKey)}
                                className="w-5 h-5 accent-green-primary cursor-pointer"
                                aria-label="Marquer comme préparé"
                              />
                            </label>
                            <div className={`min-w-0 ${isChecked ? 'line-through' : ''}`}>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-bold text-base text-neutral-800">{ligne.quantite}×</span>
                                <span className="font-medium text-neutral-800">{ligne.nom}</span>
                                <span className="italic text-sm text-neutral-500">{ligne.libelle}</span>
                              </div>
                              {ligne.categorie && (
                                <span className="inline-block mt-1 text-[9px] uppercase tracking-widest text-neutral-400 border border-neutral-200 px-1.5 py-0.5">{ligne.categorie}</span>
                              )}
                              <div className="sm:hidden mt-1 flex justify-between text-sm">
                                <span className={incertain ? 'text-amber-700 font-medium' : 'text-neutral-500'}>
                                  {incertain ? 'À peser' : `${euro.format(Number(ligne.prix))} / ${ligne.libelle}`}
                                </span>
                                <span className={`font-semibold ${incertain ? 'text-amber-700' : 'text-neutral-800'}`}>
                                  {incertain ? 'À calibrer' : euro.format(sousTotal!)}
                                </span>
                              </div>
                              {!incertain && prixActuel != null && (
                                <div className={`sm:hidden mt-0.5 text-[11px] font-medium ${prixActuelDifferent ? 'text-orange-700' : 'text-neutral-400'}`}>
                                  Aujourd&apos;hui : {euro.format(prixActuel)} {prixActuelDifferent ? '⚠️' : ''}
                                </div>
                              )}
                              {!incertain && prixActuel == null && (
                                <div className="sm:hidden mt-0.5 text-[11px] text-neutral-400 italic">
                                  Aujourd&apos;hui : à la remise
                                </div>
                              )}
                            </div>
                            <div className={`hidden sm:block text-right text-sm ${incertain ? 'text-amber-700 font-medium' : 'text-neutral-600'} ${isChecked ? 'line-through' : ''}`}>
                              {incertain ? 'À peser' : `${euro.format(Number(ligne.prix))}`}
                              {!incertain && prixActuel != null && (
                                <div className={`text-[10px] mt-0.5 font-medium ${prixActuelDifferent ? 'text-orange-700' : 'text-neutral-400'}`}>
                                  Auj. {euro.format(prixActuel)}
                                </div>
                              )}
                              {!incertain && prixActuel == null && (
                                <div className="text-[10px] mt-0.5 text-neutral-400 italic">
                                  Auj. à la remise
                                </div>
                              )}
                            </div>
                            <div className={`hidden sm:block text-right font-semibold ${incertain ? 'text-amber-700' : 'text-neutral-800'} ${isChecked ? 'line-through' : ''}`}>
                              {incertain ? 'À calibrer' : euro.format(sousTotal!)}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* TOTAUX */}
                {tot.allIncertain ? (
                  <div className="bg-amber-50 border border-amber-200 p-3 mb-3">
                    <div className="text-[10px] uppercase tracking-widest text-amber-800 font-semibold mb-1">Total à calculer à la pesée</div>
                    <div className="text-sm text-amber-900">Tous les articles de cette commande seront tarifés à la remise.</div>
                  </div>
                ) : tot.total != null && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-baseline border-t border-neutral-200 pt-3">
                      <span className="text-sm text-neutral-600">Total estimé annoncé client</span>
                      <span className="font-serif text-xl text-neutral-800">{euro.format(tot.total)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-orange-700">Borne haute (+{Math.round((fourchette.max - 1) * 100)}%)</span>
                      <span className="font-semibold text-orange-700">{euro.format(calcFourchette(tot.total, fourchette).max)}</span>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-900">
                      ⚠️ Si dépassement de la borne haute, prévenir le client au <a href={`tel:${order.client_telephone}`} className="font-semibold underline">{order.client_telephone}</a>
                    </div>
                    {tot.hasIncertain && (
                      <div className="text-xs text-amber-700 italic">
                        Note : certaines lignes (jaune) sont à peser/calibrer — total estimé hors ces lignes.
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGE CLIENT */}
                {order.message && (
                  <div className="bg-neutral-50 border-l-4 border-neutral-300 px-3 py-2 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                      <MessageSquare size={11} /> Message du client
                    </div>
                    <p className="text-sm italic text-neutral-700 whitespace-pre-wrap">{order.message}</p>
                  </div>
                )}

                {allPrepped && order.statut === 'reçue' && (
                  <div className="text-xs text-green-primary font-medium mt-2 no-print">
                    ✓ Toutes les lignes sont préparées — pensez à passer la commande en « Prête »
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ))}

      {completedOrders.length > 0 && (
        <div className="space-y-2 pt-8 border-t border-neutral-200 opacity-60 hover:opacity-100 transition-opacity no-print">
          <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 border-b border-neutral-200 pb-2">Commandes retirées ({completedOrders.length})</h3>
          {completedOrders.map(order => (
            <div key={order.id} className="bg-neutral-50 border border-neutral-200 p-3 flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-neutral-500">{shortId(order.id)}</span>
                <span className="font-serif text-neutral-700">{order.client_nom}</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Retirée</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrintModeToggler({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) document.body.classList.add('printing-one')
    else document.body.classList.remove('printing-one')
    return () => {
      document.body.classList.remove('printing-one')
    }
  }, [active])
  return null
}

function PrintPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return createPortal(<>{children}</>, document.body)
}

function PrintableTicket({
  order,
  prixActuels,
  fourchette,
}: {
  order: Order
  prixActuels: Record<string, number | null>
  fourchette: FourchetteBornes
}) {
  const tot = totalEstime(order.lignes)
  const dateRetrait = order.date_retrait_souhaite || order.created_at.slice(0, 10)
  return (
    <div id="print-portal" style={{ fontFamily: 'system-ui, sans-serif', color: '#000', fontSize: '10pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '15pt', fontWeight: 700 }}>{order.client_nom}</div>
          <div style={{ fontSize: '10pt' }}>{order.client_telephone}{order.client_email ? ` · ${order.client_email}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11pt' }}>{shortId(order.id)}</div>
          <div style={{ fontSize: '9pt', textTransform: 'uppercase' }}>{order.statut}</div>
        </div>
      </div>

      <div style={{ marginBottom: '6px', fontSize: '10pt' }}>
        <strong>Retrait :</strong> {formatDateLongue(dateRetrait)}
        {order.jour_retrait && <span> · {order.jour_retrait}</span>}
        {order.creneau && <span> · {order.creneau}</span>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '6px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px', width: '30px' }}>☐</th>
            <th style={{ textAlign: 'left', padding: '2px 4px' }}>Produit</th>
            <th style={{ textAlign: 'right', padding: '2px 4px', width: '60px' }}>Qté</th>
            <th style={{ textAlign: 'right', padding: '2px 4px', width: '70px' }}>Prix cmd.</th>
            <th style={{ textAlign: 'right', padding: '2px 4px', width: '70px' }}>Auj.</th>
            <th style={{ textAlign: 'right', padding: '2px 4px', width: '70px' }}>Sous-tot.</th>
          </tr>
        </thead>
        <tbody>
          {order.lignes.map((ligne, idx) => {
            const incertain = ligne.prix == null
            const sousTotal = incertain ? null : Number(ligne.prix) * ligne.quantite
            const prixActuel = prixActuels[`${ligne.produitId}:${ligne.optionId}`]
            const prixDiff = !incertain && prixActuel != null && Math.abs(prixActuel - Number(ligne.prix)) > 0.001
            return (
              <tr key={idx} style={{ borderBottom: '1px dashed #999' }}>
                <td style={{ padding: '3px 4px' }}>☐</td>
                <td style={{ padding: '3px 4px' }}>
                  <div><strong>{ligne.nom}</strong> <span style={{ fontStyle: 'italic', color: '#555' }}>{ligne.libelle}</span></div>
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>{ligne.quantite}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                  {incertain ? '— peser' : `${Number(ligne.prix).toFixed(2)}€`}
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right', color: prixDiff ? '#c2410c' : '#666', fontWeight: prixDiff ? 700 : 400 }}>
                  {prixActuel == null ? '— rem.' : `${prixActuel.toFixed(2)}€`}
                  {prixDiff && ' ⚠'}
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>
                  {incertain ? '—' : `${sousTotal!.toFixed(2)}€`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {tot.total != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '4px', fontSize: '11pt' }}>
          <span>Total estimé client</span>
          <strong>{tot.total.toFixed(2)}€</strong>
        </div>
      )}
      {tot.total != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#c2410c' }}>
          <span>Borne haute (+{Math.round((fourchette.max - 1) * 100)}%) — appeler client si dépassée</span>
          <span>{calcFourchette(tot.total, fourchette).max.toFixed(2)}€</span>
        </div>
      )}
      {tot.allIncertain && (
        <div style={{ fontSize: '10pt', fontStyle: 'italic', borderTop: '1px solid #000', paddingTop: '4px' }}>
          Tous les articles à tarifer à la pesée.
        </div>
      )}

      {order.message && (
        <div style={{ marginTop: '8px', borderLeft: '3px solid #000', paddingLeft: '6px', fontSize: '9.5pt' }}>
          <strong>Message client :</strong> <em>{order.message}</em>
        </div>
      )}
    </div>
  )
}
