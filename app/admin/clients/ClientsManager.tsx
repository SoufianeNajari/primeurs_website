'use client';

import { useMemo, useState } from 'react';
import { Search, X, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import type { ClientRow } from './page';
import { statutBadgeCls, statutLabel } from '@/lib/orderStatus';
import { shortOrderId } from '@/lib/order';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientsManager({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

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
          <div className="hidden md:grid grid-cols-[24px_1fr_150px_80px_110px_120px] gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
            <div></div>
            <div>Client</div>
            <div>Téléphone</div>
            <div className="text-right">Cmds</div>
            <div className="text-right">Total</div>
            <div className="text-right">Dernière</div>
          </div>
          <div className="divide-y divide-neutral-100">
            {filtered.map((c) => {
              const isOpen = expanded.has(c.key);
              return (
                <div key={c.key}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggle(c.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.key); } }}
                    className="grid grid-cols-[24px_1fr] md:grid-cols-[24px_1fr_150px_80px_110px_120px] gap-x-3 gap-y-1 px-4 py-3 md:items-center cursor-pointer hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center justify-center text-neutral-400 row-span-2 md:row-span-1">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-800 truncate">{c.nom}</div>
                      {c.email && (
                        <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 hover:underline truncate">
                          <Mail size={11} /> {c.email}
                        </a>
                      )}
                    </div>
                    <div className="col-start-2 md:col-start-auto text-sm">
                      {c.telephoneDigits ? (
                        <a href={`tel:${c.telephoneDisplay.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-green-primary font-medium hover:underline">
                          <Phone size={13} /> {c.telephoneDisplay}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </div>
                    <div className="col-start-2 md:col-start-auto text-sm text-neutral-700 md:text-right tabular-nums">
                      <span className="md:hidden text-neutral-400 mr-1">Commandes :</span>{c.commandesCount}
                    </div>
                    <div className="col-start-2 md:col-start-auto text-sm font-semibold text-neutral-800 md:text-right tabular-nums">
                      <span className="md:hidden text-neutral-400 mr-1 font-normal">Total :</span>{euro.format(c.totalCents / 100)}
                    </div>
                    <div className="col-start-2 md:col-start-auto text-xs text-neutral-500 md:text-right">
                      <span className="md:hidden text-neutral-400 mr-1">Dernière :</span>{formatRelative(c.derniereCommande)}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="bg-neutral-50 border-t border-neutral-100 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">
                        Historique ({c.orders.length} commande{c.orders.length > 1 ? 's' : ''}, annulées incluses)
                      </div>
                      <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
                        {c.orders.map((o) => (
                          <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                            <span className="font-mono text-xs text-neutral-500">{shortOrderId(o.id)}</span>
                            <span className="text-neutral-600">{formatDate(o.created_at)}</span>
                            <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 ${statutBadgeCls(o.statut)}`}>{statutLabel(o.statut)}</span>
                            <span className={`ml-auto tabular-nums font-medium ${o.statut === 'annulée' ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                              {o.totalCents > 0 ? euro.format(o.totalCents / 100) : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
