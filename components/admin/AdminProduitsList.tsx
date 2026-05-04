'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GripVertical, Pencil, Search, X } from 'lucide-react'
import type { Product } from '@/lib/produit'
import { formatPrixResume } from '@/lib/produit'
import { useToast } from '@/components/admin/Toast'

const SEARCH_STORAGE_KEY = 'admin_produits_search'
const CATEGORY_STORAGE_KEY = 'admin_produits_categorie'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

type DragState = { categorie: string; from: number } | null

type Props = {
  produits: Product[]
  // Catégories ordonnées selon la table `categories.ordre`. Source de vérité
  // pour l'affichage. Les catégories absentes (produit avec catégorie supprimée
  // ou hors table) sont reléguées en fin de liste, ordre alphabétique.
  categoriesOrder: string[]
}

export default function AdminProduitsList({ produits: initial, categoriesOrder }: Props) {
  const [produits, setProduits] = useState<Product[]>(initial)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('Toutes')
  const [drag, setDrag] = useState<DragState>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    setProduits(initial)
  }, [initial])

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

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    return produits.filter((p) => {
      if (activeCat !== 'Toutes' && p.categorie !== activeCat) return false
      if (q && !normalize(p.nom).includes(q) && !normalize(p.categorie).includes(q)) return false
      return true
    })
  }, [produits, search, activeCat])

  // Regroupement en respectant `categoriesOrder` (Map → ordre d'insertion).
  const grouped = useMemo(() => {
    const out = new Map<string, Product[]>()
    for (const cat of categoriesOrder) out.set(cat, [])
    for (const p of filtered) {
      if (!out.has(p.categorie)) out.set(p.categorie, [])
      out.get(p.categorie)!.push(p)
    }
    // Vire les groupes vides (ex: filtre catégorie actif)
    return Array.from(out.entries()).filter(([, items]) => items.length > 0)
  }, [filtered, categoriesOrder])

  // Le filtre catégorie n'enlève pas d'éléments à l'intérieur d'une catégorie
  // (toutes les "Fruits" restent visibles si on filtre "Fruits"), donc le DnD
  // y est OK. La recherche, elle, masque des items → ordre partiel = pas safe.
  const dndEnabled = search.trim() === ''

  const persistOrder = async (categorie: string, ordered: Product[]) => {
    try {
      const res = await fetch('/api/admin/produits/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ordered.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Ordre enregistré (${categorie})`)
    } catch {
      toast.error('Erreur — ordre non sauvegardé')
      setProduits(initial)
    }
  }

  const handleDrop = (categorie: string, items: Product[], to: number) => {
    if (!drag || drag.categorie !== categorie) return
    if (drag.from === to) return
    const next = [...items]
    const [moved] = next.splice(drag.from, 1)
    next.splice(to, 0, moved)
    setProduits((prev) => {
      const others = prev.filter((p) => p.categorie !== categorie)
      // On préserve l'ordre relatif des autres catégories dans `others` ; pour
      // celle qu'on réorganise, on utilise `next`.
      const merged: Product[] = []
      for (const p of prev) {
        if (p.categorie !== categorie) {
          merged.push(others.find((o) => o.id === p.id)!)
        }
      }
      // Reconstruction propre : merge ordonné par catégoriesOrder
      const byCat = new Map<string, Product[]>()
      for (const p of merged) {
        if (!byCat.has(p.categorie)) byCat.set(p.categorie, [])
        byCat.get(p.categorie)!.push(p)
      }
      byCat.set(categorie, next)
      const final: Product[] = []
      for (const cat of categoriesOrder) {
        const list = byCat.get(cat)
        if (list) final.push(...list)
        byCat.delete(cat)
      }
      // Catégories hors table à la fin
      Array.from(byCat.values()).forEach((list) => final.push(...list))
      return final
    })
    persistOrder(categorie, next)
  }

  // Liste pour les chips : "Toutes" + categoriesOrder + catégories hors table
  const chipCategories = useMemo(() => {
    const fromProduits = new Set(produits.map((p) => p.categorie))
    const ordered = categoriesOrder.filter((c) => fromProduits.has(c))
    const extras = Array.from(fromProduits).filter((c) => !ordered.includes(c))
    return ['Toutes', ...ordered, ...extras]
  }, [produits, categoriesOrder])

  return (
    <>
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit (nom ou catégorie)…"
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary text-sm"
          aria-label="Rechercher un produit"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
            aria-label="Effacer la recherche"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto">
        {chipCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCat(cat)}
            className={`text-[11px] uppercase tracking-widest font-medium px-3 py-1.5 border transition-colors whitespace-nowrap ${
              activeCat === cat
                ? 'border-green-primary text-green-primary bg-green-primary/5'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 bg-white'
            }`}
            aria-pressed={activeCat === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {!dndEnabled && (
        <p className="text-[11px] text-neutral-500 italic mb-3">
          Réorganisation désactivée pendant la recherche.
        </p>
      )}

      {grouped.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          {search || activeCat !== 'Toutes'
            ? 'Aucun produit ne correspond.'
            : 'Aucun produit pour l’instant.'}
        </div>
      ) : (
        grouped.map(([categorie, items]) => (
          <section key={categorie} className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">{categorie}</h2>
            <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
              {items.map((p, idx) => {
                const isDragging = drag?.categorie === categorie && drag.from === idx
                const isOver = drag?.categorie === categorie && overIndex === idx && drag.from !== idx
                return (
                  <div
                    key={p.id}
                    draggable={dndEnabled}
                    onDragStart={(e) => {
                      if (!dndEnabled) return
                      setDrag({ categorie, from: idx })
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      if (!drag || drag.categorie !== categorie) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (overIndex !== idx) setOverIndex(idx)
                    }}
                    onDragLeave={() => {
                      if (overIndex === idx) setOverIndex(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(categorie, items, idx)
                      setDrag(null)
                      setOverIndex(null)
                    }}
                    onDragEnd={() => {
                      setDrag(null)
                      setOverIndex(null)
                    }}
                    className={`flex items-center gap-3 px-2 py-3 hover:bg-neutral-50 transition-colors ${
                      isDragging ? 'opacity-40' : ''
                    } ${isOver ? 'bg-green-50 border-t-2 border-t-green-primary' : ''}`}
                  >
                    {dndEnabled && (
                      <span
                        className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing px-1 shrink-0"
                        aria-label="Poignée de réorganisation"
                        title="Glisser pour réorganiser"
                      >
                        <GripVertical size={16} strokeWidth={1.5} />
                      </span>
                    )}
                    <Link
                      href={`/admin/produits/${p.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                      draggable={false}
                    >
                      <div className="relative w-14 h-14 bg-neutral-100 shrink-0 overflow-hidden">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.nom} fill sizes="56px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif text-neutral-800 truncate">{p.nom}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {formatPrixResume(p.options) || 'Prix non renseigné'}
                          {p.options && p.options.length > 1 ? ` · ${p.options.length} options` : ''}
                          {p.origine ? ` · ${p.origine}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {!p.disponible && <span className="border border-red-300 bg-red-50 text-red-700 px-2 py-0.5">Indispo</span>}
                        {p.bio && <span className="border border-green-300 bg-green-50 text-green-800 px-2 py-0.5">Bio</span>}
                        <Pencil size={14} className="text-neutral-400" />
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </>
  )
}
