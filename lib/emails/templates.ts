// Templates HTML des emails transactionnels. Déportés ici pour rester éditables
// sans toucher la route API.

export type LigneCommande = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
};

function formatPrixLigne(line: LigneCommande): string {
  if (line.prix == null) return '';
  return ` — <span style="color:#666;">${Number(line.prix).toFixed(2)}&nbsp;€ ${escapeHtml(line.libelle)}</span>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function ligneHtml(l: LigneCommande): string {
  const prixPart = formatPrixLigne(l);
  const suffixOption = prixPart ? '' : ` — <span style="color:#666;">${escapeHtml(l.libelle)}</span>`;
  return `<li><strong>${escapeHtml(l.nom)}</strong> <em style="color:#666;">(${escapeHtml(l.categorie)})</em> — Quantité : ${l.quantite}${prixPart}${suffixOption}</li>`;
}

function totalEstime(lignes: LigneCommande[]): number | null {
  let total = 0;
  let hasPrix = false;
  for (const l of lignes) {
    if (l.prix != null) {
      total += Number(l.prix) * l.quantite;
      hasPrix = true;
    }
  }
  return hasPrix ? total : null;
}

export function emailShop(args: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  jourRetrait: string;
  creneau?: string | null;
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
}): string {
  const { prenom, nom, email, telephone, jourRetrait, creneau, message, lignes, orderId } = args;
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const total = totalEstime(lignes);

  return `
    <h2>Nouvelle commande reçue</h2>
    <p><strong>Date :</strong> ${date}</p>
    <p><strong>Client :</strong> ${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(telephone)}</p>
    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
    <hr />
    <h3>Retrait</h3>
    <p><strong>Jour :</strong> <span style="font-size:1.2em; color:#2C5530;">${escapeHtml(jourRetrait)}</span>${creneau ? ` &middot; <strong>${escapeHtml(creneau)}</strong>` : ''}</p>
    ${message ? `<p><strong>Commentaire :</strong> <em>&ldquo;${escapeHtml(message)}&rdquo;</em></p>` : ''}
    <hr />
    <h3>Produits commandés</h3>
    <ul>${lignes.map(ligneHtml).join('')}</ul>
    ${total != null ? `<p style="margin-top:16px;"><strong>Total estimé :</strong> ${total.toFixed(2)}&nbsp;€ <em style="color:#666;">(pesée finale en boutique)</em></p>` : ''}
    <p><small>ID commande : ${escapeHtml(orderId)}</small></p>
  `;
}

export function emailClient(args: {
  prenom: string;
  jourRetrait: string;
  creneau?: string | null;
  lignes: LigneCommande[];
}): string {
  const { prenom, jourRetrait, creneau, lignes } = args;
  const total = totalEstime(lignes);

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="font-size: 24px; color: #333;">Bonjour ${escapeHtml(prenom)},</h2>
      <p style="font-family: sans-serif; line-height: 1.6;">Nous vous remercions de votre confiance ! Votre commande a bien été enregistrée.</p>

      <div style="background-color: #FAF9F7; padding: 20px; border: 1px solid #E5E5E5; margin: 30px 0; text-align: center;">
        <h3 style="margin-top: 0; color: #2C5530; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Votre retrait est prévu</h3>
        <p style="font-size: 24px; font-weight: bold; margin: 0;">${escapeHtml(jourRetrait)}</p>
        ${creneau ? `<p style="font-size: 18px; margin: 8px 0 0; color: #2C5530;">Créneau : ${escapeHtml(creneau)}</p>` : ''}
      </div>

      <h3 style="font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Récapitulatif de vos produits</h3>
      <ul style="font-family: sans-serif; line-height: 1.6;">${lignes.map(ligneHtml).join('')}</ul>

      ${total != null ? `<p style="font-family: sans-serif; font-size: 15px;"><strong>Sous-total estimé : ${total.toFixed(2)}&nbsp;€</strong> <em style="color:#666;">— la pesée finale sera effectuée en boutique.</em></p>` : ''}

      <p style="color: #9B3A3A; font-style: italic; font-family: sans-serif; text-align: center; margin-top: 30px;">Rappel : le règlement s&apos;effectue directement en boutique lors de votre venue.</p>

      <hr style="margin: 40px 0; border: none; border-top: 1px solid #E5E5E5;" />

      <div style="text-align: center; font-family: sans-serif; font-size: 14px; color: #666;">
        <p style="margin: 0; font-family: Georgia, serif; font-size: 18px; color: #333;"><strong>Pontault Primeurs</strong></p>
        <p style="margin: 5px 0;">12 rue du Marché, 75000 Paris</p>
        <p style="margin: 5px 0;">01 23 45 67 89</p>
      </div>
    </div>
  `;
}
