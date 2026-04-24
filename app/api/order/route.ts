import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabase';
import { emailShop, emailClient, type LigneCommande } from '@/lib/emails/templates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client, panier, jourRetrait, creneau, message } = body as {
      client: { prenom: string; nom: string; email: string; telephone: string };
      panier: LigneCommande[];
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
      .select('id, nom, disponible, prix_kg, unite')
      .in('id', produitIds);

    if (produitsError) {
      console.error('Erreur lors de la vérification des produits:', produitsError);
      return NextResponse.json({ error: 'Erreur interne lors de la vérification de la disponibilité.' }, { status: 500 });
    }

    const produitsDbMap = new Map(produitsDb?.map((p) => [p.id, p]) || []);
    const nomsIndisponibles: string[] = [];

    const lignesNormalisees: LigneCommande[] = panier.map((item) => {
      const db = produitsDbMap.get(item.produitId);
      if (!db || !db.disponible) nomsIndisponibles.push(item.nom);
      return {
        produitId: item.produitId,
        nom: item.nom,
        categorie: item.categorie,
        quantite: item.quantite,
        prix_kg: db?.prix_kg ?? null,
        unite: db?.unite ?? null,
      };
    });

    if (nomsIndisponibles.length > 0) {
      return NextResponse.json(
        { error: `Certains produits de votre panier ne sont plus disponibles : ${nomsIndisponibles.join(', ')}. Veuillez les retirer de votre panier.` },
        { status: 400 },
      );
    }

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
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement de la commande." }, { status: 500 });
    }

    const orderId = orderData.id;

    const shopEmailAddr = process.env.SHOP_EMAIL || 'magasin@primeur-test.com';
    await Promise.all([
      sendEmail({
        to: shopEmailAddr,
        subject: `Nouvelle commande — ${client.prenom} ${client.nom} — ${jourRetrait}${creneau ? ` ${creneau}` : ''}`,
        html: emailShop({
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
      }),
      sendEmail({
        to: client.email,
        subject: `Votre commande est confirmée — Pontault Primeurs`,
        html: emailClient({
          prenom: client.prenom,
          jourRetrait,
          creneau,
          lignes: lignesNormalisees,
        }),
      }),
    ]);

    return NextResponse.json({ success: true, commande_id: orderId });
  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
