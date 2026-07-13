'use client';

import { useMemo, useState } from 'react';
import { Search, X, Phone, Mail } from 'lucide-react';
import type { ClientRow } from './page';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 30) return `il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsManager({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return clients;
    const qText = normalizeText(q);
    const qDigits = digitsOnly(q);
    return clients.filter((c) => {
      if (normalizeText(c.nom).includes(qText)) return true;
      if (qDigits.length >= 2 && c.telephoneDigits.includes(qDigits)) return true;
      if (c.email && normalizeText(c.email).includes(qText)) return true;
      return false;
    });
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email…"
            className="w-full h-10 pl-9 pr-9 border border-neutral-300 bg-white text-sm focus:outline-none focus:border-green-primary"
            aria-label="Rechercher un client"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-neutral-500 tabular-nums">
          {filtered.length} client{filtered.length > 1 ? 's' : ''}
          {search && ` / ${clients.length}`}
        </span>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-neutral-500 text-sm">
          Aucun client pour le moment — la liste se remplit à chaque commande.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-8 text-center text-neutral-500 text-sm">
          Aucun résultat pour « {search} ».
        </div>
      ) : (
        <div className="bg-white border border-neutral-200">
          {/* En-tête (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_150px_80px_110px_120px] gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
            <div>Client</div>
            <div>Téléphone</div>
            <div className="text-right">Cmds</div>
            <div className="text-right">Total</div>
            <div className="text-right">Dernière</div>
          </div>
          <div className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <div key={c.key} className="grid grid-cols-1 md:grid-cols-[1fr_150px_80px_110px_120px] gap-1 md:gap-3 px-4 py-3 md:items-center">
                <div className="min-w-0">
                  <div className="font-medium text-neutral-800 truncate">{c.nom}</div>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 hover:underline truncate">
                      <Mail size={11} /> {c.email}
                    </a>
                  )}
                </div>
                <div className="text-sm">
                  {c.telephoneDigits ? (
                    <a href={`tel:${c.telephoneDisplay.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-green-primary font-medium hover:underline">
                      <Phone size={13} /> {c.telephoneDisplay}
                    </a>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>
                <div className="text-sm text-neutral-700 md:text-right tabular-nums">
                  <span className="md:hidden text-neutral-400 mr-1">Commandes :</span>{c.commandesCount}
                </div>
                <div className="text-sm font-semibold text-neutral-800 md:text-right tabular-nums">
                  <span className="md:hidden text-neutral-400 mr-1 font-normal">Total :</span>{euro.format(c.totalCents / 100)}
                </div>
                <div className="text-xs text-neutral-500 md:text-right">
                  <span className="md:hidden text-neutral-400 mr-1">Dernière :</span>{formatRelative(c.derniereCommande)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
