import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { v4 as uuidv4 } from 'uuid';

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

    // 2. Préparation des données pour l'email
    const orderId = uuidv4();
    const dateCommande = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // Génération de la liste HTML des produits
    const listeProduitsHtml = panier.map(item => 
      `<li><strong>${item.nom}</strong> (<em>${item.categorie}</em>) - Quantité : ${item.quantite}</li>`
    ).join('');

    // 3. Email pour le Magasin
    const emailMagasinHtml = `
      <h2>Nouvelle commande reçue</h2>
      <p><strong>Date :</strong> ${dateCommande}</p>
      <p><strong>Client :</strong> ${client.prenom} ${client.nom}</p>
      <p><strong>Téléphone :</strong> ${client.telephone}</p>
      <p><strong>Email :</strong> ${client.email}</p>
      <hr />
      <h3>Détails du retrait</h3>
      <p><strong>Jour prévu :</strong> <span style="font-size:1.2em; color:#1D9E75;">${jourRetrait}</span></p>
      ${message ? `<p><strong>Commentaire :</strong> <em>"${message}"</em></p>` : ''}
      <hr />
      <h3>Produits commandés</h3>
      <ul>
        ${listeProduitsHtml}
      </ul>
      <p><small>ID Commande interne : ${orderId}</small></p>
    `;

    // 4. Email pour le Client
    const emailClientHtml = `
      <h2>Bonjour ${client.prenom},</h2>
      <p>Merci pour votre commande ! Votre réservation a bien été prise en compte par notre magasin.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Votre retrait</h3>
        <p>Vos produits seront préparés pour le : <strong>${jourRetrait}</strong></p>
      </div>

      <h3>Récapitulatif de vos produits</h3>
      <ul>
        ${listeProduitsHtml}
      </ul>

      <p style="color: #ef4444; font-weight: bold;">Rappel : Le règlement s'effectue directement en magasin lors de votre venue.</p>
      
      <hr style="margin: 30px 0;" />
      
      <h3>Nous trouver</h3>
      <p><strong>Pontault Primeurs</strong></p>
      <p>TODO - 12 rue du Marché, 75000 Paris</p>
      <p>TODO - 01 XX XX XX XX</p>
    `;

    // 5. Envoi des emails en parallèle
    const shopEmail = process.env.SHOP_EMAIL || 'magasin@primeur-test.com'; // Fallback pour dev
    
    await Promise.all([
      sendEmail({
        to: shopEmail,
        subject: `Nouvelle commande — ${client.prenom} ${client.nom} — ${jourRetrait}`,
        html: emailMagasinHtml
      }),
      sendEmail({
        to: client.email,
        subject: `Votre réservation est confirmée — Pontault Primeurs`,
        html: emailClientHtml
      })
    ]);

    return NextResponse.json({ success: true, orderId });

  } catch (error) {
    console.error('Erreur API Order:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la commande.' }, { status: 500 });
  }
}
