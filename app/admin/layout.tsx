import { cookies } from 'next/headers'
import Link from 'next/link'
import LoginForm from './LoginForm'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_auth')

  if (!authCookie || authCookie.value !== 'true') {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <nav className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-serif text-neutral-800 tracking-wide">Panel Admin</h1>
        <div className="flex gap-6">
          <Link href="/admin" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Produits</Link>
          <Link href="/admin/orders" className="text-xs uppercase tracking-widest font-medium text-neutral-600 hover:text-green-primary transition-colors">Commandes</Link>
        </div>
      </nav>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  )
}
