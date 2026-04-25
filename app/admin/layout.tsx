import Link from 'next/link'
import LoginForm from './LoginForm'
import { isAdmin } from '@/lib/admin-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <nav className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-serif text-neutral-800 tracking-wide">Panel Admin</h1>
        <div className="flex gap-6 flex-wrap">
          <Link href="/admin/dashboard" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Stats</Link>
          <Link href="/admin/produits" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Catalogue</Link>
          <Link href="/admin" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Dispo rapide</Link>
          <Link href="/admin/orders" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Commandes</Link>
          <Link href="/admin/articles" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Articles</Link>
          <Link href="/admin/clients" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Clients</Link>
        </div>
      </nav>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  )
}
