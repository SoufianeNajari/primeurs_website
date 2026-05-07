import { supabaseAdmin } from './supabase';

export type ArrivageRungis = {
  id: string;
  photo_url: string;
  produit_1: string | null;
  produit_2: string | null;
  produit_3: string | null;
  actif: boolean;
  created_at: string;
};

// Lit l'arrivage actif le plus récent (singleton de fait — un seul actif).
// Renvoie null si aucun arrivage publié, pour que la home cache la section.
export async function getCurrentArrivage(): Promise<ArrivageRungis | null> {
  const { data, error } = await supabaseAdmin
    .from('arrivages_rungis')
    .select('*')
    .eq('actif', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as ArrivageRungis;
}
