'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, X, Tag, Gift, Users, Search, Pencil } from 'lucide-react';
import type { CodePromo } from '@/lib/codes-promos';
import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/ConfirmModal';

type Filtre = 'tous' | 'manuels' | 'parrainage' | 'merci';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

function formatValeur(c: CodePromo): string {
  if (c.type === 'pourcent') {
    const cap = c.reduction_max_cents != null ? ` (max ${euro.format(c.reduction_max_cents / 100)})` : '';
    return `−${c.valeur} %${cap}`;
  }
  return `−${euro.format(c.valeur / 100)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoriser(c: CodePromo): 'manuel' | 'parrainage' | 'merci' {
  if (c.est_parrainage) return 'parrainage';
  if (c.client_email_lock) return 'merci';
  return 'manuel';
}

function estEpuise(c: CodePromo): boolean {
  return c.usage_max != null && c.usage_actuel >= c.usage_max;
}

function estExpire(c: CodePromo): boolean {
  return !!(c.expire_at && new Date(c.expire_at) < new Date());
}

function estAncien(c: CodePromo): boolean {
  return estEpuise(c) || estExpire(c) || !c.actif;
}

export default function CodesPromosManager({ initialCodes }: { initialCodes: CodePromo[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [codes, setCodes] = useState<CodePromo[]>(initialCodes);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [search, setSearch] = useState('');
  const [showAnciens, setShowAnciens] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CodePromo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const actifs = codes.filter((c) => !estAncien(c));
    const c = { tous: actifs.length, manuels: 0, parrainage: 0, merci: 0 };
    for (const code of actifs) {
      const cat = categoriser(code);
      c[cat === 'manuel' ? 'manuels' : cat] += 1;
    }
    return c;
  }, [codes]);

  const ancienCount = useMemo(() => codes.filter(estAncien).length, [codes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return codes.filter((c) => {
      if (!showAnciens && estAncien(c)) return false;
      if (filtre !== 'tous') {
        const cat = categoriser(c);
        if (filtre === 'manuels' && cat !== 'manuel') return false;
        if (filtre === 'parrainage' && cat !== 'parrainage') return false;
        if (filtre === 'merci' && cat !== 'merci') return false;
      }
      if (q && !c.code.toLowerCase().includes(q) && !(c.description || '').toLowerCase().includes(q) && !(c.parrain_email || '').toLowerCase().includes(q) && !(c.client_email_lock || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [codes, filtre, search, showAnciens]);

  async function toggleActif(c: CodePromo) {
    setBusyId(c.id);
    const next = !c.actif;
    setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, actif: next } : x)));
    try {
      const res = await fetch(`/api/admin/codes-promos/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? 'Code activé' : 'Code désactivé');
    } catch {
      setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, actif: c.actif } : x)));
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCode(c: CodePromo) {
    const ok = await confirm({
      title: 'Supprimer ce code ?',
      message: `« ${c.code} » sera supprimé définitivement. L'historique des commandes l'ayant utilisé est conservé.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/codes-promos/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
      toast.success('Code supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-neutral-800">Codes promos</h1>
          <p className="text-sm text-neutral-500">{codes.length} code{codes.length > 1 ? 's' : ''} — manuels, parrainages auto, cadeaux parrains</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark"
        >
          <Plus size={14} /> Nouveau code
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (code, description, email)…"
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-green-primary focus:border-green-primary text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            aria-label="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {([
          { key: 'tous', label: 'Tous', icon: null },
          { key: 'manuels', label: 'Manuels', icon: <Tag size={12} /> },
          { key: 'parrainage', label: 'Parrainage', icon: <Users size={12} /> },
          { key: 'merci', label: 'Cadeaux parrain', icon: <Gift size={12} /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFiltre(tab.key)}
            className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
              filtre === tab.key
                ? 'border-green-primary text-green-primary bg-green-primary/5'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 bg-white'
            }`}
          >
            {tab.icon}
            {tab.label} <span className="text-neutral-400 ml-1">({counts[tab.key]})</span>
          </button>
        ))}
        {ancienCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAnciens((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-medium px-3 py-2 border transition-colors ${
              showAnciens
                ? 'border-neutral-400 text-neutral-700 bg-neutral-100'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 bg-white'
            }`}
            title={showAnciens ? 'Masquer les codes épuisés/expirés/inactifs' : 'Afficher les codes épuisés/expirés/inactifs'}
          >
            {showAnciens ? 'Masquer anciens' : 'Afficher anciens'}
            <span className="text-neutral-400 ml-1">({ancienCount})</span>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-10 text-center text-neutral-500 italic">
          Aucun code ne correspond.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
          {filtered.map((c) => {
            const cat = categoriser(c);
            const usageStr = c.usage_max != null ? `${c.usage_actuel} / ${c.usage_max}` : `${c.usage_actuel} / ∞`;
            const expired = estExpire(c);
            const epuise = estEpuise(c);
            return (
              <div key={c.id} className={`flex items-center gap-4 px-4 py-3 ${!c.actif ? 'opacity-60' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-neutral-800">{c.code}</span>
                    {cat === 'parrainage' && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-green-soft/50 text-green-dark border border-green-primary/30 px-1.5 py-0.5">
                        <Users size={10} /> Parrain
                      </span>
                    )}
                    {cat === 'merci' && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5">
                        <Gift size={10} /> Merci
                      </span>
                    )}
                    {epuise && <span className="text-[10px] uppercase tracking-widest bg-neutral-200 text-neutral-700 border border-neutral-300 px-1.5 py-0.5">Épuisé</span>}
                    {expired && <span className="text-[10px] uppercase tracking-widest bg-red-soft text-red-text border border-red-text/20 px-1.5 py-0.5">Expiré</span>}
                    {!c.actif && <span className="text-[10px] uppercase tracking-widest bg-neutral-100 text-neutral-500 border border-neutral-200 px-1.5 py-0.5">Inactif</span>}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span><strong>{formatValeur(c)}</strong></span>
                    {c.min_panier_cents > 0 && <span>panier ≥ {euro.format(c.min_panier_cents / 100)}</span>}
                    <span>usages : {usageStr}</span>
                    {c.usage_max_par_adresse != null && (
                      <span>max {c.usage_max_par_adresse}/adresse</span>
                    )}
                    {c.expire_at && <span>expire {formatDate(c.expire_at)}</span>}
                    <span className="text-neutral-400">créé {formatDate(c.created_at)}</span>
                  </div>
                  {c.parrain_email && <div className="text-xs text-neutral-500 mt-0.5 italic">Parrain : {c.parrain_email}</div>}
                  {c.client_email_lock && <div className="text-xs text-neutral-500 mt-0.5 italic">Réservé à : {c.client_email_lock}</div>}
                  {c.description && <div className="text-xs text-neutral-600 mt-0.5">{c.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ToggleActif checked={c.actif} disabled={busyId === c.id} onChange={() => toggleActif(c)} />
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    disabled={busyId === c.id}
                    aria-label="Modifier le code"
                    className="p-2 text-neutral-400 hover:text-green-primary disabled:opacity-50"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCode(c)}
                    disabled={busyId === c.id}
                    aria-label="Supprimer le code"
                    className="p-2 text-neutral-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateCodeModal
          onClose={() => setShowCreate(false)}
          onCreated={(code) => {
            setCodes((prev) => [code, ...prev]);
            setShowCreate(false);
            toast.success(`Code ${code.code} créé`);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditCodeModal
          code={editing}
          onClose={() => setEditing(null)}
          onUpdated={(updated) => {
            setCodes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
            toast.success('Code mis à jour');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ToggleActif({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-green-primary' : 'bg-neutral-300'} disabled:opacity-50`}
      aria-label={checked ? 'Désactiver le code' : 'Activer le code'}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function CreateCodeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: CodePromo) => void }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'pourcent' | 'montant_fixe'>('montant_fixe');
  const [valeur, setValeur] = useState('');
  const [reductionMaxEur, setReductionMaxEur] = useState('');
  const [minPanierEur, setMinPanierEur] = useState('30');
  const [usageMax, setUsageMax] = useState('');
  const [usageMaxParAdresse, setUsageMaxParAdresse] = useState('1');
  const [expireAt, setExpireAt] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !valeur.trim()) {
      setError('Code et valeur requis.');
      return;
    }
    const valeurNum = type === 'pourcent' ? Math.round(Number(valeur)) : Math.round(Number(valeur) * 100);
    if (!Number.isFinite(valeurNum) || valeurNum <= 0) {
      setError('Valeur invalide.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        type,
        valeur: valeurNum,
        reduction_max_cents: type === 'pourcent' && reductionMaxEur.trim() ? Math.round(Number(reductionMaxEur) * 100) : null,
        min_panier_cents: minPanierEur.trim() ? Math.round(Number(minPanierEur) * 100) : 0,
        usage_max: usageMax.trim() ? Math.round(Number(usageMax)) : null,
        usage_max_par_adresse: usageMaxParAdresse.trim() ? Math.round(Number(usageMaxParAdresse)) : null,
        expire_at: expireAt.trim() ? new Date(expireAt).toISOString() : null,
        description: description.trim() || null,
        actif: true,
      };
      const res = await fetch('/api/admin/codes-promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      onCreated(json.code as CodePromo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-neutral-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="font-serif text-lg text-neutral-800">Nouveau code promo</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-neutral-500 hover:text-neutral-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>}

          <Field label="Code *" hint="Sera normalisé en majuscules. Ex : ETE2026, MERCIPOTE.">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={40}
              className={inputCls}
              placeholder="ETE2026"
            />
          </Field>

          <Field label="Type *">
            <div className="flex gap-2">
              <label className={`flex-1 border px-3 py-2 cursor-pointer text-sm text-center ${type === 'montant_fixe' ? 'border-green-primary bg-green-primary/5 text-green-primary' : 'border-neutral-300 text-neutral-600'}`}>
                <input type="radio" checked={type === 'montant_fixe'} onChange={() => setType('montant_fixe')} className="sr-only" />
                Montant fixe (€)
              </label>
              <label className={`flex-1 border px-3 py-2 cursor-pointer text-sm text-center ${type === 'pourcent' ? 'border-green-primary bg-green-primary/5 text-green-primary' : 'border-neutral-300 text-neutral-600'}`}>
                <input type="radio" checked={type === 'pourcent'} onChange={() => setType('pourcent')} className="sr-only" />
                Pourcentage (%)
              </label>
            </div>
          </Field>

          <Field label={type === 'pourcent' ? 'Valeur (%) *' : 'Valeur (€) *'}>
            <input
              required
              type="number"
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              step={type === 'pourcent' ? '1' : '0.01'}
              min="0"
              className={inputCls}
              placeholder={type === 'pourcent' ? '10' : '5.00'}
            />
          </Field>

          {type === 'pourcent' && (
            <Field label="Plafond de réduction (€)" hint="Optionnel. Évite qu'un -10% sur un panier de 200€ soit trop généreux.">
              <input
                type="number"
                value={reductionMaxEur}
                onChange={(e) => setReductionMaxEur(e.target.value)}
                step="0.01"
                min="0"
                className={inputCls}
                placeholder="5.00"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Panier min (€)">
              <input
                type="number"
                value={minPanierEur}
                onChange={(e) => setMinPanierEur(e.target.value)}
                step="0.01"
                min="0"
                className={inputCls}
                placeholder="30"
              />
            </Field>
            <Field label="Usages max global" hint="Vide = illimité">
              <input
                type="number"
                value={usageMax}
                onChange={(e) => setUsageMax(e.target.value)}
                step="1"
                min="1"
                className={inputCls}
                placeholder="∞"
              />
            </Field>
          </div>

          <Field label="Usages max par adresse" hint="Anti-fraude : plafonne combien de fois un même foyer (adresse BAN) peut utiliser ce code. Vide = illimité, 1 = un usage par adresse à vie.">
            <input
              type="number"
              value={usageMaxParAdresse}
              onChange={(e) => setUsageMaxParAdresse(e.target.value)}
              step="1"
              min="1"
              className={inputCls}
              placeholder="1"
            />
          </Field>

          <Field label="Date d'expiration" hint="Vide = jamais">
            <input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Description (interne)" hint="Affichée seulement dans l'admin.">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className={inputCls}
              placeholder="Promo de l'été 2026"
            />
          </Field>
        </div>

        <div className="p-4 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-800 px-3 py-2">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="bg-green-primary text-white px-5 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark disabled:opacity-50">
            {saving ? 'Création…' : 'Créer le code'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = 'w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </label>
  );
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditCodeModal({ code, onClose, onUpdated }: { code: CodePromo; onClose: () => void; onUpdated: (c: CodePromo) => void }) {
  const [type, setType] = useState<'pourcent' | 'montant_fixe'>(code.type);
  const [valeur, setValeur] = useState(
    code.type === 'pourcent' ? String(code.valeur) : (code.valeur / 100).toFixed(2),
  );
  const [reductionMaxEur, setReductionMaxEur] = useState(
    code.reduction_max_cents != null ? (code.reduction_max_cents / 100).toFixed(2) : '',
  );
  const [minPanierEur, setMinPanierEur] = useState((code.min_panier_cents / 100).toFixed(2));
  const [usageMax, setUsageMax] = useState(code.usage_max != null ? String(code.usage_max) : '');
  const [usageMaxParAdresse, setUsageMaxParAdresse] = useState(
    code.usage_max_par_adresse != null ? String(code.usage_max_par_adresse) : '',
  );
  const [expireAt, setExpireAt] = useState(toDatetimeLocal(code.expire_at));
  const [description, setDescription] = useState(code.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valeur.trim()) {
      setError('Valeur requise.');
      return;
    }
    const valeurNum = type === 'pourcent' ? Math.round(Number(valeur)) : Math.round(Number(valeur) * 100);
    if (!Number.isFinite(valeurNum) || valeurNum <= 0) {
      setError('Valeur invalide.');
      return;
    }
    if (code.usage_max == null && usageMax.trim()) {
      // OK : on ajoute un plafond
    }
    if (code.usage_max != null && usageMax.trim()) {
      const newMax = Math.round(Number(usageMax));
      if (newMax < code.usage_actuel) {
        setError(`Plafond < usage actuel (${code.usage_actuel}). Refusé pour ne pas casser l'historique.`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        type,
        valeur: valeurNum,
        reduction_max_cents: type === 'pourcent' && reductionMaxEur.trim() ? Math.round(Number(reductionMaxEur) * 100) : null,
        min_panier_cents: minPanierEur.trim() ? Math.round(Number(minPanierEur) * 100) : 0,
        usage_max: usageMax.trim() ? Math.round(Number(usageMax)) : null,
        usage_max_par_adresse: usageMaxParAdresse.trim() ? Math.round(Number(usageMaxParAdresse)) : null,
        expire_at: expireAt.trim() ? new Date(expireAt).toISOString() : null,
        description: description.trim() || null,
      };
      const res = await fetch(`/api/admin/codes-promos/${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      onUpdated(json.code as CodePromo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-neutral-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div>
            <h2 className="font-serif text-lg text-neutral-800">Modifier le code</h2>
            <div className="font-mono text-xs text-neutral-500 mt-0.5">{code.code} · {code.usage_actuel} usage{code.usage_actuel > 1 ? 's' : ''} enregistré{code.usage_actuel > 1 ? 's' : ''}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-neutral-500 hover:text-neutral-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>}

          <Field label="Type *">
            <div className="flex gap-2">
              <label className={`flex-1 border px-3 py-2 cursor-pointer text-sm text-center ${type === 'montant_fixe' ? 'border-green-primary bg-green-primary/5 text-green-primary' : 'border-neutral-300 text-neutral-600'}`}>
                <input type="radio" checked={type === 'montant_fixe'} onChange={() => setType('montant_fixe')} className="sr-only" />
                Montant fixe (€)
              </label>
              <label className={`flex-1 border px-3 py-2 cursor-pointer text-sm text-center ${type === 'pourcent' ? 'border-green-primary bg-green-primary/5 text-green-primary' : 'border-neutral-300 text-neutral-600'}`}>
                <input type="radio" checked={type === 'pourcent'} onChange={() => setType('pourcent')} className="sr-only" />
                Pourcentage (%)
              </label>
            </div>
          </Field>

          <Field label={type === 'pourcent' ? 'Valeur (%) *' : 'Valeur (€) *'}>
            <input
              required
              type="number"
              value={valeur}
              onChange={(e) => setValeur(e.target.value)}
              step={type === 'pourcent' ? '1' : '0.01'}
              min="0"
              className={inputCls}
            />
          </Field>

          {type === 'pourcent' && (
            <Field label="Plafond de réduction (€)" hint="Vide = pas de plafond">
              <input
                type="number"
                value={reductionMaxEur}
                onChange={(e) => setReductionMaxEur(e.target.value)}
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Panier min (€)">
              <input
                type="number"
                value={minPanierEur}
                onChange={(e) => setMinPanierEur(e.target.value)}
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
            <Field label="Usages max global" hint={`Vide = illimité. Actuel : ${code.usage_actuel}`}>
              <input
                type="number"
                value={usageMax}
                onChange={(e) => setUsageMax(e.target.value)}
                step="1"
                min={code.usage_actuel || 1}
                className={inputCls}
                placeholder="∞"
              />
            </Field>
          </div>

          <Field label="Usages max par adresse" hint="Anti-fraude : plafonne combien de fois un même foyer peut utiliser ce code. Vide = illimité.">
            <input
              type="number"
              value={usageMaxParAdresse}
              onChange={(e) => setUsageMaxParAdresse(e.target.value)}
              step="1"
              min="1"
              className={inputCls}
              placeholder="∞"
            />
          </Field>

          <Field label="Date d'expiration" hint="Vide = jamais">
            <input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => setExpireAt(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Description (interne)" hint="Affichée seulement dans l'admin.">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="p-4 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-800 px-3 py-2">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="bg-green-primary text-white px-5 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark disabled:opacity-50">
            {saving ? 'Mise à jour…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
