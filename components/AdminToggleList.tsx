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

    } catch (error) {
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
    return <div className="text-center text-gray-500 py-8">Aucun produit trouvé.</div>
  }

  return (
    <div className="space-y-6 pb-10">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-full text-sm font-medium shadow-lg z-50 animate-fade-in-up">
          {toast}
        </div>
      )}

      {Object.entries(grouped).map(([categorie, items]) => (
        <div key={categorie} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="bg-gray-50/80 px-4 py-3 text-lg font-bold text-gray-800 border-b border-gray-100">
            {categorie}
          </h2>
          <ul className="divide-y divide-gray-100">
            {items.map((produit) => (
              <li key={produit.id} className="flex items-center justify-between px-4 min-h-[56px] hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col py-2">
                  <span className="text-[16px] font-medium text-gray-900 leading-snug">
                    {produit.nom}
                  </span>
                  <div className="mt-1">
                    {produit.disponible ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Dispo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
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
                  <div className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2 ${produit.disponible ? 'bg-[#1D9E75]' : 'bg-gray-200'} ${loadingIds.has(produit.id) ? 'opacity-50' : ''}`}>
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
