// Échappement HTML pour tout ce qu'on interpole à la main dans du markup :
// emails composés en chaîne (les emails de commande passent par @react-email et
// sont échappés automatiquement, pas ceux-là), pages imprimables, popups Leaflet.
//
// Il en existait trois copies (request-access, printableTicketHtml, TourneeMap)
// et un oubli (la notif d'annulation, qui interpolait le nom et l'email du
// client bruts). Une seule implémentation, importée partout.
//
// `null`/`undefined` deviennent la chaîne vide : ces appelants affichent des
// champs optionnels et écrivaient tous ce garde-fou de leur côté.
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

// JSON destiné à un <script type="application/ld+json"> injecté via
// dangerouslySetInnerHTML. JSON.stringify n'échappe pas « < » : un nom de
// produit ou un titre d'article contenant « </script> » fermerait la balise —
// page cassée, et injection de script sur le principe. Échapper « < » suffit à
// fermer le vecteur, et reste du JSON valide (< est un escape légal).
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
