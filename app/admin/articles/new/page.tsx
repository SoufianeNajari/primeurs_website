import ArticleForm from '@/components/ArticleForm';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage() {
  const { data } = await supabaseAdmin
    .from('produits')
    .select('id, slug, nom, options, disponible, masque_boutique')
    .eq('disponible', true)
    .not('slug', 'is', null)
    .order('nom');

  return <ArticleForm mode={{ kind: 'create' }} produits={data || []} />;
}
