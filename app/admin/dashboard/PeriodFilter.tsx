'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const PERIODS: { value: string; label: string }[] = [
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
  { value: 'month', label: 'Mois' },
  { value: '365d', label: '12 mois' },
  { value: 'custom', label: 'Période…' },
]

function todayParisKey(): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date())
}

export default function PeriodFilter({
  period,
  from,
  to,
  statut,
}: {
  period: string
  from: string | null
  to: string | null
  statut: 'active' | 'all'
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [showCustom, setShowCustom] = useState(period === 'custom')
  const [fromDraft, setFromDraft] = useState(from || '')
  const [toDraft, setToDraft] = useState(to || todayParisKey())

  useEffect(() => {
    setShowCustom(period === 'custom')
  }, [period])

  function buildHref(next: Partial<{ period: string; from: string | null; to: string | null; statut: string }>): string {
    const sp = new URLSearchParams(params?.toString() || '')
    if (next.period !== undefined) sp.set('period', next.period)
    if (next.from !== undefined) {
      if (next.from) sp.set('from', next.from); else sp.delete('from')
    }
    if (next.to !== undefined) {
      if (next.to) sp.set('to', next.to); else sp.delete('to')
    }
    if (next.statut !== undefined) sp.set('statut', next.statut)
    return `/admin/dashboard?${sp.toString()}`
  }

  function applyCustom() {
    if (!fromDraft || !toDraft) return
    router.push(buildHref({ period: 'custom', from: fromDraft, to: toDraft }))
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mr-1">Période</span>
        {PERIODS.map((p) => {
          const active = period === p.value
          if (p.value === 'custom') {
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
                  active
                    ? 'border-green-primary text-green-primary bg-green-primary/5'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
                }`}
              >
                {p.label}
              </button>
            )
          }
          return (
            <a
              key={p.value}
              href={buildHref({ period: p.value, from: null, to: null })}
              className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
                active
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
              }`}
            >
              {p.label}
            </a>
          )
        })}
      </div>

      {showCustom && (
        <div className="flex flex-wrap gap-2 items-end bg-neutral-50 border border-neutral-200 p-3">
          <label className="flex flex-col text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
            Du
            <input
              type="date"
              value={fromDraft}
              max={toDraft || todayParisKey()}
              onChange={(e) => setFromDraft(e.target.value)}
              className="mt-1 border border-neutral-300 px-2 py-1.5 text-sm font-sans text-neutral-800 normal-case tracking-normal"
            />
          </label>
          <label className="flex flex-col text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
            Au
            <input
              type="date"
              value={toDraft}
              min={fromDraft || undefined}
              max={todayParisKey()}
              onChange={(e) => setToDraft(e.target.value)}
              className="mt-1 border border-neutral-300 px-2 py-1.5 text-sm font-sans text-neutral-800 normal-case tracking-normal"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!fromDraft || !toDraft || fromDraft > toDraft}
            className="text-[11px] uppercase tracking-widest font-medium px-3 py-2 border border-green-primary text-green-primary hover:bg-green-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Appliquer
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mr-1">Statut</span>
        <a
          href={buildHref({ statut: 'active' })}
          className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
            statut === 'active'
              ? 'border-green-primary text-green-primary bg-green-primary/5'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
          }`}
        >
          Hors annulées
        </a>
        <a
          href={buildHref({ statut: 'all' })}
          className={`text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
            statut === 'all'
              ? 'border-green-primary text-green-primary bg-green-primary/5'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800'
          }`}
        >
          Toutes
        </a>
      </div>
    </div>
  )
}
