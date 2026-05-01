'use client'

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Upload, Trash2, X, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify } from '@/lib/produit';
import type { Article } from '@/lib/article';
import { useConfirm } from '@/components/admin/ConfirmModal';
import { useToast } from '@/components/admin/Toast';

type Mode = { kind: 'create' } | { kind: 'edit'; id: string };
type ProduitOption = { slug: string; nom: string };

type DraftShape = {
  titre: string;
  slugValue: string;
  slugTouched: boolean;
  extrait: string;
  contenu: string;
  imageUrl: string;
  produitsLies: string[];
};

export default function ArticleForm({
  mode,
  initial,
  produits,
}: {
  mode: Mode;
  initial?: Partial<Article>;
  produits: ProduitOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const [titre, setTitre] = useState(initial?.titre || '');
  const [slugValue, setSlugValue] = useState(initial?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [extrait, setExtrait] = useState(initial?.extrait || '');
  const [contenu, setContenu] = useState(initial?.contenu_md || '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');
  const [produitsLies, setProduitsLies] = useState<string[]>(initial?.produits_lies || []);
  const [publishedAt, setPublishedAt] = useState(() => {
    if (!initial?.published_at) return '';
    // input type=datetime-local expects YYYY-MM-DDTHH:mm (local)
    const d = new Date(initial.published_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const autoSlug = slugify(titre);
  const effectiveSlug = slugTouched ? slugValue : autoSlug;

  const draftKey = `article_draft_${mode.kind === 'edit' ? mode.id : 'new'}`;
  const [draftFound, setDraftFound] = useState<{ savedAt: number; data: DraftShape } | null>(null);
  const draftHydrated = useRef(false);
  const submittedOk = useRef(false);

  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: number; data: DraftShape };
      const initialSnap: DraftShape = {
        titre: initial?.titre || '',
        slugValue: initial?.slug || '',
        slugTouched: !!initial?.slug,
        extrait: initial?.extrait || '',
        contenu: initial?.contenu_md || '',
        imageUrl: initial?.image_url || '',
        produitsLies: initial?.produits_lies || [],
      };
      const sameAsInitial = JSON.stringify(parsed.data) === JSON.stringify(initialSnap);
      if (!sameAsInitial) setDraftFound(parsed);
      else localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }, [draftKey, initial]);

  useEffect(() => {
    if (!draftHydrated.current) return;
    const t = setTimeout(() => {
      try {
        const data: DraftShape = { titre, slugValue, slugTouched, extrait, contenu, imageUrl, produitsLies };
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // ignore quota
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [titre, slugValue, slugTouched, extrait, contenu, imageUrl, produitsLies, draftKey]);

  function restoreDraft() {
    if (!draftFound) return;
    const d = draftFound.data;
    setTitre(d.titre);
    setSlugValue(d.slugValue);
    setSlugTouched(d.slugTouched);
    setExtrait(d.extrait);
    setContenu(d.contenu);
    setImageUrl(d.imageUrl);
    setProduitsLies(d.produitsLies);
    setDraftFound(null);
  }

  function discardDraft() {
    try { localStorage.removeItem(draftKey); } catch {}
    setDraftFound(null);
  }

  useEffect(() => {
    return () => {
      if (submittedOk.current) {
        try { localStorage.removeItem(draftKey); } catch {}
      }
    };
  }, [draftKey]);

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

  function toggleProduit(slug: string) {
    setProduitsLies((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function submit(publishNow: boolean) {
    setSaving(true);
    setError(null);

    let published_at: string | null = null;
    if (publishNow) {
      published_at = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
    } else if (publishedAt) {
      // garder la date saisie même si on reste en brouillon ? Non — si "save draft", on ignore publishedAt.
      published_at = null;
    }

    const payload = {
      titre,
      slug: effectiveSlug,
      extrait: extrait || null,
      contenu_md: contenu,
      image_url: imageUrl || null,
      produits_lies: produitsLies,
      published_at,
    };

    try {
      const url = mode.kind === 'create' ? '/api/admin/articles' : `/api/admin/articles/${mode.id}`;
      const method = mode.kind === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur serveur');
      submittedOk.current = true;
      try { localStorage.removeItem(draftKey); } catch {}
      router.push('/admin/articles');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit') return;
    const ok = await confirm({
      title: "Supprimer l'article ?",
      message: `« ${titre} » sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/articles/${mode.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Article supprimé');
      router.push('/admin/articles');
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      const msg = json.error || 'Suppression échouée';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
      className="max-w-4xl mx-auto px-6 py-8 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-neutral-800">
          {mode.kind === 'create' ? 'Nouvel article' : "Modifier l'article"}
        </h1>
        <Link
          href="/admin/articles"
          className="text-sm text-neutral-500 hover:text-neutral-800 flex items-center gap-1"
        >
          <X size={16} /> Annuler
        </Link>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      {draftFound && (
        <div className="border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-0">
            Brouillon non sauvegardé du {new Date(draftFound.savedAt).toLocaleString('fr-FR')}.
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="bg-amber-600 text-white px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-amber-700">
              Restaurer
            </button>
            <button type="button" onClick={discardDraft} className="border border-amber-400 text-amber-800 px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-amber-100">
              Ignorer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Titre *">
          <input required value={titre} onChange={(e) => setTitre(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Slug (URL)" hint={`Sera : /blog/${effectiveSlug || '…'}`}>
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
      </div>

      <Field label="Extrait (meta description / aperçu)" hint={`${extrait.length}/400`}>
        <textarea
          value={extrait}
          onChange={(e) => setExtrait(e.target.value.slice(0, 400))}
          rows={2}
          className={inputCls}
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">
            Contenu (Markdown)
          </span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-xs text-neutral-600 hover:text-green-primary flex items-center gap-1"
          >
            <Eye size={14} /> {preview ? 'Éditer' : 'Aperçu'}
          </button>
        </div>
        {preview ? (
          <div className="border border-neutral-200 bg-white p-6 min-h-[300px] prose-legal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contenu || '*(vide)*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={18}
            className={`${inputCls} font-mono text-sm`}
            placeholder="## Préparation&#10;&#10;1. …&#10;&#10;Markdown supporté : titres, listes, **gras**, *italique*, [liens](url), tables GFM…"
          />
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">
          Image d&apos;en-tête
        </div>
        <div className="flex items-start gap-4">
          <div className="relative w-56 h-32 bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
            {imageUrl ? (
              <Image src={imageUrl} alt="Aperçu" fill sizes="224px" className="object-cover" />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-xs">
                Aucune image
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 border border-neutral-300 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50">
              <Upload size={14} />
              {uploading ? 'Upload…' : 'Choisir un fichier'}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-xs text-red-600 hover:underline text-left"
              >
                Retirer l&apos;image
              </button>
            )}
            <p className="text-xs text-neutral-500">JPEG, PNG, WebP ou AVIF. 5 Mo max.</p>
          </div>
        </div>
      </div>

      <Field label={`Produits associés (${produitsLies.length})`} hint="Affichés en bas de l'article + section 'Recettes associées' sur la fiche produit.">
        <div className="max-h-48 overflow-y-auto border border-neutral-200 bg-white divide-y divide-neutral-100">
          {produits.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">Aucun produit disponible.</p>
          )}
          {produits.map((p) => (
            <label
              key={p.slug}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={produitsLies.includes(p.slug)}
                onChange={() => toggleProduit(p.slug)}
                className="accent-green-primary"
              />
              <span className="text-neutral-700">{p.nom}</span>
              <span className="text-xs text-neutral-400 ml-auto">{p.slug}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Date de publication"
        hint="Laisser vide = brouillon. Date future = publication programmée. Clic sur “Publier” publie immédiatement si vide."
      >
        <input
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white/95 backdrop-blur border-t border-neutral-200 flex items-center justify-between gap-3 flex-wrap z-10 sm:static sm:bg-transparent sm:backdrop-blur-0 sm:py-0 sm:pt-4">
        {mode.kind === 'edit' ? (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <Trash2 size={14} /> <span className="hidden sm:inline">Supprimer cet article</span><span className="sm:hidden">Supprimer</span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={saving || uploading}
            className="border border-neutral-300 text-neutral-700 px-3 sm:px-5 py-3 font-medium uppercase tracking-widest text-[11px] hover:bg-neutral-50 disabled:opacity-50 min-h-[44px]"
          >
            <span className="hidden sm:inline">Enregistrer en brouillon</span><span className="sm:hidden">Brouillon</span>
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-green-primary text-white px-6 py-3 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark transition-colors disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Publier
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  'w-full border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary bg-white';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </label>
  );
}
