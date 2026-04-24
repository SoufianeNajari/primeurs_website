'use client'

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Upload, Trash2, X } from 'lucide-react';
import { slugify, type Product } from '@/lib/produit';

type Mode = { kind: 'create' } | { kind: 'edit'; id: string };

const MOIS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function ProductForm({ mode, initial, categories }: { mode: Mode; initial?: Partial<Product>; categories: string[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState(initial?.nom || '');
  const [categorie, setCategorie] = useState(initial?.categorie || categories[0] || '');
  const [slugValue, setSlugValue] = useState(initial?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [prixKg, setPrixKg] = useState<string>(initial?.prix_kg != null ? String(initial.prix_kg) : '');
  const [unite, setUnite] = useState(initial?.unite || 'kg');
  const [origine, setOrigine] = useState(initial?.origine || '');
  const [descriptionLongue, setDescriptionLongue] = useState(initial?.description_longue || '');
  const [conseils, setConseils] = useState(initial?.conseils_conservation || '');
  const [bio, setBio] = useState(initial?.bio ?? false);
  const [disponible, setDisponible] = useState(initial?.disponible ?? true);
  const [moisDebut, setMoisDebut] = useState<string>(initial?.mois_debut ? String(initial.mois_debut) : '');
  const [moisFin, setMoisFin] = useState<string>(initial?.mois_fin ? String(initial.mois_fin) : '');
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const autoSlug = slugify(nom);
  const effectiveSlug = slugTouched ? slugValue : autoSlug;

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

    const payload = {
      nom,
      categorie,
      slug: effectiveSlug,
      prix_kg: prixKg === '' ? null : Number(prixKg),
      unite,
      origine: origine || null,
      description_longue: descriptionLongue || null,
      conseils_conservation: conseils || null,
      bio,
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
        <Field label="Unité">
          <input value={unite} onChange={(e) => setUnite(e.target.value)} className={inputCls} placeholder="kg" />
        </Field>
        <Field label="Prix (€)">
          <input type="number" step="0.01" value={prixKg} onChange={(e) => setPrixKg(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Origine">
          <input value={origine} onChange={(e) => setOrigine(e.target.value)} className={inputCls} placeholder="France, Île-de-France" />
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

      <Field label="Description longue">
        <textarea value={descriptionLongue} onChange={(e) => setDescriptionLongue(e.target.value)} rows={5} className={inputCls} />
      </Field>
      <Field label="Conseils de conservation">
        <textarea value={conseils} onChange={(e) => setConseils(e.target.value)} rows={3} className={inputCls} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <Toggle label="Bio" checked={bio} onChange={setBio} />
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
