'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// Composant d'autocomplete d'adresse basé sur la Base Adresse Nationale
// (api-adresse.data.gouv.fr — gratuit, sans clé, opéré par l'État).
//
// Au choix d'une suggestion, on remonte au parent :
//  - le libellé court (« 12 rue de la Paix »)
//  - la ville et le code postal (pour pré-sélection du select Ville)
//  - le `banId` canonique (clé d'anti-fraude côté codes promos)
//
// Si l'utilisateur tape sans sélectionner, on conserve la saisie libre
// mais `banId` reste null. La commande passera sans check d'adresse —
// on garde une UX permissive et on accepte la perte d'anti-fraude
// dans ce cas marginal.

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
// que la tournée dessert. Si vide, suggestions globales.
const POSTCODES = ['77340', '77680', '77330', '77150', '77184', '94420', '94350', '93160'];

async function fetchSuggestions(q: string, signal: AbortSignal): Promise<AdresseSuggestion[]> {
  if (q.trim().length < 4) return [];
  const params = new URLSearchParams({
    q: q.trim(),
    limit: '8',
    autocomplete: '1',
    type: 'housenumber',
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
  // Garde uniquement les communes desservies
  const filtered = all.filter((s) => POSTCODES.includes(s.codePostal));
  return filtered.length > 0 ? filtered : [];
}

export default function AdresseAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AdresseSuggestion) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AdresseSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [touched, setTouched] = useState(false);
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
    if (value.trim().length < 4) {
      setSuggestions([]);
      setLoading(false);
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
        })
        .catch(() => {
          // ignore (abort or network)
        })
        .finally(() => setLoading(false));
    }, 250);
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
        className="w-full px-4 py-3 pr-10 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
      />
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 size={16} className="animate-spin text-neutral-400" />
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
      {touched && value.trim().length >= 4 && !loading && suggestions.length === 0 && open === false && (
        <p className="text-[11px] text-neutral-500 italic mt-1">
          Aucune adresse trouvée dans notre zone de livraison. Continuez la saisie ou vérifiez l&apos;orthographe.
        </p>
      )}
    </div>
  );
}
