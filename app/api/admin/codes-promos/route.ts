import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { normalizeCode, normalizeEmail } from '@/lib/codes-promos';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['pourcent', 'montant_fixe']),
  valeur: z.coerce.number().int().positive(),
  reduction_max_cents: z.coerce.number().int().positive().nullish(),
  min_panier_cents: z.coerce.number().int().min(0).default(0),
  usage_max: z.coerce.number().int().positive().nullish(),
  usage_max_par_adresse: z.coerce.number().int().positive().nullish(),
  expire_at: z.string().nullish(),
  actif: z.coerce.boolean().default(true),
  description: z.string().max(200).nullish(),
  client_email_lock: z.string().email().nullish(),
});

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('codes_promos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[admin/codes-promos GET]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const input = createSchema.parse(body);

    const payload = {
      code: normalizeCode(input.code),
      type: input.type,
      valeur: input.valeur,
      reduction_max_cents: input.reduction_max_cents ?? null,
      min_panier_cents: input.min_panier_cents,
      usage_max: input.usage_max ?? null,
      usage_max_par_adresse: input.usage_max_par_adresse ?? null,
      expire_at: input.expire_at && input.expire_at.trim() !== '' ? input.expire_at : null,
      actif: input.actif,
      description: input.description?.trim() ? input.description.trim() : null,
      client_email_lock: input.client_email_lock ? normalizeEmail(input.client_email_lock) : null,
      // Codes créés via le panel admin = manuels, jamais marqués parrainage
      est_parrainage: false,
      parrain_email: null,
    };

    const { data, error } = await supabaseAdmin
      .from('codes_promos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Un code avec ce nom existe déjà.' }, { status: 409 });
      }
      console.error('[admin/codes-promos POST]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
    return NextResponse.json({ code: data }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/codes-promos POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
