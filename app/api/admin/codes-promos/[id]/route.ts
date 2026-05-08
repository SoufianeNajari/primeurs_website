import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  actif: z.coerce.boolean().optional(),
  expire_at: z.string().nullish(),
  usage_max: z.coerce.number().int().positive().nullish(),
  description: z.string().max(200).nullish(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const input = patchSchema.parse(body);

    const updatePayload: Record<string, unknown> = {};
    if (input.actif !== undefined) updatePayload.actif = input.actif;
    if (input.expire_at !== undefined) {
      updatePayload.expire_at = input.expire_at && input.expire_at.trim() !== '' ? input.expire_at : null;
    }
    if (input.usage_max !== undefined) updatePayload.usage_max = input.usage_max ?? null;
    if (input.description !== undefined) {
      updatePayload.description = input.description?.trim() ? input.description.trim() : null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('codes_promos')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[admin/codes-promos PATCH]', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Code introuvable' }, { status: 404 });
    return NextResponse.json({ code: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', issues: err.issues }, { status: 400 });
    }
    console.error('[admin/codes-promos PATCH]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { error } = await supabaseAdmin.from('codes_promos').delete().eq('id', params.id);
  if (error) {
    console.error('[admin/codes-promos DELETE]', error);
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
