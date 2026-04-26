import { getParam } from './parametres';

export const PARAM_FOURCHETTE_MIN = 'fourchette_min_pct';
export const PARAM_FOURCHETTE_MAX = 'fourchette_max_pct';

export const FOURCHETTE_DEFAULT: FourchetteBornes = { min: 0.95, max: 1.1 };

export type FourchetteBornes = { min: number; max: number };

function sanitizePct(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export async function getFourchetteBornes(): Promise<FourchetteBornes> {
  const [min, max] = await Promise.all([
    getParam<number>(PARAM_FOURCHETTE_MIN, FOURCHETTE_DEFAULT.min),
    getParam<number>(PARAM_FOURCHETTE_MAX, FOURCHETTE_DEFAULT.max),
  ]);
  return {
    min: sanitizePct(min, FOURCHETTE_DEFAULT.min),
    max: sanitizePct(max, FOURCHETTE_DEFAULT.max),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcFourchette(total: number, bornes: FourchetteBornes): { min: number; max: number } {
  return {
    min: round2(total * bornes.min),
    max: round2(total * bornes.max),
  };
}

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatFourchette(f: { min: number; max: number }): string {
  return `entre ${euro.format(f.min)} et ${euro.format(f.max)}`;
}
