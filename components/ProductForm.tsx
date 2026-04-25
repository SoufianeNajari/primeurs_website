'use client'

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Upload, Trash2, X, Plus, GripVertical } from 'lucide-react';
import { slugify, OPTION_LIBELLES_SUGGESTIONS, type Product, type ProduitOption } from '@/lib/produit';

type Mode = { kind: 'create' } | { kind: 'edit'; id: string };

const MOIS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const QUALITE_SUGGESTIONS = ['Extra', 'Catégorie 1', 'Catégorie 2'];

type OptionRow = { id: string; libelle: string; prix: string };

function genOptionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `opt_${Math.random().toString(36).slice(2, 12)}`;
}

function initialOptionRows(initial?: Partial<Product>): OptionRow[] {
  const opts = initial?.options;
  if (opts && opts.length > 0) {
    return opts.map((o) => ({ id: o.id, libelle: o.libelle, prix: o.prix != null ? String(o.prix) : '' }));
  }
  return [{ id: genOptionId(), libelle: 'au kg', prix: '' }];
}

export default function ProductForm({ mode, initial, categories }: { mode: Mode; initial?: Partial<Product>; categories: string[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState(initial?.nom || '');
  const [categorie, setCategorie] = useState(initial?.categorie || categories[0] || '');
  const [slugValue, setSlugValue] = useState(initial?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [options, setOptions] = useState<OptionRow[]>(() => initialOptionRows(initial));
  const [origine, setOrigine] = useState(initial?.origine || '');
  const [descriptionLongue, setDescriptionLongue] = useState(initial?.description_longue || '');
  const [conseils, setConseils] = useState(initial?.conseils_conservation || '');
  const [bio, setBio] = useState(initial?.bio ?? false);
  const [local, setLocal] = useState(initial?.local ?? false);
  const [variete, setVariete] = useState(initial?.variete || '');
  const [qualite, setQualite] = useState(initial?.qualite || '');
  const [disponible, setDisponible] = useState(initial?.disponible ?? true);
  const [moisDebut, setMoisDebut] = useState<string>(initial?.mois_debut ? String(initial.mois_debut) : '');
  const [moisFin, setMoisFin] = useState<string>(initial?.mois_fin ? String(initial.mois_fin) : '');
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const autoSlug = slugify(nom);
  const effectiveSlug = slugTouched ? slugValue : autoSlug;

  function updateOption(idx: number, patch: Partial<OptionRow>) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { id: genOptionId(), libelle: '', prix: '' }]);
  }

  function removeOption(idx: number) {
    setOptions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload échoué');
      setImageUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Valide les options localement
    const cleanedOptions: ProduitOption[] = [];
    for (const o of options) {
      const lib = o.libelle.trim();
      if (!lib) {
        setError('Chaque option doit avoir un libellé.');
        setSaving(false);
        return;
      }
      cleanedOptions.push({
        id: o.id,
        libelle: lib,
        prix: o.prix === '' ? null : Number(o.prix),
      });
    }

    const payload = {
      nom,
      categorie,
      slug: effectiveSlug,
      options: cleanedOptions,
      origine: origine || null,
      description_longue: descriptionLongue || null,
      conseils_conservation: conseils || null,
      bio,
      local,
      variete: variete || null,
      qualite: qualite || null,
      disponible,
      mois_debut: moisDebut === '' ? null : Number(moisDebut),
      mois_fin: moisFin === '' ? null : Number(moisFin),
      image_url: imageUrl || null,
    };

    try {
      const url = mode.kind === 'create' ? '/api/admin/produits' : `/api/admin/produits/${mode.id}`;
      const method = mode.kind === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur serveur');
      router.push('/admin/produits');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit') return;
    if (!confirm(`Supprimer le produit "${nom}" ? Cette action est définitive.`)) return;
    const res = await fetch(`/api/admin/produits/${mode.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/produits');
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error || 'Suppression échouée');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-neutral-800">
          {mode.kind === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
        </h1>
        <Link href="/admin/produits" className="text-sm text-neutral-500 hover:text-neutral-800 flex items-center gap-1">
          <X size={16} /> Annuler
        </Link>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom *">
          <input required value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Catégorie *">
          <input required list="categories" value={categorie} onChange={(e) => setCategorie(e.target.value)} className={inputCls} />
          <datalist id="categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Slug (URL)" hint={`Sera : /boutique/${effectiveSlug || '…'}`}>
          <input
            value={slugTouched ? slugValue : autoSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlugValue(e.target.value);
            }}
            className={inputCls}
            placeholder={autoSlug}
          />
        </Field>
        <Field label="Origine" hint="Le badge 🇫🇷 s'affiche automatiquement si l'origine contient « France ».">
          <input value={origine} onChange={(e) => setOrigine(e.target.value)} className={inputCls} placeholder="France, Île-de-France" />
        </Field>
        <Field label="Variété" hint="Texte libre, affiché sur la carte produit (ex: Golden, Mara des Bois).">
          <input value={variete} onChange={(e) => setVariete(e.target.value)} className={inputCls} maxLength={120} placeholder="Mara des Bois" />
        </Field>
        <Field label="Qualité" hint="Affichée uniquement sur la fiche détaillée. Choisissez une suggestion ou saisissez votre propre valeur.">
          <input value={qualite} onChange={(e) => setQualite(e.target.value)} list="qualite-suggestions" className={inputCls} maxLength={60} placeholder="Extra" />
          <datalist id="qualite-suggestions">
            {QUALITE_SUGGESTIONS.map((q) => <option key={q} value={q} />)}
          </datalist>
        </Field>
        <Field label="Saison — mois début">
          <select value={moisDebut} onChange={(e) => setMoisDebut(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {MOIS.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Saison — mois fin">
          <select value={moisFin} onChange={(e) => setMoisFin(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {MOIS.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </Field>
      </div>

      {/* Options de commande */}
      <div className="border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Options de commande *</div>
            <div className="text-xs text-neutral-500 mt-1">Comment le client commande ce produit. Prix laissé vide = pesée / devis en boutique.</div>
          </div>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 6}
            className="inline-flex items-center gap-1 text-xs font-medium text-green-primary hover:text-green-dark disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        <datalist id="option-libelles">
          {OPTION_LIBELLES_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>

        <ul className="space-y-2">
          {options.map((opt, idx) => (
            <li key={opt.id} className="flex items-center gap-2 bg-white border border-neutral-200 p-2">
              <GripVertical size={14} className="text-neutral-300 shrink-0" />
              <input
                list="option-libelles"
                value={opt.libelle}
                onChange={(e) => updateOption(idx, { libelle: e.target.value })}
                placeholder="ex : au kg, à la pièce, la barquette…"
                className="flex-1 min-w-0 border border-neutral-300 px-2 py-2 text-sm focus:outline-none focus:border-green-primary"
                required
                maxLength={40}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={opt.prix}
                  onChange={(e) => updateOption(idx, { prix: e.target.value })}
                  placeholder="Prix"
                  className="w-24 border border-neutral-300 px-2 py-2 text-sm focus:outline-none focus:border-green-primary"
                />
                <span className="text-sm text-neutral-500">€</span>
              </div>
              <button
                type="button"
                onClick={() => removeOption(idx)}
                disabled={options.length <= 1}
                aria-label="Supprimer cette option"
                className="p-2 text-neutral-400 hover:text-red-600 disabled:text-neutral-200 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Field label="Description longue">
        <textarea value={descriptionLongue} onChange={(e) => setDescriptionLongue(e.target.value)} rows={5} className={inputCls} />
      </Field>
      <Field label="Conseils de conservation">
        <textarea value={conseils} onChange={(e) => setConseils(e.target.value)} rows={3} className={inputCls} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <Toggle label="Bio" checked={bio} onChange={setBio} />
        <Toggle label="Local" checked={local} onChange={setLocal} />
        <Toggle label="Disponible" checked={disponible} onChange={setDisponible} />
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Photo principale</div>
        <div className="flex items-start gap-4">
          <div className="relative w-40 h-40 bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
            {imageUrl ? (
              <Image src={imageUrl} alt="Aperçu" fill sizes="160px" className="object-cover" />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-xs">Aucune photo</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 border border-neutral-300 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50">
              <Upload size={14} />
              {uploading ? 'Upload…' : 'Choisir un fichier'}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleUpload} className="hidden" />
            </label>
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl('')} className="text-xs text-red-600 hover:underline text-left">
                Retirer la photo
              </button>
            )}
            <p className="text-xs text-neutral-500">JPEG, PNG, WebP ou AVIF. 5 Mo max.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        {mode.kind === 'edit' ? (
          <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
            <Trash2 size={14} /> Supprimer ce produit
          </button>
        ) : <span />}
        <button type="submit" disabled={saving || uploading} className="bg-green-primary text-white px-6 py-3 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {mode.kind === 'create' ? 'Créer le produit' : 'Enregistrer'}
        </button>
      </div>
    </form>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-green-primary' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  );
}
