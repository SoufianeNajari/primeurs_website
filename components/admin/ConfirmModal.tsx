'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type ConfirmCtx = (opts: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<ConfirmCtx | null>(null)

export function useConfirm() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}

type PendingState = ConfirmOptions & { resolve: (v: boolean) => void }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null)

  const confirm = useCallback<ConfirmCtx>((opts) => {
    return new Promise((resolve) => setPending({ ...opts, resolve }))
  }, [])

  const close = (result: boolean) => {
    if (!pending) return
    pending.resolve(result)
    setPending(null)
  }

  const variant = pending?.variant ?? 'default'

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4"
          onClick={() => close(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 border border-neutral-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {pending.title && (
              <h3 className="text-lg font-serif text-neutral-800 mb-2">{pending.title}</h3>
            )}
            <p className="text-sm text-neutral-700 mb-6 whitespace-pre-line">{pending.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 min-h-[44px] px-4 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {pending.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 min-h-[44px] px-4 text-white border transition-colors ${
                  variant === 'danger'
                    ? 'bg-red-text border-red-text hover:bg-red-700'
                    : 'bg-green-primary border-green-primary hover:bg-green-dark'
                }`}
              >
                {pending.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
