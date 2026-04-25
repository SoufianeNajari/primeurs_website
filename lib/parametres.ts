import { supabaseAdmin } from './supabase';

export const PARAM_COMMANDES_BLOQUEES = 'commandes_bloquees';

export async function getParam<T = unknown>(cle: string, fallback: T): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from('parametres')
    .select('valeur')
    .eq('cle', cle)
    .maybeSingle();
  if (error || !data) return fallback;
  return (data.valeur as T) ?? fallback;
}

export async function setParam(cle: string, valeur: unknown): Promise<void> {
  const { error } = await supabaseAdmin
    .from('parametres')
    .upsert({ cle, valeur }, { onConflict: 'cle' });
  if (error) throw new Error(`setParam(${cle}) a échoué : ${error.message}`);
}

export async function isCommandesBloquees(): Promise<boolean> {
  const v = await getParam<boolean>(PARAM_COMMANDES_BLOQUEES, false);
  return v === true;
}
