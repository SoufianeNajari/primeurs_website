import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Ligne = {
  produitId?: string;
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
  client_email: string;
  client_telephone: string;
  jour_retrait: string | null;
  creneau_retrait: string | null;
  date_retrait_souhaite: string | null;
  message: string | null;
  lignes: Ligne[];
};

// Échappe une cellule CSV : double les guillemets internes, encadre si besoin.
function csvCell(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  // Le middleware vérifie déjà le cookie admin pour /api/admin/*. Ici on fait
  // confiance à l'auth en amont.

  const month = request.nextUrl.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Paramètre month=YYYY-MM requis.' }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  if (monthNum < 1 || monthNum > 12) {
    return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));

  const { data, error } = await supabaseAdmin
    .from('commandes')
    .select('id, created_at, statut, client_nom, client_email, client_telephone, jour_retrait, creneau_retrait, date_retrait_souhaite, message, lignes')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[export commandes]', error);
    return NextResponse.json({ error: 'Erreur lecture commandes.' }, { status: 500 });
  }

  const commandes = (data || []) as Commande[];

  const headers = [
    'commande_id',
    'date',
    'statut',
    'client_nom',
    'client_email',
    'client_telephone',
    'jour_retrait',
    'creneau_retrait',
    'date_retrait_souhaite',
    'message',
    'produit',
    'libelle',
    'quantite',
    'prix_unitaire',
    'total_ligne',
  ];

  const rows: string[] = [headers.join(',')];

  for (const c of commandes) {
    const lignes = c.lignes && c.lignes.length > 0 ? c.lignes : [null];
    for (const l of lignes) {
      const prix = l && l.prix != null ? Number(l.prix) : null;
      const qte = l ? Number(l.quantite || 0) : 0;
      const total = prix != null ? (prix * qte).toFixed(2) : '';
      rows.push(
        [
          c.id,
          c.created_at,
          c.statut,
          c.client_nom,
          c.client_email,
          c.client_telephone,
          c.jour_retrait || '',
          c.creneau_retrait || '',
          c.date_retrait_souhaite || '',
          c.message || '',
          l?.nom || '',
          l?.libelle || '',
          qte || '',
          prix != null ? prix.toFixed(2) : '',
          total,
        ].map(csvCell).join(','),
      );
    }
  }

  // BOM UTF-8 pour qu'Excel reconnaisse l'encodage.
  const csv = '﻿' + rows.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="commandes-${month}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
