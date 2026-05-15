'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Check, AlertCircle } from 'lucide-react';

// Composant d'autocomplete d'adresse basé sur la Base Adresse Nationale
// (api-adresse.data.gouv.fr — gratuit, sans clé, opéré par l'État).
//
// Au choix d'une suggestion, on remonte au parent :
//  - le libellé court (« 12 rue de la Paix »)
//  - la ville et le code postal (pour pré-sélection du select Ville)
//  - le `banId` canonique (clé d'anti-fraude côté codes promos)
//
// Le parent doit refuser la soumission si `validated` n'est pas vrai :
// sans `banId`, l'anti-fraude par adresse ne s'applique pas. Un visuel
// (bordure ambre + AlertCircle) signale tant qu'aucune suggestion n'est
// pickée.

export type AdresseSuggestion = {
  label: string;
  ville: string;
  codePostal: string;
  banId: string;
};

type Feature = {
  properties: {
    id: string;
    label: string;
    name: string;
    postcode: string;
    city: string;
    type: 'housenumber' | 'street' | 'locality' | 'municipality';
  };
};

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

// Codes postaux servis — limite la liste des suggestions aux communes
// que la tournée dessert.
const POSTCODES = ['77340', '77680', '77330', '77150', '77184', '94420', '94350', '93160'];

// Centre approximatif de la zone livrée (Pontault-Combault) — sert à
// biaiser le ranking BAN pour que les rues locales remontent en tête,
// même quand un même nom de rue existe ailleurs en France.
const BIAS_LAT = '48.795';
const BIAS_LON = '2.609';

const MIN_CHARS = 3;

async function fetchSuggestions(q: string, signal: AbortSignal): Promise<AdresseSuggestion[]> {
  if (q.trim().length < MIN_CHARS) return [];
  const params = new URLSearchParams({
    q: q.trim(),
    limit: '15',
    autocomplete: '1',
    lat: BIAS_LAT,
    lon: BIAS_LON,
  });
  const res = await fetch(`${BAN_URL}?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features: Feature[] };
  const all = (data.features || []).map((f) => ({
    label: f.properties.label,
    ville: f.properties.city,
    codePostal: f.properties.postcode,
    banId: f.properties.id,
  }));
  // Garde uniquement les communes desservies. Dédup sur banId au cas où
  // la BAN retourne plusieurs entrées pour la même adresse.
  const seen = new Set<string>();
  const filtered: AdresseSuggestion[] = [];
  for (const s of all) {
    if (!POSTCODES.includes(s.codePostal)) continue;
    if (seen.has(s.banId)) continue;
    seen.add(s.banId);
    filtered.push(s);
  }
  return filtered;
}

export default function AdresseAutocomplete({
  value,
  validated,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  // True quand l'utilisateur a sélectionné une suggestion BAN — au parent
  // de remettre à false dès qu'il modifie à nouveau la saisie.
  validated: boolean;
  onChange: (v: string) => void;
  onSelect: (s: AdresseSuggestion) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AdresseSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [touched, setTouched] = useState(false);
  const [lastFetchHadResults, setLastFetchHadResults] = useState<boolean | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ferme la liste si clic à l'extérieur
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounce de la requête
  useEffect(() => {
    if (!touched) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      setLastFetchHadResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetchSuggestions(value, ctrl.signal)
        .then((r) => {
          setSuggestions(r);
          setHighlight(0);
          setOpen(r.length > 0);
          setLastFetchHadResults(r.length > 0);
        })
        .catch(() => {
          // ignore (abort or network)
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, touched]);

  function pick(s: AdresseSuggestion) {
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        id="adresse"
        name="adresse"
        required
        autoComplete="off"
        placeholder="Commencez à taper votre adresse…"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setTouched(true);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`w-full px-4 py-3 pr-10 border rounded-sm focus:ring-1 outline-none transition-colors ${
          validated
            ? 'border-green-primary bg-green-soft/30 focus:ring-green-primary focus:border-green-primary'
            : value.trim().length >= MIN_CHARS && !loading
            ? 'border-amber-300 bg-amber-50/40 focus:ring-green-primary focus:border-green-primary'
            : 'border-neutral-300 focus:ring-green-primary focus:border-green-primary'
        }`}
      />
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 size={16} className="animate-spin text-neutral-400" />
        ) : validated ? (
          <Check size={18} className="text-green-primary" strokeWidth={2} />
        ) : value.trim().length >= MIN_CHARS ? (
          <AlertCircle size={16} className="text-amber-500" strokeWidth={1.8} />
        ) : (
          <MapPin size={16} className="text-neutral-400" strokeWidth={1.5} />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-neutral-200 shadow-md max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.banId}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-4 py-2 text-sm cursor-pointer ${
                i === highlight ? 'bg-green-soft/40 text-green-dark' : 'text-neutral-700'
              }`}
            >
              <div className="font-medium">{s.label}</div>
            </li>
          ))}
        </ul>
      )}
      {validated ? (
        <p className="text-[11px] text-green-dark mt-1">
          Adresse validée.
        </p>
      ) : touched && value.trim().length >= MIN_CHARS && !loading && lastFetchHadResults === false ? (
        <p className="text-[11px] text-amber-700 mt-1">
          Aucune adresse trouvée dans la zone livrée. Précisez le numéro et la rue (ex : « 5 allée des granges pontault »).
        </p>
      ) : value.trim().length >= MIN_CHARS && !loading ? (
        <p className="text-[11px] text-amber-700 mt-1">
          Sélectionnez votre adresse dans la liste de suggestions pour la valider.
        </p>
      ) : null}
    </div>
  );
}
