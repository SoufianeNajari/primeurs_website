import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client, panier, jourRetrait, message } = body;

    // 1. Validations basiques serveur
    if (!client || !client.prenom || !client.nom || !client.email || !client.telephone || !jourRetrait) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!panier || !Array.isArray(panier) || panier.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
    }

    // 1.5 Vérification de la disponibilité des produits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const produitIds = panier.map((item: any) => item.produitId);
    
    const { data: produitsDb, error: produitsError } = await supabaseAdmin
      .from('produits')
      .select('id, nom, disponible')
      .in('id', produitIds);

    if (produitsError) {
      console.error('Erreur lors de la vérification des produits:', produitsError);
      return NextResponse.json({ error: 'Erreur interne lors de la vérification de la disponibilité.' }, { status: 500 });
    }

    const produitsDbMap = new Map(produitsDb?.map(p => [p.id, p]) || []);
    const nomsIndisponibles = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of panier) {
      const dbProduct = produitsDbMap.get(item.produitId);
      if (!dbProduct || !dbProduct.disponible) {
        nomsIndisponibles.push(item.nom);
      }
    }

    if (nomsIndisponibles.length > 0) {
      return NextResponse.json({ 
        error: `Certains produits de votre panier ne sont plus disponibles : ${nomsIndisponibles.join(', ')}. Veuillez les retirer de votre panier.` 
      }, { status: 400 });
    }

    // 2. Insertion dans Supabase
    const { data: orderData, error: dbError } = await supabaseAdmin
      .from('commandes')
      .insert({
        client_nom: `${client.prenom} ${client.nom}`,
        client_email: client.email,
        client_telephone: client.telephone,
        lignes: panier,
        message: message || '',
        statut: 'reçue'
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Erreur Supabase:', dbError);
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de la commande.' }, { status: 500 });
    }

    const orderId = orderData.id;

    // 3. Préparation des données pour l'email
    const dateCommande = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // Génération de la liste HTML des produits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listeProduitsHtml = panier.map((item: any) => 
      `<li><strong>${item.nom}</strong> (<em>${item.categorie}</em>) - Quantité : ${item.quantite}</li>`
    ).join('');

    // 4. Email pour le Magasin
    const emailMagasinHtml = `
      <h2>Nouvelle commande reçue</h2>
      <p><strong>Date :</strong> ${dateCommande}</p>
      <p><strong>Client :</strong> ${client.prenom} ${client.nom}</p>
      <p><strong>Téléphone :</strong> ${client.telephone}</p>
      <p><strong>Email :</strong> ${client.email}</p>
      <hr />
      <h3>Détails du retrait</h3>
      <p><strong>Jour prévu :</strong> <span style="font-size:1.2em; color:#2C5530;">${jourRetrait}</span></p>
      ${message ? `<p><strong>Commentaire :</strong> <em>"${message}"</em></p>` : ''}
      <hr />
      <h3>Produits commandés</h3>
      <ul>
        ${listeProduitsHtml}
      </ul>
      <p><small>ID Commande interne : ${orderId}</small></p>
    `;

    // 5. Email pour le Client
    const emailClientHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="font-size: 24px; color: #333;">Bonjour ${client.prenom},</h2>
        <p style="font-family: sans-serif; line-height: 1.6;">Nous vous remercions de votre confiance ! Votre commande a bien été enregistrée.</p>
        
        <div style="background-color: #FAF9F7; padding: 20px; border: 1px solid #E5E5E5; margin: 30px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #2C5530; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Votre retrait est prévu le</h3>
          <p style="font-size: 24px; font-weight: bold; margin-bottom: 0;">${jourRetrait}</p>
        </div>

        <h3 style="font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Récapitulatif de vos produits</h3>
        <ul style="font-family: sans-serif; line-height: 1.6;">
          ${listeProduitsHtml}
        </ul>

        <p style="color: #9B3A3A; font-style: italic; font-family: sans-serif; text-align: center; margin-top: 30px;">Rappel : Le règlement s'effectue directement en boutique lors de votre venue.</p>
        
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #E5E5E5;" />
        
        <div style="text-align: center; font-family: sans-serif; font-size: 14px; color: #666;">
          <p style="margin: 0; font-family: Georgia, serif; font-size: 18px; color: #333;"><strong>Pontault Primeurs</strong></p>
          <p style="margin: 5px 0;">12 rue du Marché, 75000 Paris</p>
          <p style="margin: 5px 0;">01 23 45 67 89</p>
        </div>
      </div>
    `;

    // 6. Envoi des emails en parallèle
    const shopEmail = process.env.SHOP_EMAIL || 'magasin@primeur-test.com'; // Fallback pour dev
    
    await Promise.all([
      sendEmail({
        to: shopEmail,
        subject: `Nouvelle commande — ${client.prenom} ${client.nom} — ${jourRetrait}`,
        html: emailMagasinHtml
      }),
      sendEmail({
        to: client.email,
        subject: `Votre commande est confirmée — Pontault Primeurs`,
        html: emailClientHtml
      })
    ]);

    return NextResponse.json({ success: true, commande_id: orderId });

  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
