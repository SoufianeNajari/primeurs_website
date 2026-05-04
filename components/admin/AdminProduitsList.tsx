'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GripVertical, Pencil, Search, X } from 'lucide-react'
import type { Product } from '@/lib/produit'
import { formatPrixResume } from '@/lib/produit'
import { useToast } from '@/components/admin/Toast'

const SEARCH_STORAGE_KEY = 'admin_produits_search'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

type DragState = { categorie: string; from: number } | null

export default function AdminProduitsList({ produits: initial }: { produits: Product[] }) {
  const [produits, setProduits] = useState<Product[]>(initial)
  const [search, setSearch] = useState('')
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

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return produits
    return produits.filter((p) => normalize(p.nom).includes(q) || normalize(p.categorie).includes(q))
  }, [produits, search])

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Product[]>>((acc, p) => {
      ;(acc[p.categorie] ||= []).push(p)
      return acc
    }, {})
  }, [filtered])

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
      // Revert : on remet l'état initial
      setProduits(initial)
    }
  }

  const handleDrop = (categorie: string, items: Product[], to: number) => {
    if (!drag || drag.categorie !== categorie) return
    if (drag.from === to) return
    const next = [...items]
    const [moved] = next.splice(drag.from, 1)
    next.splice(to, 0, moved)
    // Mettre à jour produits global : remplacer la sous-liste de cette catégorie
    setProduits((prev) => {
      const others = prev.filter((p) => p.categorie !== categorie)
      return [...others, ...next].sort((a, b) => {
        // garder l'ordre par catégorie alphabétique pour l'affichage initial
        if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie)
        // dans la même catégorie, garder l'ordre du tableau next
        if (a.categorie === categorie) {
          return next.findIndex((x) => x.id === a.id) - next.findIndex((x) => x.id === b.id)
        }
        return 0
      })
    })
    persistOrder(categorie, next)
  }

  return (
    <>
      <div className="relative mb-6">
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

      {!dndEnabled && (
        <p className="text-[11px] text-neutral-500 italic mb-3">
          Réorganisation désactivée pendant la recherche.
        </p>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          {search ? 'Aucun produit ne correspond à cette recherche.' : 'Aucun produit pour l’instant.'}
        </div>
      ) : (
        Object.entries(grouped).map(([categorie, items]) => (
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
