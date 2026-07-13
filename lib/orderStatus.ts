export type OrderStatut = 'reçue' | 'prête' | 'retirée' | 'annulée' | string;

export function statutLabel(s: OrderStatut): string {
  if (s === 'reçue') return 'Reçue';
  if (s === 'prête') return 'Prête';
  // Valeur DB inchangée ('retirée') — libellé « Livrée » (activité 100% livraison).
  if (s === 'retirée') return 'Livrée';
  if (s === 'annulée') return 'Annulée';
  return s;
}

export function statutBadgeCls(s: OrderStatut): string {
  if (s === 'reçue') return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (s === 'prête') return 'bg-green-primary text-white border border-green-primary';
  if (s === 'retirée') return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
  if (s === 'annulée') return 'bg-red-soft text-red-text border border-red-text/20';
  return 'bg-neutral-100 text-neutral-500 border border-neutral-200';
}
