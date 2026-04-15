'use client'

import { useState } from 'react'

type Product = {
  id: string
  nom: string
  categorie: string
  disponible: boolean
}

type Props = {
  initialProducts: Record<string, Product[]>
}

export default function AdminToggleList({ initialProducts }: Props) {
  // On aplatit les produits pour gérer un seul état local
  const flatProducts = Object.values(initialProducts).flat()
  const [products, setProducts] = useState<Product[]>(flatProducts)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (loadingIds.has(id)) return

    const newStatus = !currentStatus

    // Optimistic update : on change l'état tout de suite
    setProducts(prev => prev.map(p => p.id === id ? { ...p, disponible: newStatus } : p))
    setLoadingIds(prev => new Set(prev).add(id))

    try {
      const res = await fetch('/api/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, disponible: newStatus })
      })

      if (!res.ok) throw new Error('Erreur réseau')
      
      const data = await res.json()
      if (!data.success) throw new Error('Erreur API')

    } catch (err) {
      console.error(err);
      // Rollback en cas d'erreur
      setProducts(prev => prev.map(p => p.id === id ? { ...p, disponible: currentStatus } : p))
      showToast("Erreur de mise à jour")
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Regrouper à nouveau pour l'affichage selon l'état actuel
  const grouped = products.reduce((acc, p) => {
    if (!acc[p.categorie]) acc[p.categorie] = []
    acc[p.categorie].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  if (products.length === 0) {
    return <div className="text-center text-neutral-500 py-8 font-serif">Aucun produit trouvé.</div>
  }

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-neutral-800 text-white px-5 py-3 text-sm font-medium shadow-md animate-fade-in-up pointer-events-auto">
            {toast}
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([categorie, items]) => (
        <div key={categorie} className="bg-white border border-neutral-200 overflow-hidden">
          <h2 className="bg-neutral-50 px-4 py-3 text-lg font-serif text-neutral-800 border-b border-neutral-200">
            {categorie}
          </h2>
          <ul className="divide-y divide-neutral-100">
            {items.map((produit) => (
              <li key={produit.id} className="flex items-center justify-between px-4 min-h-[60px] hover:bg-neutral-50 transition-colors">
                <div className="flex flex-col py-2">
                  <span className="text-[16px] font-serif text-neutral-800 leading-snug">
                    {produit.nom}
                  </span>
                  <div className="mt-1">
                    {produit.disponible ? (
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
                
                <button
                  type="button"
                  onClick={() => handleToggle(produit.id, produit.disponible)}
                  disabled={loadingIds.has(produit.id)}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] focus:outline-none pl-4"
                  role="switch"
                  aria-checked={produit.disponible}
                  aria-label={`Disponibilité de ${produit.nom}`}
                >
                  <div className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 ${produit.disponible ? 'bg-green-primary' : 'bg-neutral-300'} ${loadingIds.has(produit.id) ? 'opacity-50' : ''}`}>
                    <span 
                      aria-hidden="true" 
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${produit.disponible ? 'translate-x-6' : 'translate-x-0'}`} 
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
