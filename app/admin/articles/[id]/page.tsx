import { notFound } from 'next/navigation';
import ArticleForm from '@/components/ArticleForm';
import { supabaseAdmin } from '@/lib/supabase';
import type { Article } from '@/lib/article';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const [{ data: article }, { data: produits }, { data: ingredients }] = await Promise.all([
    supabaseAdmin.from('articles').select('*').eq('id', params.id).maybeSingle(),
    supabaseAdmin
      .from('produits')
      .select('id, slug, nom, options, disponible, masque_boutique')
      .not('slug', 'is', null)
      .order('nom'),
    supabaseAdmin
      .from('article_ingredients')
      .select('produit_id, quantite_kg_4pers, ordre')
      .eq('article_id', params.id)
      .order('ordre', { ascending: true }),
  ]);

  if (!article) notFound();

  return (
    <ArticleForm
      mode={{ kind: 'edit', id: params.id }}
      initial={article as Article}
      produits={produits || []}
      initialIngredients={ingredients || []}
    />
  );
}
