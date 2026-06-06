import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { LIVREUR, SITE } from '@/lib/site';

// Bloc home présentant le livreur (visage humain de la marque).
// Une version condensée du contenu de /qui-livre, avec CTA vers la page complète.
export default function LivreurSection() {
  const whatsappHref = `https://wa.me/${SITE.whatsapp}`;

  return (
    <section className="py-16 md:py-20 bg-[#FAF9F7] border-t border-neutral-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="relative w-full aspect-[4/5] max-w-md mx-auto md:mx-0 overflow-hidden bg-neutral-100">
            <Image
              src={LIVREUR.photoUrl}
              alt={LIVREUR.photoAlt}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
              priority={false}
            />
          </div>

          <div>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-green-primary font-medium mb-4">
              Notre service
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-neutral-800 mb-5">
              {LIVREUR.prenom}, votre primeur de quartier
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6 text-[15px] md:text-base">
              {LIVREUR.bio}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/qui-livre"
                className="inline-flex items-center justify-center gap-2 bg-green-primary text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-dark transition-colors"
              >
                En savoir plus <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-green-primary text-green-primary px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-green-primary hover:text-white transition-colors"
              >
                <MessageCircle size={16} strokeWidth={1.5} /> WhatsApp 7j/7
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
