export const SITE = {
  name: 'Pontault Primeurs',
  shortName: 'Pontault Primeurs',
  description:
    'Primeur de fruits, légumes et fromages affinés à Pontault-Combault. Sélection de saison, produits locaux et bio. Commande en ligne, retrait en boutique.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://pontaultprimeurs.fr',
  locale: 'fr_FR',
  telephone: '+33160296298',
  telephoneDisplay: '01 60 29 62 98',
  email: 'contact@pontaultprimeurs.fr',
  address: {
    street: '44 Avenue Charles Rouxel',
    postalCode: '77340',
    city: 'Pontault-Combault',
    region: 'Île-de-France',
    country: 'FR',
  },
  // Coordonnées approximatives — à affiner si besoin
  geo: {
    latitude: 48.7993,
    longitude: 2.6087,
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

export const DEFAULT_OG_IMAGE = `${SITE.url}/images/hero.jpg`;

export function absoluteUrl(path: string): string {
  if (!path) return SITE.url;
  if (path.startsWith('http')) return path;
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`;
}
