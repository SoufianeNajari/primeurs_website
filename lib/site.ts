// Garde-fou : la marque a été pivotée de "Pontault Primeurs" vers "Primeur
// Chez Vous" en mai 2026. Le domaine `pontaultprimeurs.fr` est mort. Si une
// variable d'env Vercel persistait encore (oubli de purge), on log un warning
// au boot — invisible pour l'utilisateur final mais visible dans les logs
// build/runtime, et on retombe sur la cascade Vercel.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    if (/pontaultprimeurs/i.test(explicit)) {
      console.warn(
        '[lib/site] NEXT_PUBLIC_SITE_URL contient "pontaultprimeurs" — ignorée. ' +
        'Vide cette variable dans Vercel Project Settings ou pointe-la sur le domaine custom.',
      );
    } else {
      return explicit;
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const SITE = {
  name: 'Primeur Chez Vous',
  fullName: 'Primeur Chez Vous · by Pontault Primeurs',
  shortName: 'Primeur Chez Vous',
  description:
    'Livraison à domicile de fruits, légumes et fromages frais, sélectionnés chaque matin au marché de Rungis. Mardi et samedi, paiement à la réception.',
  // Boutique partenaire (Pontault Primeurs) — sert de référence historique pour les avis Google.
  // Cf. option A validée 2026-05-06 : on capitalise sur les avis sans réintroduire le co-branding partout.
  partenaire: {
    name: 'Pontault Primeurs',
    anneeFondation: 1992,
    description: 'Primeur de proximité fondé en 1992 à Pontault-Combault.',
  },
  // URL canonique du site. Cascade :
  //  1. NEXT_PUBLIC_SITE_URL — à configurer manuellement quand on aura un domaine custom
  //  2. VERCEL_PROJECT_PRODUCTION_URL — URL stable du déploiement prod (auto-injectée)
  //  3. VERCEL_URL — URL du déploiement courant (preview/prod, change à chaque build)
  //  4. localhost:3000 — dev local
  url: resolveSiteUrl(),
  locale: 'fr_FR',
  telephone: '+33160296298',
  telephoneDisplay: '01 60 29 62 98',
  // Email de contact public. Vide tant qu'aucune adresse dédiée n'est créée :
  //  les composants qui l'utilisent (Footer, mentions légales, confidentialité,
  //  zones-livrées, JSON-LD localbusiness) gèrent le cas vide en affichant
  //  '[À DÉFINIR]' au lieu d'un mailto: cassé.
  email: '',
  address: {
    street: '44 Avenue Charles Rouxel',
    postalCode: '77340',
    city: 'Pontault-Combault',
    region: 'Île-de-France',
    country: 'FR',
  },
  // Coordonnées exactes de la boutique (Nominatim sur "44 Avenue Charles Rouxel, 77340 Pontault-Combault").
  geo: {
    latitude: 48.7951134,
    longitude: 2.6043155,
  },
  horaires: [
    { day: 'Tuesday', open: '08:00', close: '19:30' },
    { day: 'Wednesday', open: '08:00', close: '19:30' },
    { day: 'Thursday', open: '08:00', close: '19:30' },
    { day: 'Friday', open: '08:00', close: '19:30' },
    { day: 'Saturday', open: '08:00', close: '19:00' },
    { day: 'Sunday', open: '08:00', close: '13:00' },
  ],
  social: {
    instagram: '',
    facebook: '',
  },
};

// Persona livreur — incarne la marque Primeur Chez Vous sur la home et la page /qui-livre.
// Placeholder photo et bio à remplacer par les vraies infos quand fournies par l'utilisateur.
// Photo : Unsplash libre (https://unsplash.com/license). Auteur : Christopher Campbell.
export const LIVREUR = {
  prenom: 'Karim',
  nomComplet: '',
  bio:
    "Bonjour, moi c'est Karim. Chaque mardi et samedi, je me lève à 4 h pour sélectionner moi-même, dans les allées de Rungis, les fruits, légumes et fromages affinés que je vous livrerai dans la journée. Une question sur un produit, un fromage à commander, un créneau à décaler ? Vous m'appelez direct. C'est ça, ma promesse.",
  photoUrl:
    'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&w=800&q=80',
  photoAlt: 'Portrait du livreur Primeur Chez Vous',
};

export const DEFAULT_OG_IMAGE = `${SITE.url}/images/hero.jpg`;

export function absoluteUrl(path: string): string {
  if (!path) return SITE.url;
  if (path.startsWith('http')) return path;
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Origin de la requête courante — préféré à SITE.url dans les routes
// serveur, pour que les liens (cancel, admin) pointent sur le déploiement
// servant la requête (preview Vercel, prod, localhost).
export function currentOriginFromRequest(headers: Headers | { get(name: string): string | null }): string {
  const host = headers.get('host') ?? 'localhost:3000';
  const proto = headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
