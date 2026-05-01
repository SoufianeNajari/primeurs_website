'use client'

import { useState, useTransition } from 'react'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { setCommandesBloquees } from '../actions'
import { useConfirm } from '@/components/admin/ConfirmModal'
import { useToast } from '@/components/admin/Toast'

export default function CommandesBloqueesToggle({ initial }: { initial: boolean }) {
  const [bloque, setBloque] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  async function toggle() {
    const next = !bloque
    if (next) {
      const ok = await confirm({
        title: 'Bloquer les commandes ?',
        message: 'La boutique sera inaccessible aux clients tant que vous ne réactivez pas les commandes.',
        confirmLabel: 'Bloquer',
        variant: 'danger',
      })
      if (!ok) return
    }
    setError(null)
    startTransition(async () => {
      const res = await setCommandesBloquees(next)
      if (res.success) {
        setBloque(next)
        toast.success(next ? 'Commandes bloquées' : 'Commandes rouvertes')
      } else {
        setError(res.error || 'Erreur')
        toast.error(res.error || 'Erreur')
      }
    })
  }

  return (
    <section
      className={`mb-10 border p-5 ${
        bloque ? 'bg-red-50 border-red-200' : 'bg-white border-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {bloque ? (
            <Lock size={20} className="text-red-600 mt-0.5 shrink-0" strokeWidth={1.75} />
          ) : (
            <Unlock size={20} className="text-neutral-500 mt-0.5 shrink-0" strokeWidth={1.75} />
          )}
          <div>
            <h3 className="text-sm font-medium text-neutral-800">
              {bloque ? 'Commandes bloquées' : 'Commandes ouvertes'}
            </h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-xl">
              {bloque
                ? "La boutique est inaccessible. Les clients voient un message indiquant que les commandes sont temporairement indisponibles."
                : "Les clients peuvent commander normalement. Activez le blocage en cas d'absence ou de rupture générale."}
            </p>
            {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={bloque}
          onClick={toggle}
          disabled={isPending}
          className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors disabled:opacity-50 ${
            bloque ? 'bg-red-600' : 'bg-neutral-300'
          }`}
          aria-label="Basculer le blocage des commandes"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center ${
              bloque ? 'translate-x-7' : ''
            }`}
          >
            {isPending && <Loader2 size={12} className="animate-spin text-neutral-500" />}
          </span>
        </button>
      </div>
    </section>
  )
}
