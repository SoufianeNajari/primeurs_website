import { supabaseAdmin } from '@/lib/supabase';
import type { CodePromo } from '@/lib/codes-promos';
import CodesPromosManager from './CodesPromosManager';

export const dynamic = 'force-dynamic';

export default async function AdminCodesPromosPage() {
  const { data, error } = await supabaseAdmin
    .from('codes_promos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-soft text-red-text p-4 border border-red-text/20">
          Erreur de chargement : {error.message}
        </div>
      </div>
    );
  }

  const codes = (data ?? []) as CodePromo[];
  return <CodesPromosManager initialCodes={codes} />;
}
