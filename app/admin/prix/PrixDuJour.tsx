'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, CheckCheck, Search, X, Filter } from 'lucide-react';
import type { ProduitOption } from '@/lib/produit';
import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/ConfirmModal';

type ProduitPrix = {
  id: string;
  nom: string;
  categorie: string;
  slug?: string | null;
  options: ProduitOption[];
  disponible: boolean;
  variete?: string | null;
  prix_updated_at: string;
};

type Filtre = 'tous' | 'a_actualiser' | 'indispo';

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;
const FILTRE_STORAGE_KEY = 'prix_filtre';
const CATEGORIES_STORAGE_KEY = 'prix_categories';

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function freshnessLevel(prixUpdatedAt: string): 'fresh' | 'medium' | 'stale' {
  const ageMs = Date.now() - new Date(prixUpdatedAt).getTime();
  if (ageMs < HOURS_24) return 'fresh';
  if (ageMs < HOURS_72) return 'medium';
  return 'stale';
}

function relativeAge(prixUpdatedAt: string): string {
  const ageMs = Date.now() - new Date(prixUpdatedAt).getTime();
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function formatPrixInput(prix: number | null | undefined): string {
  if (prix == null) return '';
  return String(prix).replace('.', ',');
}

function parsePrixInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export default function PrixDuJour({ initialProduits }: { initialProduits: ProduitPrix[] }) {
  const [produits, setProduits] = useState<ProduitPrix[]>(initialProduits);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [showCats, setShowCats] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const produitsRef = useRef<ProduitPrix[]>(initialProduits);
  useEffect(() => { produitsRef.current = produits; }, [produits]);

  // Bypass router cache : refetch au mount + resync state quand le serveur renvoie de nouvelles données
  useEffect(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (savingKey) return;
    setProduits(initialProduits);
  }, [initialProduits, savingKey]);

  // Charger filtre + catégories persistés
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTRE_STORAGE_KEY);
      if (saved === 'tous' || saved === 'a_actualiser' || saved === 'indispo') {
        setFiltre(saved);
      }
      const cats = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (cats) {
        const parsed = JSON.parse(cats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCats(new Set(parsed));
          setShowCats(true);
        }
      }
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  function changeFiltre(f: Filtre) {
    setFiltre(f);
    try {
      localStorage.setItem(FILTRE_STORAGE_KEY, f);
    } catch {
      /* */
    }
  }

  function toggleCat(cat: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* */
      }
      return next;
    });
  }

  function clearCats() {
    setSelectedCats(new Set());
    try {
      localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    } catch {
      /* */
    }
  }

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of produits) set.add(p.categorie);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [produits]);

  const normalizedSearch = normalizeText(search.trim());

  const filtered = useMemo(() => {
    let list = produits;
    if (filtre === 'a_actualiser') {
      list = list.filter((p) => freshnessLevel(p.prix_updated_at) === 'stale');
    } else if (filtre === 'indispo') {
      list = list.filter((p) => !p.disponible);
    }
    if (selectedCats.size > 0) {
      list = list.filter((p) => selectedCats.has(p.categorie));
    }
    if (normalizedSearch) {
      list = list.filter((p) => {
        const haystack = normalizeText(`${p.nom} ${p.variete ?? ''} ${p.categorie}`);
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [produits, filtre, selectedCats, normalizedSearch]);

  const counts = useMemo(() => {
    const stale = produits.filter((p) => freshnessLevel(p.prix_updated_at) === 'stale').length;
    const indispo = produits.filter((p) => !p.disponible).length;
    return { tous: produits.length, stale, indispo };
  }, [produits]);

  async function saveOptionPrix(produitId: string, optionId: string, newPrix: number | null, isUndo = false) {
    const key = `${produitId}:${optionId}`;
    const produit = produitsRef.current.find((p) => p.id === produitId);
    if (!produit) return;

    const previousPrix = produit.options.find((o) => o.id === optionId)?.prix ?? null;
    if (previousPrix === newPrix) return;

    setSavingKey(key);
    setErrorKey(null);

    const nextOptions = produit.options.map((o) => (o.id === optionId ? { ...o, prix: newPrix } : o));
    setProduits((prev) =>
      prev.map((p) =>
        p.id === produitId
          ? { ...p, options: nextOptions, prix_updated_at: new Date().toISOString() }
          : p,
      ),
    );

    try {
      const res = await fetch(`/api/admin/produits/${produitId}/prix`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: [{ id: optionId, prix: newPrix }] }),
      });
      if (!res.ok) throw new Error('save failed');
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
      if (isUndo) {
        toast.success(newPrix == null ? 'Annulé : prix remis à la remise' : `Annulé : prix remis à ${newPrix}€`);
      } else {
        const message = newPrix == null ? 'Prix retiré (à la remise)' : `Prix sauvé : ${newPrix}€`;
        toast.success(message, {
          durationMs: 30000,
          action: {
            label: 'Annuler',
            onClick: () => {
              saveOptionPrix(produitId, optionId, previousPrix, true);
            },
          },
        });
      }
    } catch (err) {
      console.error(err);
      setErrorKey(key);
      setProduits((prev) =>
        prev.map((p) =>
          p.id === produitId
            ? {
                ...p,
                options: p.options.map((o) =>
                  o.id === optionId ? { ...o, prix: previousPrix } : o,
                ),
              }
            : p,
        ),
      );
      toast.error('Échec de la sauvegarde');
    } finally {
      setSavingKey((k) => (k === key ? null : k));
    }
  }

  async function toggleDisponible(produitId: string, next: boolean) {
    const previous = produits.find((p) => p.id === produitId)?.disponible;
    if (previous === undefined) return;

    setProduits((prev) => prev.map((p) => (p.id === produitId ? { ...p, disponible: next } : p)));

    try {
      const res = await fetch('/api/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: produitId, disponible: next }),
      });
      if (!res.ok) throw new Error('toggle failed');
      toast.success(next ? 'Produit disponible' : 'Produit indisponible');
    } catch (err) {
      console.error(err);
      setProduits((prev) =>
        prev.map((p) => (p.id === produitId ? { ...p, disponible: previous } : p)),
      );
      toast.error('Échec de la mise à jour');
    }
  }

  async function handleBulkTouch() {
    const staleIds = filtered
      .filter((p) => freshnessLevel(p.prix_updated_at) === 'stale')
      .map((p) => p.id);
    if (staleIds.length === 0) return;

    const ok = await confirm({
      title: 'Marquer comme à jour ?',
      message: `Confirmez que les prix des ${staleIds.length} produit(s) listés sont toujours corrects. La date de mise à jour sera bumpée à maintenant, sans changer les prix.`,
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/produits/prix/touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: staleIds }),
      });
      if (!res.ok) throw new Error('touch failed');
      const now = new Date().toISOString();
      setProduits((prev) =>
        prev.map((p) => (staleIds.includes(p.id) ? { ...p, prix_updated_at: now } : p)),
      );
      toast.success(`${staleIds.length} produit(s) marqués à jour`);
    } catch (err) {
      console.error(err);
      toast.error('Échec de la mise à jour groupée');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <div className="sticky top-[60px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1.5 bg-neutral-50/95 backdrop-blur border-b border-neutral-200 mb-3 space-y-1.5">
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full h-9 pl-8 pr-8 border border-neutral-300 bg-white text-sm focus:outline-none focus:border-green-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Effacer"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCats((v) => !v)}
            aria-expanded={showCats}
            className={`shrink-0 inline-flex items-center gap-1 h-9 px-2.5 text-[11px] uppercase tracking-widest font-medium border transition-colors ${
              selectedCats.size > 0 || showCats
                ? 'bg-green-primary text-white border-green-primary'
                : 'bg-white text-neutral-700 border-neutral-300'
            }`}
          >
            <Filter size={13} />
            {selectedCats.size > 0 ? `${selectedCats.size}` : 'Cat.'}
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          <FilterTab active={filtre === 'tous'} onClick={() => changeFiltre('tous')} label="Tous" count={counts.tous} />
          <FilterTab
            active={filtre === 'a_actualiser'}
            onClick={() => changeFiltre('a_actualiser')}
            label="À actualiser"
            count={counts.stale}
            tone="stale"
          />
          <FilterTab
            active={filtre === 'indispo'}
            onClick={() => changeFiltre('indispo')}
            label="Indispo"
            count={counts.indispo}
            tone="warn"
          />
        </div>

        {showCats && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 border-t border-neutral-200">
            <button
              type="button"
              onClick={clearCats}
              className={`shrink-0 inline-flex items-center px-2.5 h-7 text-[10px] uppercase tracking-widest font-medium border transition-colors ${
                selectedCats.size === 0
                  ? 'bg-neutral-800 text-white border-neutral-800'
                  : 'bg-white text-neutral-600 border-neutral-300'
              }`}
            >
              Toutes
            </button>
            {allCategories.map((cat) => {
              const active = selectedCats.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`shrink-0 inline-flex items-center px-2.5 h-7 text-[10px] uppercase tracking-widest font-medium border transition-colors ${
                    active
                      ? 'bg-green-primary text-white border-green-primary'
                      : 'bg-white text-neutral-700 border-neutral-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-neutral-500">
          💡 Laissez vide pour <span className="italic">« à la remise »</span>
        </p>
        <p className="text-xs text-neutral-500 tabular-nums">
          {filtered.length} / {produits.length}
        </p>
      </div>

      {filtre === 'a_actualiser' && filtered.some((p) => freshnessLevel(p.prix_updated_at) === 'stale') && (
        <button
          type="button"
          onClick={handleBulkTouch}
          disabled={bulkBusy}
          className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-green-primary text-white px-4 py-3 text-sm font-medium hover:bg-green-dark disabled:opacity-50 transition-colors"
        >
          {bulkBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
          Marquer les {filtered.filter((p) => freshnessLevel(p.prix_updated_at) === 'stale').length} produit(s) affiché(s) comme à jour
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          {normalizedSearch || selectedCats.size > 0
            ? 'Aucun produit ne correspond à votre recherche.'
            : filtre === 'a_actualiser'
            ? 'Tous les prix sont à jour 👌'
            : filtre === 'indispo'
            ? 'Tous les produits sont disponibles 👌'
            : 'Aucun produit.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className={`bg-white border ${
                p.disponible ? 'border-neutral-200' : 'border-red-200 bg-red-50/30'
              } overflow-hidden`}
            >
              <div className="px-4 py-3 flex items-center gap-3">
                <FreshnessBadge level={freshnessLevel(p.prix_updated_at)} />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-neutral-800 text-base truncate">{p.nom}</div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    <span className="uppercase tracking-widest">{p.categorie}</span>
                    {p.variete ? <span className="italic"> · {p.variete}</span> : null}
                    <span> · MAJ {relativeAge(p.prix_updated_at)}</span>
                  </div>
                </div>
                <DispoToggle disponible={p.disponible} onChange={(v) => toggleDisponible(p.id, v)} />
              </div>
              <div className="border-t border-neutral-100">
                {p.options.map((opt) => {
                  const key = `${p.id}:${opt.id}`;
                  return (
                    <OptionPrixRow
                      key={opt.id}
                      libelle={opt.libelle}
                      prix={opt.prix ?? null}
                      saving={savingKey === key}
                      saved={savedKey === key}
                      hasError={errorKey === key}
                      onSave={(newPrix) =>
                        startTransition(() => {
                          saveOptionPrix(p.id, opt.id, newPrix);
                        })
                      }
                    />
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'stale' | 'warn';
}) {
  const baseTone =
    tone === 'stale'
      ? active
        ? 'bg-red-600 text-white border-red-600'
        : 'bg-white text-red-700 border-red-200'
      : tone === 'warn'
      ? active
        ? 'bg-amber-600 text-white border-amber-600'
        : 'bg-white text-amber-700 border-amber-200'
      : active
      ? 'bg-neutral-900 text-white border-neutral-900'
      : 'bg-white text-neutral-700 border-neutral-300';
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 border px-3 h-9 text-[11px] uppercase tracking-widest font-medium transition-colors ${baseTone}`}
    >
      {label}
      <span className="text-[10px] opacity-80">{count}</span>
    </button>
  );
}

function FreshnessBadge({ level }: { level: 'fresh' | 'medium' | 'stale' }) {
  const cls =
    level === 'fresh'
      ? 'bg-green-500'
      : level === 'medium'
      ? 'bg-amber-500'
      : 'bg-red-500';
  const label =
    level === 'fresh' ? 'Prix à jour (<24h)' : level === 'medium' ? 'À revoir (<72h)' : 'À actualiser (>72h)';
  return <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${cls}`} aria-label={label} title={label} />;
}

function DispoToggle({ disponible, onChange }: { disponible: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!disponible)}
      className={`shrink-0 h-9 px-3 text-[10px] uppercase tracking-widest font-medium border transition-colors ${
        disponible
          ? 'bg-white border-neutral-300 text-neutral-700 hover:border-green-primary'
          : 'bg-red-600 border-red-600 text-white hover:bg-red-700'
      }`}
      aria-pressed={!disponible}
    >
      {disponible ? 'Dispo' : 'Indispo'}
    </button>
  );
}

function OptionPrixRow({
  libelle,
  prix,
  saving,
  saved,
  hasError,
  onSave,
}: {
  libelle: string;
  prix: number | null;
  saving: boolean;
  saved: boolean;
  hasError: boolean;
  onSave: (newPrix: number | null) => void;
}) {
  const [value, setValue] = useState<string>(formatPrixInput(prix));

  useEffect(() => {
    setValue(formatPrixInput(prix));
  }, [prix]);

  function handleBlur() {
    const parsed = parsePrixInput(value);
    setValue(formatPrixInput(parsed));
    onSave(parsed);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-neutral-100 first:border-t-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-800 truncate">{libelle}</div>
      </div>
      <div className="relative shrink-0">
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="à la remise"
          className={`w-[110px] h-10 pr-8 pl-2 text-right border text-sm tabular-nums focus:outline-none focus:border-green-primary ${
            hasError ? 'border-red-400 bg-red-50' : 'border-neutral-300 bg-white'
          }`}
          aria-label={`Prix ${libelle}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
          {value.trim() === '' ? '' : '€'}
        </span>
      </div>
      <div className="w-5 shrink-0 flex items-center justify-center">
        {saving ? (
          <Loader2 size={14} className="animate-spin text-neutral-400" />
        ) : saved ? (
          <Check size={14} className="text-green-primary" />
        ) : null}
      </div>
    </div>
  );
}
