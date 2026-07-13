import { supabaseAdmin } from '@/lib/supabase';
import { formatPhoneFRDisplay, normalizePhoneFR } from '@/lib/phone';
import ClientsManager from './ClientsManager';

export const dynamic = 'force-dynamic';

export type ClientRow = {
  key: string;
  nom: string;
  telephoneDisplay: string;
  telephoneDigits: string;
  email: string | null;
  commandesCount: number;
  totalCents: number;
  derniereCommande: string; // ISO
};

type CommandeRow = {
  client_nom: string | null;
  client_telephone: string | null;
  client_email: string | null;
  created_at: string;
  statut: string;
  prix_final: number | null;
  lignes: { prix?: number | null; quantite?: number | null }[] | null;
};

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

// Total facturé si connu (prix_final), sinon estimation à partir des lignes.
function orderTotalCents(c: CommandeRow): number {
  if (c.prix_final != null) return Math.round(Number(c.prix_final) * 100);
  let cents = 0;
  for (const l of c.lignes || []) {
    if (l?.prix != null) cents += Math.round(Number(l.prix) * 100) * (Number(l.quantite) || 0);
  }
  return cents;
}

export default async function AdminClientsPage() {
  const { data: commandesRaw } = await supabaseAdmin
    .from('commandes')
    .select('client_nom, client_telephone, client_email, created_at, statut, prix_final, lignes')
    .order('created_at', { ascending: false });

  const commandes = (commandesRaw || []) as CommandeRow[];

  // Regroupement par téléphone normalisé (fallback : nom).
  const map = new Map<string, ClientRow & { _seenNom: boolean; _seenEmail: boolean }>();

  for (const c of commandes) {
    const e164 = c.client_telephone ? normalizePhoneFR(c.client_telephone) : null;
    const digits = e164 ? digitsOnly(e164) : digitsOnly(c.client_telephone || '');
    const key = digits || `nom:${(c.client_nom || '').trim().toLowerCase()}`;
    if (!key) continue;

    const isCancelled = c.statut === 'annulée';
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        // commandes triées desc → la 1re vue est la plus récente.
        nom: (c.client_nom || '').trim() || '—',
        telephoneDisplay: e164 ? formatPhoneFRDisplay(e164) : (c.client_telephone || '—'),
        telephoneDigits: digits,
        email: c.client_email || null,
        commandesCount: 0,
        totalCents: 0,
        derniereCommande: c.created_at,
        _seenNom: !!(c.client_nom || '').trim(),
        _seenEmail: !!c.client_email,
      };
      map.set(key, entry);
    } else {
      // Complète nom / email si le plus récent était vide.
      if (!entry._seenNom && (c.client_nom || '').trim()) {
        entry.nom = (c.client_nom || '').trim();
        entry._seenNom = true;
      }
      if (!entry._seenEmail && c.client_email) {
        entry.email = c.client_email;
        entry._seenEmail = true;
      }
    }

    // Une commande annulée ne compte ni dans le nb ni dans le total.
    if (!isCancelled) {
      entry.commandesCount += 1;
      entry.totalCents += orderTotalCents(c);
    }
  }

  const clients: ClientRow[] = Array.from(map.values())
    // On ne liste que les clients ayant au moins une commande valide.
    .filter((c) => c.commandesCount > 0)
    .map((c): ClientRow => ({
      key: c.key,
      nom: c.nom,
      telephoneDisplay: c.telephoneDisplay,
      telephoneDigits: c.telephoneDigits,
      email: c.email,
      commandesCount: c.commandesCount,
      totalCents: c.totalCents,
      derniereCommande: c.derniereCommande,
    }))
    .sort((a, b) => b.derniereCommande.localeCompare(a.derniereCommande));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-neutral-800">Clients</h1>
        <p className="text-sm text-neutral-500">
          Clients ayant passé commande — mis à jour automatiquement à chaque nouvelle commande.
        </p>
      </header>
      <ClientsManager clients={clients} />
    </div>
  );
}
