'use client'

import { useState } from 'react'
import { login } from './actions'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary text-lg outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-neutral-500 hover:text-neutral-700"
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
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
