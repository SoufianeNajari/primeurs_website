import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PRODUIT_MAX = 60;

function sanitizeProduit(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, PRODUIT_MAX);
  return trimmed || null;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Form invalide.' }, { status: 400 });
  }

  const photo = form.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'Photo requise.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(photo.type)) {
    return NextResponse.json({ error: 'Format image non supporté (JPEG, PNG ou WebP).' }, { status: 400 });
  }
  if (photo.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Photo trop lourde (max 5 Mo).' }, { status: 400 });
  }

  const produit_1 = sanitizeProduit(form.get('produit_1'));
  const produit_2 = sanitizeProduit(form.get('produit_2'));
  const produit_3 = sanitizeProduit(form.get('produit_3'));

  const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `arrivage-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await photo.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('arrivages')
    .upload(filename, buffer, {
      contentType: photo.type,
      cacheControl: '3600',
    });
  if (uploadError) {
    console.error('[arrivages] upload error:', uploadError);
    return NextResponse.json({ error: 'Erreur lors du téléversement.' }, { status: 500 });
  }

  const { data: publicData } = supabaseAdmin.storage.from('arrivages').getPublicUrl(filename);
  const photo_url = publicData.publicUrl;

  // Désactive tous les arrivages actifs avant d'insérer le nouveau.
  await supabaseAdmin.from('arrivages_rungis').update({ actif: false }).eq('actif', true);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('arrivages_rungis')
    .insert({ photo_url, produit_1, produit_2, produit_3, actif: true })
    .select('*')
    .single();
  if (insertError) {
    console.error('[arrivages] insert error:', insertError);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement.' }, { status: 500 });
  }

  revalidatePath('/');
  return NextResponse.json({ arrivage: inserted });
}
