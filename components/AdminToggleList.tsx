'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { triggerHaptic } from '@/lib/haptic'
import { useToast } from '@/components/admin/Toast'
import { adminMutate } from '@/lib/admin/offline-queue'

type Product = {
  id: string
  nom: string
  categorie: string
  disponible: boolean
  masque_boutique: boolean
}

type Props = {
  initialProducts: Record<string, Product[]>
}

const SEARCH_STORAGE_KEY = 'admin_dispo_search'
const CATEGORY_STORAGE_KEY = 'admin_dispo_categorie'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function AdminToggleList({ initialProducts }: Props) {
  const flatProducts = Object.values(initialProducts).flat()
  const [products, setProducts] = useState<Product[]>(flatProducts)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('Toutes')
  const toast = useToast()

  useEffect(() => {
    try {
      const s = localStorage.getItem(SEARCH_STORAGE_KEY)
      if (s) setSearch(s)
      const c = localStorage.getItem(CATEGORY_STORAGE_KEY)
      if (c) setActiveCat(c)
    } catch {
      /* */
    }
  }, [])

  useEffect(() => {
    try {
      if (search) localStorage.setItem(SEARCH_STORAGE_KEY, search)
      else localStorage.removeItem(SEARCH_STORAGE_KEY)
    } catch {
      /* */
    }
  }, [search])

  useEffect(() => {
    try {
      if (activeCat !== 'Toutes') localStorage.setItem(CATEGORY_STORAGE_KEY, activeCat)
      else localStorage.removeItem(CATEGORY_STORAGE_KEY)
    } catch {
      /* */
    }
  }, [activeCat])

  const categories = useMemo(
    () => ['Toutes', ...Array.from(new Set(products.map((p) => p.categorie)))],
    [products],
  )

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    return products.filter((p) => {
      if (activeCat !== 'Toutes' && p.categorie !== activeCat) return false
      if (q && !normalize(p.nom).includes(q)) return false
      return true
    })
  }, [products, search, activeCat])

  const grouped = useMemo(() => {
    return filtered.reduce((acc, p) => {
      if (!acc[p.categorie]) acc[p.categorie] = []
      acc[p.categorie].push(p)
      return acc
    }, {} as Record<string, Product[]>)
  }, [filtered])

  const applyMutation = async (
    id: string,
    update: { disponible?: boolean; masque_boutique?: boolean },
    successMsg: string,
    onError: () => void,
  ) => {
    if (loadingIds.has(id)) return
    setLoadingIds((prev) => new Set(prev).add(id))
    try {
      const dedupKey =
        'masque_boutique' in update ? `masque:${id}` : `toggle:${id}`
      const result = await adminMutate({
        endpoint: '/api/toggle',
        method: 'PATCH',
        body: { id, ...update },
        dedupKey,
      })

      if (!result.ok) {
        onError()
        toast.error('Erreur de mise à jour')
        return
      }

      if (result.queued) {
        toast.info(`${successMsg} (hors ligne)`)
        return
      }

      toast.success(successMsg)
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleToggleDispo = (produit: Product) => {
    if (produit.masque_boutique) return // sécurité : interdit si masqué
    triggerHaptic()
    const newDispo = !produit.disponible
    setProducts((prev) =>
      prev.map((p) => (p.id === produit.id ? { ...p, disponible: newDispo } : p)),
    )
    applyMutation(
      produit.id,
      { disponible: newDispo },
      `${produit.nom} ${newDispo ? 'disponible' : 'indisponible'}`,
      () => {
        setProducts((prev) =>
          prev.map((p) => (p.id === produit.id ? { ...p, disponible: !newDispo } : p)),
        )
      },
    )
  }

  const handleToggleMasque = (produit: Product) => {
    triggerHaptic()
    const newMasque = !produit.masque_boutique
    // Couplage : masquer force l'indispo. Démasquer ne réactive PAS la dispo
    // (l'admin doit le faire explicitement après vérif).
    const previousDispo = produit.disponible
    setProducts((prev) =>
      prev.map((p) =>
        p.id === produit.id
          ? { ...p, masque_boutique: newMasque, disponible: newMasque ? false : p.disponible }
          : p,
      ),
    )
    applyMutation(
      produit.id,
      { masque_boutique: newMasque },
      `${produit.nom} ${newMasque ? 'masqué de la boutique' : 'visible en boutique'}`,
      () => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === produit.id
              ? { ...p, masque_boutique: !newMasque, disponible: previousDispo }
              : p,
          ),
        )
      },
    )
  }

  const totalCount = products.length
  const filteredCount = filtered.length
  const hasFilter = search.length > 0 || activeCat !== 'Toutes'

  if (totalCount === 0) {
    return <div className="text-center text-neutral-500 py-8 font-serif">Aucun produit trouvé.</div>
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Barre recherche + chips catégorie */}
      <div className="md:sticky md:top-[80px] z-30 bg-neutral-50 -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 pb-3 space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-400" strokeWidth={1.5} />
          </div>
          <input
            type="text"
            inputMode="search"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary text-sm font-serif placeholder:font-sans placeholder:text-neutral-400 shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scrollbar-hide">
          {categories.map((cat) => {
            const isActive = activeCat === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCat(cat)}
                className={`shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest font-medium border transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white border-neutral-800'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 font-serif">
          <span>
            {filteredCount} / {totalCount} produit{totalCount > 1 ? 's' : ''}
          </span>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setActiveCat('Toutes')
              }}
              className="text-neutral-600 hover:text-neutral-900 underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {filteredCount === 0 && (
        <div className="text-center text-neutral-500 py-8 font-serif">
          Aucun produit ne correspond à la recherche.
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([categorie, items]) => (
          <div key={categorie} className="bg-white border border-neutral-200 overflow-hidden">
            <h2 className="bg-neutral-50 px-4 py-3 text-lg font-serif text-neutral-800 border-b border-neutral-200">
              {categorie}
            </h2>
            <ul className="divide-y divide-neutral-100">
              {items.map((produit) => {
                const masque = produit.masque_boutique
                const dispo = produit.disponible && !masque
                const loading = loadingIds.has(produit.id)
                return (
                  <li
                    key={produit.id}
                    className={`px-4 py-3 hover:bg-neutral-50 transition-colors ${masque ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[16px] font-serif text-neutral-800 leading-snug truncate">
                          {produit.nom}
                        </span>
                        <div className="mt-1">
                          {masque ? (
                            <span className="inline-flex items-center border border-neutral-400 bg-neutral-100 px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-neutral-600">
                              Masqué
                            </span>
                          ) : dispo ? (
                            <span className="inline-flex items-center border border-green-primary bg-green-light px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-green-dark">
                              Dispo
                            </span>
                          ) : (
                            <span className="inline-flex items-center border border-red-text bg-red-soft px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-red-text">
                              Indispo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end gap-3 shrink-0">
                        {/* Toggle dispo */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleDispo(produit)}
                            disabled={loading || masque}
                            className="flex items-center justify-center min-w-[44px] min-h-[44px] focus:outline-none disabled:cursor-not-allowed"
                            role="switch"
                            aria-checked={dispo}
                            aria-label={`Disponibilité de ${produit.nom}`}
                            title={masque ? 'Démasquez le produit pour modifier sa disponibilité' : undefined}
                          >
                            <div
                              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 ${
                                dispo ? 'bg-green-primary' : 'bg-neutral-300'
                              } ${loading || masque ? 'opacity-50' : ''}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  dispo ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </button>
                          <span className="text-[9px] uppercase tracking-widest text-neutral-500">
                            Dispo
                          </span>
                        </div>

                        {/* Toggle masqué */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMasque(produit)}
                            disabled={loading}
                            className="flex items-center justify-center min-w-[44px] min-h-[44px] focus:outline-none disabled:cursor-not-allowed"
                            role="switch"
                            aria-checked={masque}
                            aria-label={`Masquer ${produit.nom} de la boutique`}
                          >
                            <div
                              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-2 ${
                                masque ? 'bg-neutral-700' : 'bg-neutral-300'
                              } ${loading ? 'opacity-50' : ''}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  masque ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </button>
                          <span className="text-[9px] uppercase tracking-widest text-neutral-500">
                            Masqué
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
