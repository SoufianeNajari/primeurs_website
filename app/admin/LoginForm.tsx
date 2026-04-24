'use client'

import { useState } from 'react'
import { login } from './actions'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const res = await login(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <form action={handleSubmit} className="bg-white p-10 border border-neutral-200 w-full max-w-sm space-y-8">
        <h1 className="text-3xl font-serif text-center text-neutral-800">Accès Admin</h1>
        
        {error && (
          <div className="text-red-text text-sm text-center bg-red-soft p-4 border border-red-text/20">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-[11px] uppercase tracking-widest font-medium text-neutral-500">
            Mot de passe
          </label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary text-lg outline-none transition-colors"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-green-primary text-white py-4 font-serif text-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-primary"
        >
          {loading ? 'Vérification...' : 'Accéder'}
        </button>
      </form>
    </div>
  )
}
