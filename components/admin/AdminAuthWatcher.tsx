'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/admin/Toast'

const ADMIN_FETCH_PATTERNS = [
  '/api/admin/',
  '/api/toggle',
  '/api/orders/',
  '/api/parametres/',
]

function isAdminEndpoint(input: RequestInfo | URL): boolean {
  let url: string
  if (typeof input === 'string') url = input
  else if (input instanceof URL) url = input.pathname
  else url = input.url
  return ADMIN_FETCH_PATTERNS.some((p) => url.includes(p))
}

export default function AdminAuthWatcher() {
  const router = useRouter()
  const toast = useToast()
  const triggeredRef = useRef(false)

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      if (response.status === 401 && isAdminEndpoint(input) && !triggeredRef.current) {
        triggeredRef.current = true
        toast.error('Session expirée — reconnecte-toi')
        router.push('/admin')
        router.refresh()
      }
      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [router, toast])

  return null
}
