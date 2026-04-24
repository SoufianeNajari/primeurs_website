import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

// Client public pour le navigateur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin pour le serveur (routes API uniquement)
// L'utilisation de 'placeholder_key' empêche un crash côté client lors de l'import
// du fichier (ex: dans CartContext) car process.env.SUPABASE_SERVICE_ROLE_KEY n'existe pas dans le navigateur.
export const supabaseAdmin = createClient(
  supabaseUrl, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key'
);
