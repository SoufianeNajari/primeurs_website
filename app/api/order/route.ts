import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabase';
import { emailShop, emailClient, type LigneCommande } from '@/lib/emails/templates';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/client-auth';
import { isCommandesBloquees } from '@/lib/parametres';
import { getFourchetteBornes } from '@/lib/fourchette';
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
      message?: string;
    };

    if (!client || !client.prenom || !client.nom || !client.email || !client.telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

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
        client_id: clientId,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement de la commande." }, { status: 500 });
    }

    const orderId = orderData.id;

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
        fourchetteMaxPct: fourchetteBornes.max,
      }),
      emailClient({
        ...livraisonInfos,
        prenom: client.prenom,
        lignes: lignesNormalisees,
        fourchetteBornes,
      }),
    ]);
    await Promise.all([
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

    return NextResponse.json({ success: true, commande_id: orderId });
  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
