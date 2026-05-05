'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw, X } from 'lucide-react'
import { useCart, type CartItem } from './CartContext'
import { supabase } from '@/lib/supabase'
import type { ProduitOption } from '@/lib/produit'
import { triggerHaptic } from '@/lib/haptic'

export const CUSTOMER_MEMORY_KEY = 'primeur_customer_memory'
const DISMISS_KEY = 'primeur_welcome_dismissed'
const TTL_MS = 90 * 24 * 60 * 60 * 1000

export type CustomerMemory = {
  savedAt: number
  client: { prenom: string; nom: string; email: string; telephone: string }
  lignes: CartItem[]
  jour?: string
  creneau?: string
}

type DbProduit = {
  id: string
  disponible: boolean
  masque_boutique: boolean | null
  options: ProduitOption[] | null
}

export default function WelcomeBackBanner() {
  const { totalItems, restoreCart, isLoaded } = useCart()
  const router = useRouter()
  const [memory, setMemory] = useState<CustomerMemory | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (totalItems > 0) return
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    } catch {}
    let raw: string | null = null
    try {
      raw = localStorage.getItem(CUSTOMER_MEMORY_KEY)
    } catch {
      return
    }
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as CustomerMemory
      if (!parsed?.savedAt || !parsed.client?.prenom) return
      if (Date.now() - parsed.savedAt > TTL_MS) {
        localStorage.removeItem(CUSTOMER_MEMORY_KEY)
        return
      }
      if (!Array.isArray(parsed.lignes) || parsed.lignes.length === 0) return
      setMemory(parsed)
    } catch {
      try { localStorage.removeItem(CUSTOMER_MEMORY_KEY) } catch {}
    }
  }, [isLoaded, totalItems])

  if (!memory) return null

  const dateLabel = new Date(memory.savedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
  const itemCount = memory.lignes.reduce((sum, l) => sum + (l.quantite || 0), 0)
  const articleLabel = itemCount > 1 ? 'articles' : 'article'

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
    setMemory(null)
  }

  async function reprendre() {
    if (!memory) return
    setBusy(true)
    setError(null)
    triggerHaptic()
    try {
      const productIds = Array.from(new Set(memory.lignes.map((l) => l.produitId)))
      const { data, error: dbError } = await supabase
        .from('produits')
        .select('id, disponible, masque_boutique, options')
        .in('id', productIds)
      if (dbError) throw dbError
      const dbMap = new Map((data as DbProduit[] | null || []).map((p) => [p.id, p]))
      const valid: CartItem[] = []
      for (const item of memory.lignes) {
        const db = dbMap.get(item.produitId)
        if (!db || db.disponible !== true || db.masque_boutique === true) continue
        const opt = (db.options || []).find((o) => o.id === item.optionId)
        if (!opt) continue
        valid.push({
          ...item,
          libelle: opt.libelle,
          prix: opt.prix ?? null,
        })
      }
      if (valid.length === 0) {
        setError("Aucun de vos produits précédents n'est disponible aujourd'hui.")
        setBusy(false)
        return
      }
      restoreCart(valid)
      router.push('/order')
    } catch {
      setError("Impossible de récupérer vos produits, vérifiez votre connexion.")
      setBusy(false)
    }
  }

  return (
    <div className="bg-neutral-50 px-4 pt-6">
      <div
        className="max-w-5xl mx-auto bg-white border border-neutral-200 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6"
        role="region"
        aria-label="Reprise commande précédente"
      >
        <div className="flex items-start gap-3 min-w-0">
          <RotateCcw className="text-green-primary mt-1 shrink-0" size={18} strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="font-serif text-neutral-800 text-base md:text-lg">
              Bonjour {memory.client.prenom}.
            </p>
            <p className="text-sm text-neutral-600">
              Reprendre vos {itemCount} {articleLabel} commandés le {dateLabel} ?
            </p>
            {error && <p className="text-xs text-red-text mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 hover:text-neutral-800 transition-colors px-3 py-2 inline-flex items-center gap-1"
          >
            <X size={14} strokeWidth={1.75} />
            Non merci
          </button>
          <button
            type="button"
            onClick={reprendre}
            disabled={busy}
            className="bg-green-primary text-white border border-green-primary px-4 py-2 text-[11px] uppercase tracking-widest font-medium hover:bg-green-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} strokeWidth={1.75} />}
            Reprendre
          </button>
        </div>
      </div>
    </div>
  )
}
