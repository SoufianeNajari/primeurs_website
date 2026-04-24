import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, FileText, CheckCircle2, Clock } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import type { Article } from '@/lib/article';
import { formatArticleDate } from '@/lib/article';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  const articles = (data || []) as Article[];
  const now = Date.now();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-neutral-800">Articles</h1>
          <p className="text-sm text-neutral-500">
            Recettes et conseils — {articles.length} article{articles.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 bg-green-primary text-white px-4 py-2 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark"
        >
          <Plus size={14} /> Nouvel article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-10 text-center text-neutral-500">
          <FileText size={28} className="mx-auto mb-3 text-neutral-400" />
          Aucun article pour l&apos;instant.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
          {articles.map((a) => {
            const published =
              a.published_at && new Date(a.published_at).getTime() <= now;
            const scheduled =
              a.published_at && new Date(a.published_at).getTime() > now;
            return (
              <Link
                key={a.id}
                href={`/admin/articles/${a.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="relative w-14 h-14 bg-neutral-100 shrink-0 overflow-hidden">
                  {a.image_url ? (
                    <Image src={a.image_url} alt="" fill sizes="56px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-neutral-800 truncate">{a.titre}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    /{a.slug}
                    {a.published_at ? ` · ${formatArticleDate(a.published_at)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {published && (
                    <span className="inline-flex items-center gap-1 border border-green-300 bg-green-50 text-green-800 px-2 py-0.5">
                      <CheckCircle2 size={12} /> Publié
                    </span>
                  )}
                  {scheduled && (
                    <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 text-amber-800 px-2 py-0.5">
                      <Clock size={12} /> Programmé
                    </span>
                  )}
                  {!a.published_at && (
                    <span className="border border-neutral-300 bg-neutral-50 text-neutral-600 px-2 py-0.5">
                      Brouillon
                    </span>
                  )}
                  <Pencil size={14} className="text-neutral-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
