import { notFound } from 'next/navigation';
import ArticleForm from '@/components/ArticleForm';
import { supabaseAdmin } from '@/lib/supabase';
import type { Article } from '@/lib/article';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const [{ data: article }, { data: produits }] = await Promise.all([
    supabaseAdmin.from('articles').select('*').eq('id', params.id).maybeSingle(),
    supabaseAdmin
      .from('produits')
      .select('slug, nom')
      .not('slug', 'is', null)
      .order('nom'),
  ]);

  if (!article) notFound();

  return (
    <ArticleForm
      mode={{ kind: 'edit', id: params.id }}
      initial={article as Article}
      produits={produits || []}
    />
  );
}
