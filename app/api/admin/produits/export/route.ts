import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { csvEscape } from '@/lib/csv';

const HEADERS = [
  'nom',
  'categorie',
  'slug',
  'description',
  'description_longue',
  'origine',
  'bio',
  'local',
  'variete',
  'qualite',
  'mois_debut',
  'mois_fin',
  'ordre',
  'disponible',
  'image_url',
  'conseils_conservation',
  'opt1_libelle', 'opt1_prix',
  'opt2_libelle', 'opt2_prix',
  'opt3_libelle', 'opt3_prix',
  'opt4_libelle', 'opt4_prix',
  'opt5_libelle', 'opt5_prix',
  'opt6_libelle', 'opt6_prix',
];

type Opt = { libelle: string; prix: number | null };
type Row = {
  nom: string; categorie: string; slug: string;
  description: string | null; description_longue: string | null;
  origine: string | null; bio: boolean; local: boolean;
  variete: string | null; qualite: string | null;
  mois_debut: number | null; mois_fin: number | null;
  ordre: number | null; disponible: boolean;
  image_url: string | null; conseils_conservation: string | null;
  options: Opt[] | null;
};

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const url = new URL(request.url);
  const sep = url.searchParams.get('sep') === ';' ? ';' : ',';

  const { data, error } = await supabaseAdmin
    .from('produits')
    .select('nom, categorie, slug, description, description_longue, origine, bio, local, variete, qualite, mois_debut, mois_fin, ordre, disponible, image_url, conseils_conservation, options')
    .order('categorie', { ascending: true })
    .order('nom', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Row[];
  const lines: string[] = [HEADERS.join(sep)];

  for (const r of rows) {
    const opts = r.options || [];
    const optCells: string[] = [];
    for (let i = 0; i < 6; i++) {
      const o = opts[i];
      optCells.push(csvEscape(o?.libelle ?? ''));
      optCells.push(csvEscape(o?.prix == null ? '' : String(o.prix).replace('.', ',')));
    }
    const cells = [
      csvEscape(r.nom),
      csvEscape(r.categorie),
      csvEscape(r.slug),
      csvEscape(r.description),
      csvEscape(r.description_longue),
      csvEscape(r.origine),
      r.bio ? 'true' : 'false',
      r.local ? 'true' : 'false',
      csvEscape(r.variete),
      csvEscape(r.qualite),
      r.mois_debut ?? '',
      r.mois_fin ?? '',
      r.ordre ?? '',
      r.disponible ? 'true' : 'false',
      csvEscape(r.image_url),
      csvEscape(r.conseils_conservation),
      ...optCells,
    ].map(String);
    lines.push(cells.join(sep));
  }

  // BOM UTF-8 pour Excel
  const csv = '﻿' + lines.join('\n');
  const filename = `catalogue-produits-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
