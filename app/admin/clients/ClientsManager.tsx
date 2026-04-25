'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import type { ClientRow, AccessRequestRow } from './page';

type Props = {
  initialClients: ClientRow[];
  initialRequests: AccessRequestRow[];
};

export default function ClientsManager({ initialClients, initialRequests }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function call(url: string, body: unknown, busyKey: string) {
    setBusy(busyKey);
    setError('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erreur');
        return false;
      }
      refresh();
      return true;
    } catch {
      setError('Erreur réseau');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const filtered = initialClients.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.telephone.includes(s.replace(/\s/g, '')) ||
      c.telephoneDisplay.includes(s) ||
      (c.prenom || '').toLowerCase().includes(s) ||
      (c.nom || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-8">
      {error && (
        <div className="text-red-text text-sm bg-red-soft p-3 border border-red-text/20">{error}</div>
      )}

      {initialRequests.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-widest font-medium text-neutral-700 mb-3">
            Demandes d&apos;accès en attente ({initialRequests.length})
          </h2>
          <div className="bg-white border border-amber-200 divide-y divide-amber-100">
            {initialRequests.map((r) => (
              <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800">
                    {r.prenom} {r.nom}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {r.telephoneDisplay}
                    {r.email && <> · {r.email}</>}
                  </div>
                  {r.message && (
                    <div className="text-sm text-neutral-600 italic mt-1">« {r.message} »</div>
                  )}
                  <div className="text-xs text-neutral-400 mt-1">
                    {new Date(r.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => call('/api/admin/clients/approve', { requestId: r.id }, `approve:${r.id}`)}
                    disabled={busy === `approve:${r.id}`}
                    className="inline-flex items-center gap-1 bg-green-primary text-white px-3 py-2 text-xs uppercase tracking-widest hover:bg-green-dark disabled:opacity-50"
                  >
                    <Check size={14} /> Approuver
                  </button>
                  <button
                    onClick={() => call('/api/admin/clients/reject', { requestId: r.id }, `reject:${r.id}`)}
                    disabled={busy === `reject:${r.id}`}
                    className="inline-flex items-center gap-1 border border-neutral-300 text-neutral-600 px-3 py-2 text-xs uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <X size={14} /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm uppercase tracking-widest font-medium text-neutral-700">
            Whitelist ({initialClients.length})
          </h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2 text-[11px] uppercase tracking-widest hover:bg-green-dark"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {showAdd && (
          <AddClientForm
            onCreated={() => {
              setShowAdd(false);
              refresh();
            }}
            onError={setError}
          />
        )}

        <input
          type="text"
          placeholder="Rechercher par nom ou téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 mb-3 px-3 py-2 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none text-sm"
        />

        {filtered.length === 0 ? (
          <div className="bg-white border border-neutral-200 p-8 text-center text-neutral-500 text-sm">
            {initialClients.length === 0
              ? 'Aucun client autorisé pour le moment.'
              : 'Aucun résultat.'}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800">
                    {c.prenom || c.nom ? `${c.prenom || ''} ${c.nom || ''}`.trim() : '—'}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {c.telephoneDisplay}
                    {c.email && <> · {c.email}</>}
                  </div>
                  {c.notes && <div className="text-xs text-neutral-500 italic mt-1">{c.notes}</div>}
                  <div className="text-xs text-neutral-400 mt-1">
                    {c.commandes_count} commande{c.commandes_count > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={c.actif}
                      disabled={busy === `toggle:${c.id}`}
                      onChange={() =>
                        call('/api/admin/clients/toggle', { id: c.id, actif: !c.actif }, `toggle:${c.id}`)
                      }
                      className="accent-green-primary"
                    />
                    {c.actif ? 'Actif' : 'Inactif'}
                  </label>
                  <button
                    onClick={() => {
                      if (!confirm(`Supprimer ${c.prenom || ''} ${c.nom || ''} ?`)) return;
                      call('/api/admin/clients/delete', { id: c.id }, `del:${c.id}`);
                    }}
                    disabled={busy === `del:${c.id}`}
                    className="text-neutral-400 hover:text-red-text disabled:opacity-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AddClientForm({ onCreated, onError }: { onCreated: () => void; onError: (e: string) => void }) {
  const [telephone, setTelephone] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone, prenom, nom, email, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError(data.error || 'Erreur');
        return;
      }
      setTelephone(''); setPrenom(''); setNom(''); setEmail(''); setNotes('');
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-neutral-200 p-4 mb-4 grid gap-3 md:grid-cols-2">
      <input
        type="tel"
        placeholder="Téléphone (06…) *"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        required
        className="px-3 py-2 border border-neutral-300 outline-none focus:ring-1 focus:ring-green-primary text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="px-3 py-2 border border-neutral-300 outline-none focus:ring-1 focus:ring-green-primary text-sm"
        />
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="px-3 py-2 border border-neutral-300 outline-none focus:ring-1 focus:ring-green-primary text-sm"
        />
      </div>
      <input
        type="email"
        placeholder="Email (facultatif)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-3 py-2 border border-neutral-300 outline-none focus:ring-1 focus:ring-green-primary text-sm"
      />
      <input
        type="text"
        placeholder="Notes (facultatif)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="px-3 py-2 border border-neutral-300 outline-none focus:ring-1 focus:ring-green-primary text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="md:col-span-2 bg-green-primary text-white py-2 text-[11px] uppercase tracking-widest hover:bg-green-dark disabled:opacity-50"
      >
        {busy ? 'Ajout…' : 'Ajouter le client'}
      </button>
    </form>
  );
}
