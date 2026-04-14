import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import AdminToggleList from '@/components/AdminToggleList'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_auth')

  if (!authCookie || authCookie.value !== 'true') {
    return <LoginForm />
  }

  // Fetch tous les produits via service role (admin) pour être sûr de tout voir
  const { data: produits, error } = await supabaseAdmin
    .from('produits')
    .select('id, nom, categorie, disponible')
    .order('categorie')
    .order('nom')

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
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
    <main className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Gestion des produits</h1>
      </div>
      <div className="p-4 max-w-2xl mx-auto">
        <AdminToggleList initialProducts={groupedProducts} />
      </div>
    </main>
  )
}
