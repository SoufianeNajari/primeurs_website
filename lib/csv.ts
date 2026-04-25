import Papa from 'papaparse';

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const result = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/﻿/g, ''),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  const errors = result.errors.map((e) => `ligne ${e.row}: ${e.message}`);
  return { rows: result.data, errors };
}

// Parse "libelle1:prix1|libelle2:prix2" — prix optionnel.
// Exemples : "au kg:3.50" → [{libelle:"au kg", prix:3.5}]
//            "la botte" → [{libelle:"la botte", prix:null}]
//            "au kg:3.50|la botte:1.20"
export function parseOptions(raw: string | undefined | null): Array<{ libelle: string; prix: number | null }> {
  if (!raw) return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.lastIndexOf(':');
      if (idx === -1) {
        return { libelle: part, prix: null };
      }
      const libelle = part.slice(0, idx).trim();
      const prixStr = part.slice(idx + 1).trim().replace(',', '.');
      const prix = prixStr === '' ? null : Number(prixStr);
      if (prix != null && Number.isNaN(prix)) {
        return { libelle: part, prix: null }; // fallback: tout est libelle
      }
      return { libelle, prix };
    })
    .filter((o) => o.libelle.length > 0);
}

export function parseBool(v: string | undefined): boolean | undefined {
  if (v == null || v === '') return undefined;
  const s = v.toLowerCase();
  if (['true', '1', 'oui', 'yes', 'vrai', 'x'].includes(s)) return true;
  if (['false', '0', 'non', 'no', 'faux'].includes(s)) return false;
  return undefined;
}

export function parseInt12(v: string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

export function parseIntOrNull(v: string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
