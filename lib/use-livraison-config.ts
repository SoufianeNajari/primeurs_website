'use client'

import { useEffect, useState } from 'react';
import {
  DEFAULT_CUTOFF_VEILLE_HEURE,
  DEFAULT_FRAIS_LIVRAISON_CENTS,
  DEFAULT_MIN_COMMANDE_CENTS,
  DEFAULT_SEUIL_LIVRAISON_GRATUITE_CENTS,
} from './livraison';
import type { LivraisonConfig } from '@/app/api/parametres/livraison/route';

// v2 : ajout seuilGratuitCents — bump pour invalider sessionStorage des
// clients déjà en place sans ce champ.
const STORAGE_KEY = 'primeur_livraison_config_v2';
const TTL_MS = 60 * 60 * 1000; // 1 h

const FALLBACK: LivraisonConfig = {
  fraisCents: DEFAULT_FRAIS_LIVRAISON_CENTS,
  minCents: DEFAULT_MIN_COMMANDE_CENTS,
  cutoffHeure: DEFAULT_CUTOFF_VEILLE_HEURE,
  seuilGratuitCents: DEFAULT_SEUIL_LIVRAISON_GRATUITE_CENTS,
};

type Cached = { cfg: LivraisonConfig; ts: number };

function readCache(): LivraisonConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.cfg || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.cfg;
  } catch {
    return null;
  }
}

function writeCache(cfg: LivraisonConfig) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cfg, ts: Date.now() } satisfies Cached));
  } catch {
    // sessionStorage indispo — pas grave
  }
}

export function useLivraisonConfig(): LivraisonConfig {
  const [cfg, setCfg] = useState<LivraisonConfig>(() => readCache() ?? FALLBACK);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCfg(cached);
      return;
    }
    let cancelled = false;
    fetch('/api/parametres/livraison')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LivraisonConfig | null) => {
        if (cancelled || !data) return;
        if (
          typeof data.fraisCents === 'number' &&
          typeof data.minCents === 'number' &&
          typeof data.cutoffHeure === 'number' &&
          typeof data.seuilGratuitCents === 'number'
        ) {
          setCfg(data);
          writeCache(data);
        }
      })
      .catch(() => {
        // garde le défaut
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return cfg;
}
