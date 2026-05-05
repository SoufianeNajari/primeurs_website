import { supabaseAdmin } from '@/lib/supabase';
import OrdersChart from './OrdersChart';
import CommandesBloqueesToggle from './CommandesBloqueesToggle';
import PeriodFilter from './PeriodFilter';
import { isCommandesBloquees } from '@/lib/parametres';
import Link from 'next/link';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Ligne = {
  produitId?: string;
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
  client_telephone?: string | null;
  prix_final?: number | null;
  lignes: Ligne[];
};

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const euroCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function todayParisKey(): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function parisDateKey(d: Date): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d);
}

function parseDateKey(key: string): Date {
  // YYYY-MM-DD interprété en début de journée Paris (~UTC-1/-2). On utilise
  // 00:00 UTC comme borne basse — l'écart d'1-2h n'a aucun impact statistique.
  return new Date(key + 'T00:00:00Z');
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

type ResolvedPeriod = {
  period: string;
  fromKey: string;
  toKey: string;
  fromDate: Date;
  toDateExclusive: Date;
  label: string;
};

function resolvePeriod(period: string, from: string | null, to: string | null): ResolvedPeriod {
  const todayKey = todayParisKey();
  const today = parseDateKey(todayKey);

  if (period === 'custom' && from && to && from <= to) {
    return {
      period: 'custom',
      fromKey: from,
      toKey: to,
      fromDate: parseDateKey(from),
      toDateExclusive: addDays(parseDateKey(to), 1),
      label: `Du ${formatFr(from)} au ${formatFr(to)}`,
    };
  }
  if (period === 'month') {
    const [y, m] = todayKey.split('-');
    const fromKey = `${y}-${m}-01`;
    return {
      period: 'month',
      fromKey,
      toKey: todayKey,
      fromDate: parseDateKey(fromKey),
      toDateExclusive: addDays(today, 1),
      label: 'Mois en cours',
    };
  }
  if (period === '365d') {
    const fromDate = addDays(today, -364);
    const fromKey = parisDateKey(fromDate);
    return {
      period: '365d',
      fromKey,
      toKey: todayKey,
      fromDate,
      toDateExclusive: addDays(today, 1),
      label: '12 derniers mois',
    };
  }
  if (period === '7d') {
    const fromDate = addDays(today, -6);
    const fromKey = parisDateKey(fromDate);
    return {
      period: '7d',
      fromKey,
      toKey: todayKey,
      fromDate,
      toDateExclusive: addDays(today, 1),
      label: '7 derniers jours',
    };
  }
  // default 30d
  const fromDate = addDays(today, -29);
  const fromKey = parisDateKey(fromDate);
  return {
    period: '30d',
    fromKey,
    toKey: todayKey,
    fromDate,
    toDateExclusive: addDays(today, 1),
    label: '30 derniers jours',
  };
}

function formatFr(key: string): string {
  return parseDateKey(key).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function commandeRevenue(c: Commande): number | null {
  if (c.prix_final != null && !Number.isNaN(Number(c.prix_final))) {
    return Number(c.prix_final);
  }
  let total = 0;
  let any = false;
  for (const l of c.lignes || []) {
    if (l.prix != null) {
      total += Number(l.prix) * Number(l.quantite || 0);
      any = true;
    }
  }
  return any ? total : null;
}

function fmtMonth(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function fmtMois(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string; from?: string; to?: string; statut?: string; topBy?: string; graph?: string };
}) {
  const period = searchParams?.period || '30d';
  const from = searchParams?.from || null;
  const to = searchParams?.to || null;
  const statut = searchParams?.statut === 'all' ? 'all' : 'active';
  const topBy = searchParams?.topBy === 'ca' ? 'ca' : 'qte';
  const graphType = searchParams?.graph === 'ca' ? 'ca' : 'count';

  const resolved = resolvePeriod(period, from, to);

  const bloque = await isCommandesBloquees();

  const { data: commandesData } = await supabaseAdmin
    .from('commandes')
    .select('id, created_at, statut, client_nom, client_telephone, prix_final, lignes')
    .gte('created_at', resolved.fromDate.toISOString())
    .lt('created_at', resolved.toDateExclusive.toISOString())
    .order('created_at', { ascending: false });

  const all = (commandesData || []) as Commande[];
  const commandes = statut === 'active' ? all.filter((c) => c.statut !== 'annulée') : all;

  // KPIs
  let revenuTotal = 0;
  let cmdAvecRevenu = 0;
  const tels = new Set<string>();
  for (const c of commandes) {
    const rev = commandeRevenue(c);
    if (rev != null) {
      revenuTotal += rev;
      cmdAvecRevenu += 1;
    }
    if (c.client_telephone) tels.add(c.client_telephone.replace(/\D/g, ''));
  }
  const panierMoyen = cmdAvecRevenu > 0 ? revenuTotal / cmdAvecRevenu : null;

  // Top produits
  const prodMap = new Map<string, { nom: string; qte: number; ca: number; commandes: number }>();
  for (const c of commandes) {
    const seen = new Set<string>();
    for (const l of c.lignes || []) {
      const key = l.produitId || l.nom;
      if (!key) continue;
      const cur = prodMap.get(key) || { nom: l.nom, qte: 0, ca: 0, commandes: 0 };
      const qte = Number(l.quantite || 0);
      cur.qte += qte;
      if (l.prix != null) cur.ca += Number(l.prix) * qte;
      if (!seen.has(key)) {
        cur.commandes += 1;
        seen.add(key);
      }
      cur.nom = l.nom;
      prodMap.set(key, cur);
    }
  }
  const topProduits = Array.from(prodMap.values())
    .sort((a, b) => (topBy === 'ca' ? b.ca - a.ca : b.qte - a.qte))
    .slice(0, 10);

  // Série graph : agrégation par jour si <=92j, sinon par mois
  const spanDays =
    Math.round((resolved.toDateExclusive.getTime() - resolved.fromDate.getTime()) / 86_400_000);
  const groupBy: 'day' | 'month' = spanDays <= 92 ? 'day' : 'month';

  const buckets = new Map<string, { count: number; ca: number }>();
  if (groupBy === 'day') {
    for (let i = 0; i < spanDays; i++) {
      const d = addDays(resolved.fromDate, i);
      buckets.set(parisDateKey(d), { count: 0, ca: 0 });
    }
  } else {
    let cursor = new Date(Date.UTC(resolved.fromDate.getUTCFullYear(), resolved.fromDate.getUTCMonth(), 1));
    const end = resolved.toDateExclusive;
    while (cursor < end) {
      const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      buckets.set(k, { count: 0, ca: 0 });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
  }

  for (const c of commandes) {
    const dateKey = parisDateKey(new Date(c.created_at));
    const key = groupBy === 'day' ? dateKey : dateKey.slice(0, 7);
    const b = buckets.get(key);
    if (!b) continue;
    b.count += 1;
    const rev = commandeRevenue(c);
    if (rev != null) b.ca += rev;
  }

  const chartData = Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    value: graphType === 'ca' ? Math.round(v.ca * 100) / 100 : v.count,
    count: v.count,
    ca: v.ca,
  }));

  // Mois disponibles pour export (depuis le mois courant et les 11 précédents)
  const now = new Date();
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthOptions.push({ value: fmtMois(d), label: fmtMonth(d) });
  }

  function tabHref(key: 'topBy' | 'graph', value: string): string {
    const sp = new URLSearchParams();
    if (period) sp.set('period', period);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (statut) sp.set('statut', statut);
    sp.set('topBy', key === 'topBy' ? value : topBy);
    sp.set('graph', key === 'graph' ? value : graphType);
    return `/admin/dashboard?${sp.toString()}`;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2">Tableau de bord</h2>
        <p className="text-sm text-neutral-500">{resolved.label}.</p>
      </div>

      <CommandesBloqueesToggle initial={bloque} />

      <PeriodFilter period={resolved.period} from={from} to={to} statut={statut} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        <Kpi
          label="Chiffre d'affaires"
          value={euro.format(revenuTotal)}
          hint={cmdAvecRevenu < commandes.length ? `${commandes.length - cmdAvecRevenu} sans prix` : undefined}
        />
        <Kpi
          label="Commandes"
          value={commandes.length}
          suffix={commandes.length > 1 ? 'commandes' : 'commande'}
          href={`/admin/orders${period === '7d' ? '?periode=7d' : period === '30d' ? '?periode=30d' : ''}`}
        />
        <Kpi
          label="Panier moyen"
          value={panierMoyen != null ? euro.format(panierMoyen) : '—'}
        />
        <Kpi
          label="Clients uniques"
          value={tels.size}
          suffix={tels.size > 1 ? 'numéros' : 'numéro'}
        />
      </div>

      {/* Graph */}
      <section className="mb-10 bg-white border border-neutral-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500">
            {graphType === 'ca' ? "Chiffre d'affaires" : 'Commandes'} par {groupBy === 'day' ? 'jour' : 'mois'}
          </h3>
          <div className="flex gap-1">
            <Link
              href={tabHref('graph', 'count')}
              className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 border transition-colors ${
                graphType === 'count'
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              Nb commandes
            </Link>
            <Link
              href={tabHref('graph', 'ca')}
              className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 border transition-colors ${
                graphType === 'ca'
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              CA
            </Link>
          </div>
        </div>
        <OrdersChart
          data={chartData.map((d) => ({ date: d.date, value: d.value }))}
          formatTooltip={(d) => {
            const raw = chartData.find((x) => x.date === d.date);
            const ca = raw ? euro.format(raw.ca) : '—';
            const count = raw ? raw.count : 0;
            const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(d.date)
              ? formatFr(d.date)
              : d.date;
            return `${dateLabel} · ${count} cmd · ${ca}`;
          }}
          formatBarLabel={graphType === 'ca' ? (d) => euroCompact.format(d.value) : undefined}
        />
      </section>

      {/* Top produits */}
      <section className="mb-10 bg-white border border-neutral-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-[11px] uppercase tracking-widest font-medium text-neutral-500">
            Top 10 produits
          </h3>
          <div className="flex gap-1">
            <Link
              href={tabHref('topBy', 'qte')}
              className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 border transition-colors ${
                topBy === 'qte'
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              Par quantité
            </Link>
            <Link
              href={tabHref('topBy', 'ca')}
              className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 border transition-colors ${
                topBy === 'ca'
                  ? 'border-green-primary text-green-primary bg-green-primary/5'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              Par CA
            </Link>
          </div>
        </div>
        {topProduits.length === 0 ? (
          <p className="text-sm text-neutral-400 font-serif italic">Aucune commande sur la période.</p>
        ) : (
          <ol className="divide-y divide-neutral-100">
            {topProduits.map((p, idx) => (
              <li key={idx} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 flex items-center justify-center bg-neutral-100 text-neutral-600 font-medium text-xs shrink-0">{idx + 1}</span>
                  <span className="font-serif text-neutral-800 truncate">{p.nom}</span>
                </div>
                <div className="text-sm text-neutral-500 shrink-0 ml-2 text-right">
                  <div>
                    <span className="font-medium text-neutral-800">
                      {topBy === 'ca' ? euro.format(p.ca) : p.qte}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {topBy === 'ca' ? '' : ' u.'}
                    </span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                    {topBy === 'ca' ? `${p.qte} u.` : euro.format(p.ca)} · {p.commandes} cmd
                  </div>
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

function Kpi({
  label,
  value,
  suffix,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl md:text-3xl font-serif text-neutral-900">{value}</span>
        {suffix && <span className="text-xs text-neutral-500">{suffix}</span>}
      </div>
      {hint && <div className="mt-1 text-[10px] text-neutral-400">{hint}</div>}
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
