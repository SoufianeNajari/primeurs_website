'use client';

import { formatEuros } from '@/lib/format';

type Props = {
  // Sous-total panier estimé en centimes. `null` = panier contient des
  // produits à la pesée, on ne peut pas projeter de jauge fiable.
  sousTotalCents: number | null;
  minCents: number;
  fraisCents: number;
  seuilGratuitCents: number;
};

// Barre de progression dynamique :
// 1. Sous le minimum commande → "Encore X € pour commander"
// 2. Au-dessus du min mais sous le seuil livraison offerte (si applicable)
//    → "Encore Y € pour la livraison offerte"
// 3. Seuil atteint → message de célébration
//
// Si fraisCents == 0 ou seuilGratuitCents == 0 : pas de 2e jauge (rien à débloquer).
// Si sousTotalCents est null (poids incertain) : on n'affiche aucune jauge —
// le sous-total est trop volatile pour une promesse chiffrée.
export default function FreeShippingBar({
  sousTotalCents,
  minCents,
  fraisCents,
  seuilGratuitCents,
}: Props) {
  if (sousTotalCents == null) return null;

  const seuilActif = seuilGratuitCents > 0 && fraisCents > 0;

  // Étape 1 : minimum commande pas atteint
  if (sousTotalCents < minCents) {
    const manqueCents = minCents - sousTotalCents;
    const pct = Math.max(4, Math.min(100, Math.round((sousTotalCents / minCents) * 100)));
    return (
      <Bar
        pct={pct}
        tone="neutral"
        message={
          <>
            Encore <strong className="font-semibold text-neutral-800">{formatEuros(manqueCents)}</strong>{' '}
            pour commander.
          </>
        }
      />
    );
  }

  // Étape 2/3 : minimum atteint, on regarde le seuil livraison offerte
  if (seuilActif) {
    if (sousTotalCents < seuilGratuitCents) {
      const manqueCents = seuilGratuitCents - sousTotalCents;
      const pct = Math.max(4, Math.min(100, Math.round((sousTotalCents / seuilGratuitCents) * 100)));
      return (
        <Bar
          pct={pct}
          tone="progress"
          message={
            <>
              Encore <strong className="font-semibold text-green-dark">{formatEuros(manqueCents)}</strong>{' '}
              pour la livraison offerte.
            </>
          }
        />
      );
    }
    return (
      <Bar
        pct={100}
        tone="success"
        message={<>🎉 Livraison offerte !</>}
      />
    );
  }

  // Minimum atteint, pas de seuil applicable → on n'affiche rien
  // (pour éviter une jauge à 100% sans message utile).
  return null;
}

function Bar({
  pct,
  tone,
  message,
}: {
  pct: number;
  tone: 'neutral' | 'progress' | 'success';
  message: React.ReactNode;
}) {
  const fillClass =
    tone === 'success'
      ? 'bg-green-dark'
      : tone === 'progress'
        ? 'bg-green-primary'
        : 'bg-neutral-400';

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-neutral-600 leading-snug">{message}</div>
      <div
        className="h-1.5 w-full bg-neutral-200 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${fillClass} h-full transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
