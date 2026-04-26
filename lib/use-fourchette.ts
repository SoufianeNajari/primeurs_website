'use client'

import { useEffect, useState } from 'react';
import { FOURCHETTE_DEFAULT, type FourchetteBornes } from './fourchette';

const STORAGE_KEY = 'primeur_fourchette_bornes_v1';
const TTL_MS = 60 * 60 * 1000; // 1 h

type Cached = { bornes: FourchetteBornes; ts: number };

function readCache(): FourchetteBornes | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.bornes || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.bornes;
  } catch {
    return null;
  }
}

function writeCache(bornes: FourchetteBornes) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ bornes, ts: Date.now() } satisfies Cached));
  } catch {
    // sessionStorage indispo — pas grave
  }
}

export function useFourchetteBornes(): FourchetteBornes {
  const [bornes, setBornes] = useState<FourchetteBornes>(() => readCache() ?? FOURCHETTE_DEFAULT);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setBornes(cached);
      return;
    }
    let cancelled = false;
    fetch('/api/parametres/fourchette')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FourchetteBornes | null) => {
        if (cancelled || !data) return;
        if (typeof data.min === 'number' && typeof data.max === 'number') {
          setBornes(data);
          writeCache(data);
        }
      })
      .catch(() => {
        // garde le défaut, pas bloquant
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return bornes;
}
