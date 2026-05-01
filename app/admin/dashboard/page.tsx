import { supabaseAdmin } from '@/lib/supabase';
import OrdersChart from './OrdersChart';
import CommandesBloqueesToggle from './CommandesBloqueesToggle';
import { isCommandesBloquees } from '@/lib/parametres';
import Link from 'next/link';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Ligne = {
  produitId: string;
  optionId?: string;
  nom: string;
  categorie?: string;
  libelle?: string;
  prix?: number | null;
  quantite: number;
};

type Commande = {
  id: string;
  created_at: string;
  statut: string;
  client_nom: string;
  lignes: Ligne[];
};

function startOfDayParis(d: Date): Date {
  // approximation: décalage local du serveur (Vercel = UTC). Pour Paris on
  // soustrait 1 ou 2h. Suffisant pour un dashboard interne — pas critique.
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function fmtMonth(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function fmtMois(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const now = new Date();
  const startToday = startOfDayParis(now);
  const start7 = new Date(startToday);
  start7.setUTCDate(start7.getUTCDate() - 6);
  const start30 = new Date(startToday);
  start30.setUTCDate(start30.getUTCDate() - 29);

  const bloque = await isCommandesBloquees();

  const { data: commandesData } = await supabaseAdmin
    .from('commandes')
    .select('id, created_at, statut, client_nom, lignes')
    .gte('created_at', start30.toISOString())
    .order('created_at', { ascending: false });

  const commandes = (commandesData || []) as Commande[];

  const cmdToday = commandes.filter((c) => new Date(c.created_at) >= startToday);
  const cmd7 = commandes.filter((c) => new Date(c.created_at) >= start7);
  const cmd30 = commandes;

  // Panier moyen 30j (ne compte que les lignes avec prix)
  let totalRevenue = 0;
  let cmdAvecPrix = 0;
  for (const c of cmd30) {
    let total = 0;
    let hasPrix = false;
    for (const l of c.lignes || []) {
      if (l.prix != null) {
        total += Number(l.prix) * Number(l.quantite || 0);
        hasPrix = true;
      }
    }
    if (hasPrix) {
      totalRevenue += total;
      cmdAvecPrix += 1;
    }
  }
  const panierMoyen = cmdAvecPrix > 0 ? totalRevenue / cmdAvecPrix : null;

  // Top 5 produits sur 30j
  const produitsCount = new Map<string, { nom: string; qte: number; commandes: number }>();
  for (const c of cmd30) {
    const seen = new Set<string>();
    for (const l of c.lignes || []) {
      if (!l.produitId) continue;
      const cur = produitsCount.get(l.produitId) || { nom: l.nom, qte: 0, commandes: 0 };
      cur.qte += Number(l.quantite || 0);
      if (!seen.has(l.produitId)) {
        cur.commandes += 1;
        seen.add(l.produitId);
      }
      cur.nom = l.nom;
      produitsCount.set(l.produitId, cur);
    }
  }
  const topProduits = Array.from(produitsCount.values())
    .sort((a, b) => b.qte - a.qte)
    .slice(0, 5);

  // Commandes par jour sur 30j (pour graph)
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start30);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }
  for (const c of cmd30) {
    const key = c.created_at.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }
  const chartData = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

  // Mois disponibles pour export (depuis le mois courant et les 11 précédents)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthOptions.push({ value: fmtMois(d), label: fmtMonth(d) });
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Tableau de bord</h2>
        <p className="text-sm text-neutral-500">Vue d&apos;ensemble des commandes des 30 derniers jours.</p>
      </div>

      <CommandesBloqueesToggle initial={bloque} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        <Kpi label="Aujourd'hui" value={cmdToday.length} suffix={cmdToday.length > 1 ? 'commandes' : 'commande'} href="/admin/orders?periode=today" />
        <Kpi label="7 derniers jours" value={cmd7.length} suffix={cmd7.length > 1 ? 'commandes' : 'commande'} href="/admin/orders?periode=7d" />
        <Kpi label="30 derniers jours" value={cmd30.length} suffix={cmd30.length > 1 ? 'commandes' : 'commande'} href="/admin/orders?periode=30d" />
        <Kpi
          label="Panier moyen (30j)"
          value={panierMoyen != null ? panierMoyen.toFixed(2) : '—'}
          suffix={panierMoyen != null ? '€' : ''}
        />
      </div>

      {/* Graph */}
      <section className="mb-10 bg-white border border-neutral-200 p-5">
        <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4">Commandes par jour (30 derniers jours)</h3>
        <OrdersChart data={chartData} />
      </section>

      {/* Top produits */}
      <section className="mb-10 bg-white border border-neutral-200 p-5">
        <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-4">Top 5 produits commandés (30 derniers jours)</h3>
        {topProduits.length === 0 ? (
          <p className="text-sm text-neutral-400 font-serif italic">Aucune commande sur la période.</p>
        ) : (
          <ol className="divide-y divide-neutral-100">
            {topProduits.map((p, idx) => (
              <li key={idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 flex items-center justify-center bg-neutral-100 text-neutral-600 font-medium text-xs">{idx + 1}</span>
                  <span className="font-serif text-neutral-800 truncate">{p.nom}</span>
                </div>
                <div className="text-sm text-neutral-500 shrink-0 ml-2">
                  <span className="font-medium text-neutral-800">{p.qte}</span>
                  <span className="text-xs"> · </span>
                  <span className="text-xs">{p.commandes} cmd</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Export CSV */}
      <section className="bg-white border border-neutral-200 p-5">
        <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-3">Export CSV</h3>
        <p className="text-sm text-neutral-600 mb-4">Téléchargez l&apos;ensemble des commandes d&apos;un mois donné (UTF-8, séparateur virgule).</p>
        <div className="flex flex-wrap gap-2">
          {monthOptions.map((m) => (
            <Link
              key={m.value}
              href={`/api/admin/orders/export?month=${m.value}`}
              className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-300 text-sm hover:border-green-primary hover:text-green-primary transition-colors"
            >
              <Download size={14} strokeWidth={1.5} />
              <span className="capitalize">{m.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, suffix, href }: { label: string; value: string | number; suffix?: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl md:text-3xl font-serif text-neutral-900">{value}</span>
        {suffix && <span className="text-xs text-neutral-500">{suffix}</span>}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="bg-white border border-neutral-200 p-4 hover:border-green-primary hover:shadow-sm transition-all block">
        {inner}
      </Link>
    );
  }
  return <div className="bg-white border border-neutral-200 p-4">{inner}</div>;
}
