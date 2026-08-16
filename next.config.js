const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // Panel admin : jamais de cache — sinon les onglets affichent du stale
      // au changement de route (RSC payload `?_rsc=...` inclus).
      urlPattern: ({ url }) => url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
      options: {},
    },
    {
      // Supabase REST : NetworkOnly — prix et dispos doivent être frais.
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkOnly',
      options: {},
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
      }
    }
  ]
});

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').hostname;
  } catch {
    return 'placeholder.supabase.co';
  }
})();

// Content-Security-Policy — servie en Report-Only le temps de vérifier qu'elle
// ne casse rien en conditions réelles (console du navigateur : « would have
// been blocked »). À basculer en `Content-Security-Policy` une fois validée.
//
// Origines réellement utilisées par le navigateur :
//  - Supabase REST + realtime (wss) : CartContext, CartDrawer, WelcomeBackBanner
//  - api-adresse.data.gouv.fr : autocomplétion d'adresse au checkout
//  - unpkg.com + tile.openstreetmap.org : Leaflet sur /admin/tournee (CDN, zéro
//    dépendance npm — cf. TourneeMap)
//  - images : storage Supabase, images.unsplash.com, data: (placeholders)
// Les polices passent par next/font/google, donc self-hébergées au build : pas
// besoin d'autoriser fonts.googleapis.com. Le geocoding (Nominatim) et l'API
// Places tournent côté serveur, ils ne concernent pas cette politique.
//
// 'unsafe-inline' sur script-src : Next injecte ses propres scripts inline
// (hydratation RSC) et les blocs JSON-LD sont inline eux aussi. S'en passer
// demanderait un nonce par requête, donc un middleware sur toutes les routes.
const cspDirectives = [
  "default-src 'self'",
  // va.vercel-scripts.com : @vercel/analytics. En prod le script est servi en
  // same-origin (/_vercel/insights/script.js), mais la lib retombe sur ce host
  // hors déploiement Vercel — et c'est celui qu'elle utilise en dev.
  `script-src 'self' 'unsafe-inline' https://unpkg.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-adresse.data.gouv.fr https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

// Headers de sécurité appliqués à toute réponse. Le plus concret ici est
// Referrer-Policy : l'URL d'annulation SIGNÉE transite en query string de la
// page de confirmation, elle partait donc en en-tête Referer vers tout tiers
// chargé par cette page.
const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Pas de `preload` : l'inscription à la liste HSTS des navigateurs est
  // difficilement réversible, et ça n'apporte rien tant qu'on ne l'a pas
  // explicitement soumise.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
