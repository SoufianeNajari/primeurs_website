'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CloudOff, Loader2 } from 'lucide-react'
import { logout } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { useOfflineQueue } from './useOfflineQueue'

const LINKS = [
  { href: '/admin/dashboard', label: 'Stats' },
  { href: '/admin/produits', label: 'Catalogue' },
  { href: '/admin/categories', label: 'Catégories' },
  { href: '/admin/prix', label: 'Prix du jour' },
  { href: '/admin', label: 'Dispo rapide' },
  { href: '/admin/orders', label: 'Commandes' },
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/clients', label: 'Clients' },
]

function NetworkBadge() {
  const { online, pending } = useOfflineQueue()
  if (online && pending === 0) return null
  if (!online) {
    return (
      <span
        className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 ml-2"
        aria-label={`Hors ligne, ${pending} en attente`}
        title={`Hors ligne — ${pending} changement(s) en attente`}
      >
        <CloudOff size={11} />
        {pending > 0 ? pending : 'Off'}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 bg-neutral-800 text-white text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 ml-2"
      aria-label={`Synchronisation, ${pending} restant(s)`}
      title={`Synchronisation — ${pending} restant(s)`}
    >
      <Loader2 size={11} className="animate-spin" />
      {pending}
    </span>
  )
}

export default function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const currentLabel =
    LINKS.find((l) => (l.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(l.href)))?.label ?? 'Admin'

  async function handleLogout() {
    await logout()
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
      {/* Mobile bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-neutral-700"
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
        <div className="flex flex-col items-center leading-tight">
          <span className="font-serif text-base text-neutral-800 inline-flex items-center">
            Admin
            <NetworkBadge />
          </span>
          <span className="text-[10px] uppercase tracking-widest text-green-primary">{currentLabel}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Déconnexion"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-neutral-500"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          {LINKS.map((l) => {
            const active = l.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-5 py-4 border-b border-neutral-100 text-base ${
                  active ? 'text-green-primary font-medium bg-green-primary/5' : 'text-neutral-700'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Desktop bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-serif text-neutral-800 tracking-wide">Panel Admin</h1>
          <span className="text-[10px] uppercase tracking-widest text-green-primary bg-green-primary/10 px-2 py-1">
            Connecté
          </span>
          <NetworkBadge />
        </div>
        <div className="flex gap-6 flex-wrap items-center">
          {LINKS.map((l) => {
            const active = l.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-xs uppercase tracking-widest font-medium transition-colors ${
                  active ? 'text-green-primary' : 'text-neutral-600 hover:text-green-primary'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs uppercase tracking-widest font-medium text-neutral-400 hover:text-red-text transition-colors ml-2"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}
