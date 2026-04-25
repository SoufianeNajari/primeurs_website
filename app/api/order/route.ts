import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabase';
import { emailShop, emailClient, type LigneCommande } from '@/lib/emails/templates';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getClientSession } from '@/lib/client-auth';
import { isCommandesBloquees } from '@/lib/parametres';
import type { ProduitOption } from '@/lib/produit';

type PanierItem = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
};

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
    const { client, panier, jourRetrait, creneau, message } = body as {
      client: { prenom: string; nom: string; email: string; telephone: string };
      panier: PanierItem[];
      jourRetrait: string;
      creneau?: string | null;
      message?: string;
    };

    if (!client || !client.prenom || !client.nom || !client.email || !client.telephone || !jourRetrait) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!panier || !Array.isArray(panier) || panier.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
    }

    // Re-vérif disponibilité + lecture fraîche des prix (ne jamais faire confiance au client)
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
      return {
        produitId: item.produitId,
        optionId: item.optionId,
        nom: item.nom,
        categorie: item.categorie,
        libelle: option?.libelle ?? item.libelle,
        prix: option?.prix ?? null,
        quantite: item.quantite,
      };
    });

    if (nomsIndisponibles.length > 0) {
      return NextResponse.json(
        { error: `Certains produits de votre panier ne sont plus disponibles : ${nomsIndisponibles.join(', ')}. Veuillez les retirer de votre panier.` },
        { status: 400 },
      );
    }

    // Récupère l'id du client whitelisté depuis la session (le middleware
    // garantit qu'on est bien connecté quand on arrive ici)
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
        jour_retrait: jourRetrait,
        creneau_retrait: creneau || null,
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
    const [shopHtml, clientHtml] = await Promise.all([
      emailShop({
        prenom: client.prenom,
        nom: client.nom,
        email: client.email,
        telephone: client.telephone,
        jourRetrait,
        creneau,
        message,
        lignes: lignesNormalisees,
        orderId,
      }),
      emailClient({
        prenom: client.prenom,
        jourRetrait,
        creneau,
        lignes: lignesNormalisees,
      }),
    ]);
    await Promise.all([
      sendEmail({
        to: shopEmailAddr,
        subject: `Nouvelle commande — ${client.prenom} ${client.nom} — ${jourRetrait}${creneau ? ` ${creneau}` : ''}`,
        html: shopHtml,
      }),
      sendEmail({
        to: client.email,
        subject: `Votre commande est confirmée — Pontault Primeurs`,
        html: clientHtml,
      }),
    ]);

    return NextResponse.json({ success: true, commande_id: orderId });
  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
