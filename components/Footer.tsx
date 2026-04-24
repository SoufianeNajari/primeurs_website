import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="bg-neutral-800 text-neutral-400 pt-16 pb-8 mt-auto border-t border-neutral-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-neutral-700">
          <div>
            <h2 className="text-2xl font-serif text-white mb-3 tracking-wide uppercase">
              {SITE.name}
            </h2>
            <p className="text-sm leading-relaxed">
              {SITE.address.street}
              <br />
              {SITE.address.postalCode} {SITE.address.city}
            </p>
            <p className="text-sm mt-3">
              <a
                href={`tel:${SITE.telephone}`}
                className="hover:text-white transition-colors"
              >
                {SITE.telephoneDisplay}
              </a>
            </p>
          </div>

          <div>
            <h3 className="text-white text-xs uppercase tracking-widest font-medium mb-4">
              Boutique
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/boutique" className="hover:text-white transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/order" className="hover:text-white transition-colors">
                  Passer commande
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Recettes &amp; conseils
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs uppercase tracking-widest font-medium mb-4">
              Informations
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/mentions-legales" className="hover:text-white transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/cgv" className="hover:text-white transition-colors">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-white transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} {SITE.name}. Tous droits réservés.</p>
          <p className="italic">L&apos;art de la sélection.</p>
        </div>
      </div>
    </footer>
  );
}
