import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabase';
import { emailShop, emailClient, type LigneCommande } from '@/lib/emails/templates';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/client-auth';
import { isCommandesBloquees } from '@/lib/parametres';
import { getFourchetteBornes } from '@/lib/fourchette';
import { validateCodePromo, tryConsumeCodeUsage } from '@/lib/codes-promos';
import { isValidEmail } from '@/lib/email';
import { genererCodeParrainSiNouveau, traiterUsageSiParrainage, getCodeParrainPourClient, PARRAINAGE_CONFIG } from '@/lib/parrainage';
import {
  VILLES_AUTORISEES,
  CRENEAUX_LIVRAISON,
  getFraisLivraisonCents,
  getMinCommandeCents,
  getCutoffVeilleHeure,
  nextDateForCreneau,
} from '@/lib/livraison';
import type { ProduitOption } from '@/lib/produit';

type PanierItem = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
  commentaire?: string | null;
};

const COMMENTAIRE_MAX = 80;

function sanitizeCommentaireServer(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, COMMENTAIRE_MAX);
  return trimmed === '' ? undefined : trimmed;
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    if (await isCommandesBloquees()) {
      return NextResponse.json(
        { error: 'Les commandes en ligne sont temporairement indisponibles.' },
        { status: 503 },
      );
    }

    // Rate limit : 5 commandes / 10 min / IP
    const ip = getClientIp();
    const rl = rateLimit('order', ip, 5, 10 * 60 * 1000);
    if (!rl.success) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Trop de commandes. Merci de réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const body = await request.json();
    const {
      client,
      panier,
      adresse: adresseRaw,
      complementAdresse: complementRaw,
      ville: villeRaw,
      codePostal: codePostalRaw,
      creneauKey: creneauKeyRaw,
      dateLivraison: dateLivraisonRaw,
      codePromo: codePromoRaw,
      message,
    } = body as {
      client: { prenom: string; nom: string; email: string; telephone: string };
      panier: PanierItem[];
      adresse?: string;
      complementAdresse?: string;
      ville?: string;
      codePostal?: string;
      creneauKey?: string;
      dateLivraison?: string;
      codePromo?: string;
      message?: string;
    };

    if (!client || !client.prenom || !client.nom || !client.email || !client.telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }
    const prenomClean = sanitizeText(client.prenom, 80);
    const nomClean = sanitizeText(client.nom, 80);
    const telephoneClean = sanitizeText(client.telephone, 32);
    const emailClean = typeof client.email === 'string' ? client.email.trim() : '';
    if (!prenomClean || !nomClean || !telephoneClean) {
      return NextResponse.json({ error: 'Prénom, nom et téléphone requis.' }, { status: 400 });
    }
    if (!isValidEmail(emailClean)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    }
    client.prenom = prenomClean;
    client.nom = nomClean;
    client.email = emailClean;
    client.telephone = telephoneClean;

    const adresse = sanitizeText(adresseRaw, 200);
    const complementAdresse = sanitizeText(complementRaw, 200);
    const ville = sanitizeText(villeRaw, 100);

    if (!adresse) {
      return NextResponse.json({ error: 'Adresse de livraison requise.' }, { status: 400 });
    }
    const villeAutorisee = VILLES_AUTORISEES.find((v) => v.nom === ville);
    if (!villeAutorisee) {
      return NextResponse.json({ error: 'Ville non desservie par la livraison.' }, { status: 400 });
    }
    // On ignore le codePostal du client : on le fixe depuis la whitelist (source de vérité).
    void codePostalRaw;
    const codePostal = villeAutorisee.codePostal;

    const creneau = CRENEAUX_LIVRAISON.find((c) => c.key === creneauKeyRaw);
    if (!creneau) {
      return NextResponse.json({ error: 'Créneau de livraison invalide.' }, { status: 400 });
    }
    if (!dateLivraisonRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateLivraisonRaw)) {
      return NextResponse.json({ error: 'Date de livraison invalide.' }, { status: 400 });
    }
    // On recalcule la date côté serveur (source de vérité) et on vérifie qu'elle
    // correspond à ce que le client a vu — sinon on prend la prochaine date valide.
    const cutoffHeure = await getCutoffVeilleHeure();
    const dateAttendue = nextDateForCreneau(creneau, cutoffHeure);
    const dateAttendueIso = `${dateAttendue.getFullYear()}-${String(dateAttendue.getMonth() + 1).padStart(2, '0')}-${String(dateAttendue.getDate()).padStart(2, '0')}`;
    if (dateAttendueIso !== dateLivraisonRaw) {
      return NextResponse.json(
        { error: 'Le créneau choisi n\'est plus disponible (cutoff dépassé). Recharge la page.' },
        { status: 400 },
      );
    }

    if (!panier || !Array.isArray(panier) || panier.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
    }

    // Re-vérif disponibilité + lecture fraîche des prix
    const produitIds = panier.map((item) => item.produitId);
    const { data: produitsDb, error: produitsError } = await supabaseAdmin
      .from('produits')
      .select('id, nom, disponible, options')
      .in('id', produitIds);

    if (produitsError) {
      console.error('Erreur lors de la vérification des produits:', produitsError);
      return NextResponse.json({ error: 'Erreur interne lors de la vérification de la disponibilité.' }, { status: 500 });
    }

    type ProduitRow = { id: string; nom: string; disponible: boolean; options: ProduitOption[] | null };
    const produitsDbMap = new Map((produitsDb as ProduitRow[] | null)?.map((p) => [p.id, p]) || []);
    const nomsIndisponibles: string[] = [];

    const lignesNormalisees: LigneCommande[] = panier.map((item) => {
      const db = produitsDbMap.get(item.produitId);
      const option = db?.options?.find((o) => o.id === item.optionId);
      if (!db || !db.disponible || !option) {
        nomsIndisponibles.push(item.nom);
      }
      const commentaire = sanitizeCommentaireServer(item.commentaire);
      const ligne: LigneCommande = {
        produitId: item.produitId,
        optionId: item.optionId,
        nom: item.nom,
        categorie: item.categorie,
        libelle: option?.libelle ?? item.libelle,
        prix: option?.prix ?? null,
        quantite: item.quantite,
      };
      if (commentaire) ligne.commentaire = commentaire;
      return ligne;
    });

    if (nomsIndisponibles.length > 0) {
      return NextResponse.json(
        { error: `Certains produits de votre panier ne sont plus disponibles : ${nomsIndisponibles.join(', ')}. Veuillez les retirer de votre panier.` },
        { status: 400 },
      );
    }

    // Vérification minimum commande (best-effort : on ignore les produits à prix incertain)
    const minCents = await getMinCommandeCents();
    const totalCertainCents = lignesNormalisees.reduce((sum, l) => {
      if (l.prix == null) return sum;
      return sum + Math.round(l.prix * 100) * l.quantite;
    }, 0);
    const tousIncertains = lignesNormalisees.every((l) => l.prix == null);
    if (!tousIncertains && totalCertainCents < minCents) {
      return NextResponse.json(
        { error: `Minimum de commande : ${(minCents / 100).toFixed(2).replace('.', ',')} €.` },
        { status: 400 },
      );
    }

    const fraisCents = await getFraisLivraisonCents();

    // Validation code promo + consommation atomique. `validateCodePromo` lit
    // les règles ; `tryConsumeCodeUsage` fait le UPDATE conditionnel (RPC
    // migration 027) pour fermer la race condition sur usage_max=1.
    // Best-effort : si la consommation échoue (épuisé entre validate et insert),
    // on ignore plutôt que refuser la commande — le client le saura par alert
    // côté UI (data.codePromoApplique=null).
    let codePromoApplique: string | null = null;
    let reductionCents = 0;
    let codePromoId: string | null = null;
    if (typeof codePromoRaw === 'string' && codePromoRaw.trim() && !tousIncertains) {
      const validation = await validateCodePromo(codePromoRaw, totalCertainCents, client.email);
      if (validation.ok) {
        const consumed = await tryConsumeCodeUsage(validation.code.id);
        if (consumed) {
          codePromoApplique = validation.code.code;
          reductionCents = validation.reductionCents;
          codePromoId = validation.code.id;
        }
      }
    }

    let clientId: string | null = null;
    try {
      const session = await getClientSession();
      clientId = session.clientId ?? null;
    } catch {}

    const { data: orderData, error: dbError } = await supabaseAdmin
      .from('commandes')
      .insert({
        client_nom: `${client.prenom} ${client.nom}`,
        client_email: client.email,
        client_telephone: client.telephone,
        lignes: lignesNormalisees,
        message: message || '',
        statut: 'reçue',
        adresse,
        complement_adresse: complementAdresse || null,
        ville,
        code_postal: codePostal,
        creneau_livraison: creneau.label,
        date_livraison: dateLivraisonRaw,
        frais_livraison_cents: fraisCents,
        code_promo: codePromoApplique,
        reduction_cents: reductionCents,
        client_id: clientId,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement de la commande." }, { status: 500 });
    }

    const orderId = orderData.id;

    // Note : l'usage du code promo a déjà été consommé atomiquement avant
    // l'insert (tryConsumeCodeUsage ci-dessus). Reste à traiter le parrainage
    // si applicable (best-effort, async).
    if (codePromoId) {
      traiterUsageSiParrainage({
        codePromoId,
        filleulPrenom: client.prenom,
        filleulNom: client.nom,
        filleulEmail: client.email,
      }).catch((err) => console.error('[order] traiterUsageSiParrainage:', err));
    }

    // Génère (idempotent) le code de parrainage du client pour l'inclure
    // dans son email de confirmation. Best-effort : si la génération échoue,
    // l'email part sans le bloc parrainage plutôt que de bloquer la commande.
    const codeParrainage = await genererCodeParrainSiNouveau(client.email)
      .catch(() => null)
      ?? await getCodeParrainPourClient(client.email).catch(() => null);

    const shopEmailAddr = process.env.SHOP_EMAIL || 'magasin@primeur-test.com';
    const fourchetteBornes = await getFourchetteBornes();
    const livraisonInfos = {
      adresse,
      complementAdresse: complementAdresse || null,
      ville,
      codePostal,
      creneauLabel: creneau.label,
      dateLivraison: dateLivraisonRaw,
      fraisLivraisonCents: fraisCents,
      codePromo: codePromoApplique,
      reductionCents,
    };
    const [shopHtml, clientHtml] = await Promise.all([
      emailShop({
        ...livraisonInfos,
        prenom: client.prenom,
        nom: client.nom,
        email: client.email,
        telephone: client.telephone,
        message,
        lignes: lignesNormalisees,
        orderId,
        fourchetteBornes,
      }),
      emailClient({
        ...livraisonInfos,
        prenom: client.prenom,
        lignes: lignesNormalisees,
        fourchetteBornes,
        codeParrainage,
        reductionParrainageCents: PARRAINAGE_CONFIG.reductionFilleulCents,
        panierMinParrainageCents: PARRAINAGE_CONFIG.panierMinCents,
      }),
    ]);

    // Envois non-bloquants : si Resend tombe ou si le domaine n'est pas
    // configuré, la commande reste enregistrée (BDD à jour). Le client reçoit
    // un 200 — la confirmation visuelle suffit côté UX. L'admin voit le badge
    // "email non envoyé" dans /admin/orders et peut relancer manuellement.
    const [shopRes, clientRes] = await Promise.allSettled([
      sendEmail({
        to: shopEmailAddr,
        subject: `Nouvelle livraison — ${client.prenom} ${client.nom} — ${creneau.label} — ${ville}`,
        html: shopHtml,
      }),
      sendEmail({
        to: client.email,
        subject: `Votre livraison est confirmée — Primeur Chez Vous`,
        html: clientHtml,
      }),
    ]);

    const now = new Date().toISOString();
    const shopOk = shopRes.status === 'fulfilled';
    const clientOk = clientRes.status === 'fulfilled';
    const errorMsg = [
      shopRes.status === 'rejected' ? `shop: ${shopRes.reason instanceof Error ? shopRes.reason.message : String(shopRes.reason)}` : null,
      clientRes.status === 'rejected' ? `client: ${clientRes.reason instanceof Error ? clientRes.reason.message : String(clientRes.reason)}` : null,
    ].filter(Boolean).join(' | ') || null;

    if (!shopOk || !clientOk) {
      console.error('[order] envoi email partiellement échoué', { orderId, errorMsg });
    }

    // Tracking BDD — best-effort, l'échec ici ne doit pas masquer la commande.
    await supabaseAdmin
      .from('commandes')
      .update({
        email_shop_sent_at: shopOk ? now : null,
        email_client_sent_at: clientOk ? now : null,
        email_last_error: errorMsg,
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      commande_id: orderId,
      // Reflète l'état réellement enregistré côté serveur (peut différer du
      // panier client si le code promo a expiré, atteint son usage_max, ou
      // si les frais/min ont changé entre validation et submit).
      codePromoApplique,
      reductionCents,
      fraisLivraisonCents: fraisCents,
      // Permet à l'UI client de prévenir si l'email de confirmation n'a pas
      // été envoyé (ex. fallback "vérifiez vos spams" → bouton "renvoyer").
      emailClientSent: clientOk,
    });
  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
