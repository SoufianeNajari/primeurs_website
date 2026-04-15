import { supabaseAdmin } from '@/lib/supabase'
import AdminToggleList from '@/components/AdminToggleList'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Fetch tous les produits via service role (admin) pour être sûr de tout voir
  const { data: produits, error } = await supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, disponible')
    .order('categorie')
    .order('nom')

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-soft text-red-text p-4 border border-red-text/20">
          Erreur de chargement des produits: {error.message}
        </div>
      </div>
    )
  }

  // Grouper par catégorie
  const groupedProducts = (produits || []).reduce((acc, produit) => {
    if (!acc[produit.categorie]) acc[produit.categorie] = []
    acc[produit.categorie].push(produit)
    return acc
  }, {} as Record<string, typeof produits>)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Disponibilité des produits</h2>
        <p className="text-sm text-neutral-500">Activez ou désactivez les produits de la boutique en temps réel.</p>
      </div>
      <AdminToggleList initialProducts={groupedProducts} />
    </div>
  )
}
