'use client'

import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { COMMENTAIRE_MAX, useCart } from './CartContext';

export default function CartItemNote({ itemKey }: { itemKey: string }) {
  const { cart, setItemCommentaire } = useCart();
  const value = cart[itemKey]?.commentaire ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const save = () => {
    setItemCommentaire(itemKey, draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-2">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENTAIRE_MAX))}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget as HTMLTextAreaElement).blur();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            placeholder="Ex : pas trop mûr, bien fermes…"
            rows={2}
            maxLength={COMMENTAIRE_MAX}
            className="w-full text-sm border border-neutral-300 px-3 py-2 focus:outline-none focus:border-green-primary resize-none bg-white"
            autoFocus
            aria-label="Note pour ce produit"
          />
          <span className="absolute bottom-1.5 right-2 text-[10px] text-neutral-400 tabular-nums pointer-events-none">
            {draft.length} / {COMMENTAIRE_MAX}
          </span>
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <button
        type="button"
        onClick={startEdit}
        aria-label={`Modifier la note pour ce produit (actuel : ${value})`}
        className="mt-2 w-full text-left flex items-start gap-2 text-xs text-neutral-700 hover:text-neutral-900 group"
      >
        <Check size={12} className="shrink-0 mt-0.5 text-green-primary" />
        <span className="italic flex-1">« {value} »</span>
        <Pencil size={11} className="shrink-0 mt-0.5 text-neutral-300 group-hover:text-neutral-600" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="mt-2 text-left text-[11px] uppercase tracking-widest text-neutral-500 hover:text-green-primary inline-flex items-center gap-1.5 border-b border-dashed border-neutral-300 pb-0.5 hover:border-green-primary transition-colors"
    >
      <Pencil size={11} />
      Préciser (mûreté, taille…)
    </button>
  );
}
