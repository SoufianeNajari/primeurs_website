'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type ToastOptions = { action?: ToastAction; durationMs?: number }
type Toast = { id: number; kind: ToastKind; message: string; action?: ToastAction; durationMs: number }

type ToastCtx = {
  show: (message: string, kind?: ToastKind, options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((message: string, kind: ToastKind = 'info', options?: ToastOptions) => {
    const id = Date.now() + Math.random()
    const durationMs = options?.durationMs ?? 3500
    setToasts((t) => [...t, { id, kind, message, action: options?.action, durationMs }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), durationMs)
  }, [])

  const value: ToastCtx = {
    show,
    success: (m, opts) => show(m, 'success', opts),
    error: (m, opts) => show(m, 'error', opts),
    info: (m, opts) => show(m, 'info', opts),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const styles =
    toast.kind === 'success'
      ? 'bg-green-primary text-white border-green-dark'
      : toast.kind === 'error'
      ? 'bg-red-text text-white border-red-text'
      : 'bg-neutral-800 text-white border-neutral-900'

  return (
    <div
      className={`pointer-events-auto px-4 py-3 border shadow-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${styles} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <span className="flex-1 min-w-0">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick()
            onDismiss()
          }}
          className="shrink-0 underline underline-offset-2 text-[11px] uppercase tracking-widest font-semibold hover:opacity-80"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
