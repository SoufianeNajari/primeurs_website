import { NextResponse } from 'next/server';
import { validateCodePromo } from '@/lib/codes-promos';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/codes-promos/validate
// Body: { code: string, panierCents: number }
// Retourne : { ok: true, libelle, reductionCents } | { ok: false, raison }
//
// Cette route ne mute rien : elle sert uniquement à donner un feedback live
// au client dans OrderForm. La validation finale (autoritaire) a lieu dans
// /api/order au moment de l'enregistrement de la commande.
export async function POST(request: Request) {
  // Rate limit : 30 validations / 5 min / IP — généreux mais protège du spam.
  const ip = getClientIp();
  const rl = rateLimit('promo', ip, 30, 5 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, raison: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const codeRaw = typeof body?.code === 'string' ? body.code : '';
    const panierCents = Number.isFinite(body?.panierCents) ? Math.round(body.panierCents) : 0;
    const emailRaw = typeof body?.email === 'string' ? body.email : null;
    const banId = typeof body?.banId === 'string' && body.banId.trim() ? body.banId.trim() : null;

    if (!codeRaw) {
      return NextResponse.json({ ok: false, raison: 'Code requis.' }, { status: 400 });
    }
    if (panierCents <= 0) {
      return NextResponse.json(
        { ok: false, raison: 'Ajoute des produits pour appliquer un code.' },
        { status: 400 },
      );
    }

    const result = await validateCodePromo(codeRaw, panierCents, emailRaw, banId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 200 });
    }
    return NextResponse.json({
      ok: true,
      libelle: result.libelle,
      reductionCents: result.reductionCents,
      code: result.code.code,
    });
  } catch {
    return NextResponse.json(
      { ok: false, raison: 'Erreur de validation.' },
      { status: 500 },
    );
  }
}
