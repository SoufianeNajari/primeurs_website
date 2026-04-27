'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Check, X } from 'lucide-react';

type Categorie = {
  id: string;
  slug: string;
  nom: string;
  emoji: string | null;
  ordre: number;
  actif: boolean;
  count: number;
};

export default function CategoriesManager({ initialCategories }: { initialCategories: Categorie[] }) {
  const router = useRouter();
  const [cats, setCats] = useState<Categorie[]>(initialCategories);
  const [newNom, setNewNom] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newNom.trim()) return;
    setBusy('add'); setError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newNom.trim(), emoji: newEmoji.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setCats(prev => [...prev, { ...json.categorie, count: 0 }]);
      setNewNom(''); setNewEmoji('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally { setBusy(null); }
  }

  async function patchCat(id: string, patch: Partial<Categorie>, optimistic = true) {
    setBusy(id); setError(null);
    const prev = cats;
    if (optimistic) {
      setCats(curr => curr.map(c => c.id === id ? { ...c, ...patch } : c));
    }
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setCats(curr => curr.map(c => c.id === id ? { ...c, ...json.categorie } : c));
      router.refresh();
    } catch (err) {
      setCats(prev);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally { setBusy(null); }
  }

  async function moveUp(idx: number) {
    if (idx === 0) return;
    const a = cats[idx], b = cats[idx - 1];
    setCats(curr => {
      const next = [...curr];
      next[idx - 1] = { ...a, ordre: b.ordre };
      next[idx] = { ...b, ordre: a.ordre };
      return next.sort((x, y) => x.ordre - y.ordre);
    });
    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordre: b.ordre }) }),
      fetch(`/api/admin/categories/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordre: a.ordre }) }),
    ]);
    router.refresh();
  }

  async function moveDown(idx: number) {
    if (idx >= cats.length - 1) return;
    const a = cats[idx], b = cats[idx + 1];
    setCats(curr => {
      const next = [...curr];
      next[idx + 1] = { ...a, ordre: b.ordre };
      next[idx] = { ...b, ordre: a.ordre };
      return next.sort((x, y) => x.ordre - y.ordre);
    });
    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordre: b.ordre }) }),
      fetch(`/api/admin/categories/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordre: a.ordre }) }),
    ]);
    router.refresh();
  }

  async function handleDelete(c: Categorie) {
    if (c.count > 0) {
      alert(`Impossible : ${c.count} produit(s) utilise(nt) cette catégorie. Désactivez-la ou réaffectez les produits.`);
      return;
    }
    if (!confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
    setBusy(c.id); setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setCats(curr => curr.filter(x => x.id !== c.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally { setBusy(null); }
  }

  function startEdit(c: Categorie) {
    setEditing(c.id);
    setEditNom(c.nom);
    setEditEmoji(c.emoji || '');
  }

  async function saveEdit(id: string) {
    if (!editNom.trim()) return;
    await patchCat(id, { nom: editNom.trim(), emoji: editEmoji.trim() || null });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-4">
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-medium mb-2">Ajouter une catégorie</div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            placeholder="ex : Agrumes, Fruits secs, Fruits exotiques…"
            maxLength={60}
            required
            className="flex-1 min-w-[200px] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-green-primary"
          />
          <input
            type="text"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="🍋"
            maxLength={4}
            className="w-16 border border-neutral-300 px-3 py-2 text-sm text-center focus:outline-none focus:border-green-primary"
            title="Emoji optionnel"
          />
          <button
            type="submit"
            disabled={!newNom.trim() || busy === 'add'}
            className="inline-flex items-center gap-1.5 bg-green-primary text-white px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-green-dark disabled:opacity-50"
          >
            {busy === 'add' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Ajouter
          </button>
        </div>
      </form>

      <div className="bg-white border border-neutral-200">
        {cats.length === 0 ? (
          <div className="text-center text-neutral-500 py-8 text-sm">Aucune catégorie. Ajoutez-en une ci-dessus.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {cats.map((c, idx) => (
              <li key={c.id} className={`px-3 py-3 flex items-center gap-2 ${!c.actif ? 'opacity-50 bg-neutral-50' : ''}`}>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0 || busy !== null}
                    className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    aria-label="Monter"
                  ><ArrowUp size={12} /></button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === cats.length - 1 || busy !== null}
                    className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                    aria-label="Descendre"
                  ><ArrowDown size={12} /></button>
                </div>

                {editing === c.id ? (
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      maxLength={60}
                      autoFocus
                      className="flex-1 min-w-[150px] border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-green-primary"
                    />
                    <input
                      type="text"
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      maxLength={4}
                      className="w-14 border border-neutral-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:border-green-primary"
                    />
                    <button
                      onClick={() => saveEdit(c.id)}
                      disabled={busy === c.id}
                      className="p-1.5 bg-green-primary text-white hover:bg-green-dark disabled:opacity-50"
                      aria-label="Valider"
                    >{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                    <button
                      onClick={() => setEditing(null)}
                      className="p-1.5 border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      aria-label="Annuler"
                    ><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(c)}
                    className="flex-1 text-left flex items-center gap-2 hover:bg-neutral-50 px-2 py-1 -mx-2"
                  >
                    {c.emoji && <span className="text-lg">{c.emoji}</span>}
                    <span className="font-medium text-neutral-800">{c.nom}</span>
                    <span className="text-xs text-neutral-400">/{c.slug}</span>
                  </button>
                )}

                <span className="text-xs text-neutral-500 px-2 hidden sm:inline">
                  {c.count} produit{c.count > 1 ? 's' : ''}
                </span>

                <label className="flex items-center gap-1.5 cursor-pointer select-none px-2" title="Actif (visible côté boutique)">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.actif}
                    onClick={() => patchCat(c.id, { actif: !c.actif })}
                    disabled={busy !== null}
                    className={`relative w-9 h-5 rounded-full transition-colors ${c.actif ? 'bg-green-primary' : 'bg-neutral-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${c.actif ? 'translate-x-4' : ''}`} />
                  </button>
                </label>

                <button
                  onClick={() => handleDelete(c)}
                  disabled={busy !== null || c.count > 0}
                  className="p-1.5 text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Supprimer"
                  title={c.count > 0 ? 'Supprimez/réaffectez les produits avant' : 'Supprimer'}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        💡 Une catégorie désactivée reste rattachée à ses produits mais n&apos;apparaît plus dans les filtres boutique.
        Pour la supprimer définitivement, réaffectez d&apos;abord ses produits à une autre catégorie.
      </p>
    </div>
  );
}
