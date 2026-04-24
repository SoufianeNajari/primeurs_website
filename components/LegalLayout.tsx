import { ReactNode } from 'react';

type Props = {
  title: string;
  lastUpdate: string;
  children: ReactNode;
};

export default function LegalLayout({ title, lastUpdate, children }: Props) {
  return (
    <main className="flex-grow bg-neutral-50 py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">
        <header className="mb-12 border-b border-neutral-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-sm text-neutral-600">
            Dernière mise à jour&nbsp;: {lastUpdate}
          </p>
        </header>
        <article className="prose-legal text-neutral-700 leading-relaxed space-y-8">
          {children}
        </article>
      </div>
    </main>
  );
}
