'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Bypass du router cache Next.js : refetch le RSC à chaque navigation
 * dans le scope admin pour que les pages affichent toujours les données
 * fraîches du serveur (qui sont toutes en force-dynamic).
 */
export default function AdminRouterRefresh() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    router.refresh()
  }, [pathname, router])

  return null
}
