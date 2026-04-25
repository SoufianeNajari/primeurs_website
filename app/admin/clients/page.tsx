import { supabaseAdmin } from '@/lib/supabase';
import { formatPhoneFRDisplay } from '@/lib/phone';
import ClientsManager from './ClientsManager';

export const dynamic = 'force-dynamic';

export type ClientRow = {
  id: string;
  telephone: string;
  telephoneDisplay: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  actif: boolean;
  notes: string | null;
  created_at: string;
  commandes_count: number;
};

export type AccessRequestRow = {
  id: string;
  telephone: string;
  telephoneDisplay: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  message: string | null;
  statut: string;
  created_at: string;
};

export default async function AdminClientsPage() {
  const [{ data: clientsRaw }, { data: requestsRaw }, { data: ordersAgg }] = await Promise.all([
    supabaseAdmin
      .from('clients_autorises')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('commandes')
      .select('client_id')
      .not('client_id', 'is', null),
  ]);

  const counts = new Map<string, number>();
  for (const row of (ordersAgg || []) as { client_id: string }[]) {
    counts.set(row.client_id, (counts.get(row.client_id) || 0) + 1);
  }

  type RawClient = { id: string; telephone: string; prenom: string | null; nom: string | null; email: string | null; actif: boolean; notes: string | null; created_at: string };
  type RawRequest = { id: string; telephone: string; prenom: string | null; nom: string | null; email: string | null; message: string | null; statut: string; created_at: string };

  const clients: ClientRow[] = ((clientsRaw || []) as RawClient[]).map((c) => ({
    id: c.id,
    telephone: c.telephone,
    telephoneDisplay: formatPhoneFRDisplay(c.telephone),
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    actif: c.actif,
    notes: c.notes,
    created_at: c.created_at,
    commandes_count: counts.get(c.id) || 0,
  }));

  const requests: AccessRequestRow[] = ((requestsRaw || []) as RawRequest[]).map((r) => ({
    id: r.id,
    telephone: r.telephone,
    telephoneDisplay: formatPhoneFRDisplay(r.telephone),
    prenom: r.prenom,
    nom: r.nom,
    email: r.email,
    message: r.message,
    statut: r.statut,
    created_at: r.created_at,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-serif text-neutral-800">Clients autorisés</h1>
        <p className="text-sm text-neutral-500">
          Seuls les numéros listés ici peuvent accéder à la boutique en ligne.
        </p>
      </header>
      <ClientsManager initialClients={clients} initialRequests={requests} />
    </div>
  );
}
