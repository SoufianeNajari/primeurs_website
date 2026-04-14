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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form action={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Accès Admin</h1>
        
        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-100">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] text-lg outline-none transition-colors"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#1D9E75] text-white py-3.5 rounded-md font-medium text-lg hover:bg-[#15805e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Vérification...' : 'Accéder'}
        </button>
      </form>
    </div>
  )
}
