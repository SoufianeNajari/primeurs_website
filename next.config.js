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
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',
      options: { 
        cacheName: 'supabase-api', 
        expiration: { maxEntries: 50, maxAgeSeconds: 300 } 
      }
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

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
