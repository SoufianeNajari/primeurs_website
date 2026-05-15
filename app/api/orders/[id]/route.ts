import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';
import { loadActiveCode } from '@/lib/codes-promos';
import { traiterUsageSiParrainage } from '@/lib/parrainage';

const STATUTS_AUTORISES = ['en_attente', 'confirmée', 'préparée', 'retirée', 'annulée'] as const;

// Tente de créditer un code MERCI au parrain quand la commande passe en
// statut « retirée » (= livrée). Idempotent : la colonne merci_credite_at
// empêche tout double-crédit si l'admin re-clique sur le statut.
async function tenterCreditMerciSiLivree(id: string) {
  const { data, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_email, code_promo, merci_credite_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return;
  if (!data.code_promo) return;
  if (data.merci_credite_at) return;

  const code = await loadActiveCode(data.code_promo);
  // loadActiveCode rejette les codes inactifs/épuisés mais on a juste
  // besoin de retrouver l'id + savoir si c'est un code parrainage. On
  // accepte le risque qu'un code désactivé depuis ne crédite plus.
  if (!code || !code.est_parrainage) return;

  const fullName = data.client_nom || '';
  const [prenom, ...rest] = fullName.split(' ');
  await traiterUsageSiParrainage({
    codePromoId: code.id,
    filleulPrenom: prenom || '',
    filleulNom: rest.join(' ') || '',
    filleulEmail: data.client_email || '',
  });

  await supabaseAdmin
    .from('commandes')
    .update({ merci_credite_at: new Date().toISOString() })
    .eq('id', id);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const badId = badRequestIfNotUuid(params.id);
    if (badId) return badId;

    const { id } = params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    let nouveauStatut: string | null = null;
    if (typeof body.statut === 'string') {
      if (!STATUTS_AUTORISES.includes(body.statut as (typeof STATUTS_AUTORISES)[number])) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      update.statut = body.statut;
      nouveauStatut = body.statut;
    }

    if ('prix_final' in body) {
      const v = body.prix_final;
      if (v === null || v === '') {
        update.prix_final = null;
      } else {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 99999.99) {
          return NextResponse.json({ error: 'Prix final invalide' }, { status: 400 });
        }
        update.prix_final = Math.round(n * 100) / 100;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('commandes')
      .update(update)
      .eq('id', id)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    // Best-effort : crédit MERCI au parrain à la livraison effective.
    if (nouveauStatut === 'retirée') {
      tenterCreditMerciSiLivree(id).catch((err) =>
        console.error('[orders PATCH] tenterCreditMerciSiLivree:', err),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API order update:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
