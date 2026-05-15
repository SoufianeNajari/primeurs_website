'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';

type Values = {
  fraisCents: number;
  minCents: number;
  seuilGratuitCents: number;
  maxMerciParParrain: number;
};

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function inputToCents(raw: string): number | null {
  const cleaned = raw.replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function ParametresForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const toast = useToast();
  const [frais, setFrais] = useState(centsToInput(initial.fraisCents));
  const [min, setMin] = useState(centsToInput(initial.minCents));
  const [seuil, setSeuil] = useState(centsToInput(initial.seuilGratuitCents));
  const [maxMerci, setMaxMerci] = useState(String(initial.maxMerciParParrain));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fraisCents = inputToCents(frais);
    const minCents = inputToCents(min);
    const seuilGratuitCents = inputToCents(seuil);
    const maxMerciNum = Math.round(Number(maxMerci));
    if (fraisCents === null || minCents === null || seuilGratuitCents === null) {
      toast.error('Valeurs numériques invalides.');
      return;
    }
    if (!Number.isFinite(maxMerciNum) || maxMerciNum < 0 || maxMerciNum > 1000) {
      toast.error('Plafond MERCI invalide (0 à 1000).');
      return;
    }
    if (seuilGratuitCents > 0 && seuilGratuitCents < minCents) {
      toast.error('Le seuil livraison offerte doit être ≥ au minimum de commande.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/parametres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fraisCents, minCents, seuilGratuitCents, maxMerciParParrain: maxMerciNum }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Erreur lors de l’enregistrement.');
        return;
      }
      toast.success('Paramètres enregistrés.');
      router.refresh();
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-neutral-200 rounded p-4 md:p-6 shadow-sm">
      <Field
        label="Minimum de commande"
        help="En dessous, le client ne peut pas valider sa commande."
        value={min}
        onChange={setMin}
      />
      <Field
        label="Frais de livraison"
        help="Appliqués si le sous-total est inférieur au seuil de livraison offerte. 0 € = jamais facturé."
        value={frais}
        onChange={setFrais}
      />
      <Field
        label="Seuil livraison offerte"
        help="Au-dessus de ce montant (sous-total avant code promo), la livraison passe à 0 €. Mettre 0 pour désactiver le seuil."
        value={seuil}
        onChange={setSeuil}
      />

      <div className="pt-4 border-t border-neutral-100">
        <h3 className="text-base font-medium text-neutral-800 mb-3">Anti-abus parrainage</h3>
        <label className="block">
          <span className="block text-sm font-medium text-neutral-800 mb-1">Plafond de codes MERCI par parrain</span>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              step={1}
              value={maxMerci}
              onChange={(e) => setMaxMerci(e.target.value)}
              className="w-full border border-neutral-300 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-dark/40"
              placeholder="5"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">codes</span>
          </div>
          <span className="block text-xs text-neutral-500 mt-1">
            Combien de codes cadeaux « MERCI » un même parrain peut accumuler au total. Au-delà, le parrainage continue de marcher pour ses filleuls mais le parrain ne reçoit plus de nouveau code. 0 = aucun crédit, jamais.
          </span>
        </label>
      </div>

      <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-green-dark text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-dark/90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-800 mb-1">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-dark/40"
          placeholder="0,00"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">€</span>
      </div>
      <span className="block text-xs text-neutral-500 mt-1">{help}</span>
    </label>
  );
}
