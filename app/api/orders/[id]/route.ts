import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';
import { badRequestIfNotUuid } from '@/lib/uuid';
import { loadActiveCode } from '@/lib/codes-promos';
import { traiterUsageSiParrainage } from '@/lib/parrainage';

// Vocabulaire de statuts réel de l'app et de la base — doit rester aligné sur
// la contrainte CHECK `commandes_statut_check` (migration 001) et sur
// lib/orderStatus.ts. NE PAS y mettre en_attente/confirmée/préparée : ces
// valeurs sont rejetées par la base et cassaient la transition « → Prête ».
const STATUTS_AUTORISES = ['reçue', 'prête', 'retirée', 'annulée'] as const;

// Tente de créditer un code MERCI au parrain quand la commande passe en
// statut « retirée » (= livrée).
//
// Idempotence ATOMIQUE : on « réserve » la commande via un UPDATE conditionnel
// (merci_credite_at IS NULL) — un seul appel concurrent peut gagner cette
// course, ce qui empêche tout double-crédit même si deux PATCH « retirée »
// arrivent simultanément (ou sur double-clic admin). Si le crédit échoue
// ensuite, on relâche le verrou pour permettre une nouvelle tentative.
async function tenterCreditMerciSiLivree(id: string) {
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from('commandes')
    .update({ merci_credite_at: new Date().toISOString() })
    .eq('id', id)
    .is('merci_credite_at', null)
    .select('id, client_nom, client_email, code_promo')
    .maybeSingle();
  // Pas de ligne réservée → déjà crédité (ou commande introuvable).
  if (claimErr || !claimed) return;
  // Pas de code promo sur la commande → rien à créditer (verrou posé = traité).
  if (!claimed.code_promo) return;

  try {
    const code = await loadActiveCode(claimed.code_promo);
    // loadActiveCode rejette les codes inactifs/épuisés mais on a juste
    // besoin de retrouver l'id + savoir si c'est un code parrainage. On
    // accepte le risque qu'un code désactivé depuis ne crédite plus.
    if (!code || !code.est_parrainage) return;

    const fullName = claimed.client_nom || '';
    const [prenom, ...rest] = fullName.split(' ');
    await traiterUsageSiParrainage({
      codePromoId: code.id,
      filleulPrenom: prenom || '',
      filleulNom: rest.join(' ') || '',
      filleulEmail: claimed.client_email || '',
    });
  } catch (err) {
    // Échec dur du crédit : on relâche le verrou pour qu'un nouveau passage en
    // « retirée » puisse re-tenter (sans risque de double-crédit, le verrou
    // était posé pendant la tentative).
    await supabaseAdmin
      .from('commandes')
      .update({ merci_credite_at: null })
      .eq('id', id);
    throw err;
  }
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
