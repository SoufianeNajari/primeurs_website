import Papa from 'papaparse';

export type CsvRow = Record<string, string>;

const MAX_OPTIONS = 6;

// Détection auto séparateur : Excel FR exporte avec ; , Sheets avec ,
function detectDelimiter(sample: string): ',' | ';' {
  const first = sample.split(/\r?\n/)[0] || '';
  const semi = (first.match(/;/g) || []).length;
  const comma = (first.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

export function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  // Strip BOM
  const cleaned = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(cleaned);
  const result = Papa.parse<CsvRow>(cleaned, {
    header: true,
    delimiter,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/^﻿/, ''),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  const errors = result.errors.map((e) => `ligne ${e.row}: ${e.message}`);
  return { rows: result.data, errors };
}

// Parse "4,30" ou "4.30" → 4.3 ; vide/invalide → null
export function parsePrix(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Nouveau format : opt1_libelle/opt1_prix … opt6_libelle/opt6_prix
// libellé vide → option ignorée. prix vide → poids incertain (prix=null).
export function parseOptionsFlat(row: CsvRow): Array<{ libelle: string; prix: number | null }> {
  const out: Array<{ libelle: string; prix: number | null }> = [];
  for (let i = 1; i <= MAX_OPTIONS; i++) {
    const libelle = (row[`opt${i}_libelle`] || '').trim();
    if (!libelle) continue;
    const prix = parsePrix(row[`opt${i}_prix`]);
    out.push({ libelle, prix });
  }
  return out;
}

// Ancien format (rétrocompat) : "libelle:prix|libelle:prix"
export function parseOptionsLegacy(raw: string | undefined | null): Array<{ libelle: string; prix: number | null }> {
  if (!raw) return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.lastIndexOf(':');
      if (idx === -1) return { libelle: part, prix: null };
      const libelle = part.slice(0, idx).trim();
      const prix = parsePrix(part.slice(idx + 1));
      if (prix == null && part.slice(idx + 1).trim() !== '') {
        return { libelle: part, prix: null };
      }
      return { libelle, prix };
    })
    .filter((o) => o.libelle.length > 0);
}

// Combine : essaie d'abord le format plat (opt1_libelle…), sinon retombe sur l'ancien `options` colonne unique.
export function parseOptions(rowOrLegacy: CsvRow | string | undefined | null): Array<{ libelle: string; prix: number | null }> {
  if (typeof rowOrLegacy === 'string' || rowOrLegacy == null) {
    return parseOptionsLegacy(rowOrLegacy);
  }
  const flat = parseOptionsFlat(rowOrLegacy);
  if (flat.length > 0) return flat;
  return parseOptionsLegacy(rowOrLegacy.options);
}

export function parseBool(v: string | undefined): boolean | undefined {
  if (v == null || v === '') return undefined;
  const s = v.toLowerCase().trim();
  if (['true', '1', 'oui', 'yes', 'vrai', 'x', 'o', 'y'].includes(s)) return true;
  if (['false', '0', 'non', 'no', 'faux', 'n'].includes(s)) return false;
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

// Sérialise une valeur pour CSV : entoure de "..." et double les guillemets si nécessaire
export function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (s === '') return '';
  if (/[",;\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
