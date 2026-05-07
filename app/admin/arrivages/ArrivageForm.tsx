'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Trash2, Camera } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';
import type { ArrivageRungis } from '@/lib/arrivages';

const PRODUIT_MAX = 60;
const MAX_BYTES = 5 * 1024 * 1024;

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function ArrivageForm({ current }: { current: ArrivageRungis | null }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [produit1, setProduit1] = useState('');
  const [produit2, setProduit2] = useState('');
  const [produit3, setProduit3] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const onPhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Photo trop lourde (max 5 Mo).');
      return;
    }
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const reset = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    setProduit1('');
    setProduit2('');
    setProduit3('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      toast.error('Choisis une photo.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      fd.append('produit_1', produit1);
      fd.append('produit_2', produit2);
      fd.append('produit_3', produit3);
      const res = await fetch('/api/admin/arrivages', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la publication.');
      toast.success('Arrivage publié sur la home.');
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeactivate = async () => {
    if (!current) return;
    if (!window.confirm('Masquer l\'arrivage actuel ? La section disparaîtra de la home.')) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/admin/arrivages/${current.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Arrivage masqué.');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-8">
      {current && (
        <section className="bg-white border border-neutral-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-serif text-neutral-800">Arrivage actuel sur la home</h3>
            <span className="text-[10px] uppercase tracking-widest text-green-primary bg-green-primary/10 px-2 py-1">
              Publié {formatRelativeDate(current.created_at)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5">
            <div className="relative aspect-[4/3] bg-neutral-100">
              <Image
                src={current.photo_url}
                alt="Arrivage Rungis actuel"
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <div className="space-y-2">
              {[current.produit_1, current.produit_2, current.produit_3].filter(Boolean).map((p, i) => (
                <div key={i} className="text-sm text-neutral-700 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-primary rounded-full" />
                  {p}
                </div>
              ))}
              <button
                type="button"
                onClick={onDeactivate}
                disabled={deactivating}
                className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-red-text transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                {deactivating ? 'Masquage…' : 'Masquer cet arrivage'}
              </button>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={onSubmit} className="bg-white border border-neutral-200 p-5 space-y-5">
        <h3 className="text-base font-serif text-neutral-800 inline-flex items-center gap-2">
          <Camera size={16} className="text-green-primary" />
          {current ? 'Publier un nouvel arrivage (remplace l\'actuel)' : 'Publier le premier arrivage'}
        </h3>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-neutral-600">Photo (JPEG, PNG, WebP — max 5 Mo) *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-neutral-600 file:mr-4 file:py-2 file:px-4 file:border file:border-neutral-300 file:text-xs file:uppercase file:tracking-widest file:font-medium file:bg-neutral-50 file:text-neutral-700 hover:file:bg-neutral-100"
          />
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Aperçu" className="mt-2 max-h-64 w-auto border border-neutral-200" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: produit1, set: setProduit1, label: 'Produit 1', placeholder: 'Fraises Mara des bois' },
            { value: produit2, set: setProduit2, label: 'Produit 2', placeholder: 'Asperges vertes' },
            { value: produit3, set: setProduit3, label: 'Produit 3', placeholder: 'Saint-Marcellin' },
          ].map((p, i) => (
            <div key={i} className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-neutral-600">{p.label}</label>
              <input
                type="text"
                value={p.value}
                onChange={(e) => p.set(e.target.value)}
                placeholder={p.placeholder}
                maxLength={PRODUIT_MAX}
                className="w-full px-3 py-2 border border-neutral-300 text-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting || !photoFile}
          className="inline-flex items-center gap-2 bg-green-primary text-white px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-green-dark transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {submitting ? 'Publication…' : 'Publier sur la home'}
        </button>
      </form>
    </div>
  );
}
