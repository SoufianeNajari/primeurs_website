import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL manquant. Définir dans .env.local et sur Vercel.');
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquant. Définir dans .env.local et sur Vercel.');
}

// Client public — safe navigateur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin — service_role, UNIQUEMENT serveur.
// `process.env.SUPABASE_SERVICE_ROLE_KEY` n'existe pas dans le bundle client (pas NEXT_PUBLIC_),
// donc les composants client peuvent importer ce module : `supabaseAdmin` sera un objet inutilisable
// côté browser, mais les routes API / server components qui s'en servent auront la vraie clé.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (typeof window === 'undefined' && !serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant côté serveur. Définir dans .env.local et sur Vercel.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey || 'unused-in-client',
);
