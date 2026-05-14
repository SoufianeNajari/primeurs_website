'use client'

import { useEffect, useState, Suspense } from 'react';
import { useCart, type CartItem } from '@/components/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Truck, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cartHasPoidsIncertain } from '@/lib/produit';

function shortOrderId(id: string): string {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function ConfirmationContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const [creneau, setCreneau] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [hadIncertain, setHadIncertain] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [cancelUrl, setCancelUrl] = useState<string | null>(null);
  const [emailFail, setEmailFail] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('primeur_last_order');
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        if (Array.isArray(items)) setHadIncertain(cartHasPoidsIncertain(items));
      }
    } catch {
      // ignore
    }
    clearCart();
    setCreneau(searchParams.get('creneau'));
    setOrderId(searchParams.get('id'));
    // cancelUrl arrive en plein clair, validation côté serveur via signature HMAC
    const rawCancel = searchParams.get('cancel');
    if (rawCancel && /^https?:\/\//.test(rawCancel)) setCancelUrl(rawCancel);
    setEmailFail(searchParams.get('emailFail') === '1');
    const dateIso = searchParams.get('date');
    if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      const d = new Date(dateIso + 'T00:00:00');
      if (!Number.isNaN(d.getTime())) {
        setDateLabel(
          d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        );
      }
    }
  }, [clearCart, searchParams]);

  return (
    <div className="max-w-lg w-full bg-white border border-neutral-200 p-10 md:p-12 text-center animate-fade-in-up">
      <div className="mx-auto mb-8 flex justify-center">
        <CheckCircle2 size={48} className="text-green-primary" strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl font-serif text-neutral-800 mb-4">Commande validée</h1>

      {orderId && (
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-medium mb-6">
          Référence&nbsp;: <span className="text-neutral-700">{shortOrderId(orderId)}</span>
        </p>
      )}

      <p className="text-neutral-600 mb-10 text-lg leading-relaxed">
        Nous vous remercions de votre confiance.
        {!emailFail && ' Un e-mail récapitulatif vient de vous être envoyé.'}
      </p>

      {emailFail && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 mb-10 flex gap-3 items-start text-left text-sm">
          <AlertTriangle size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Votre commande est bien enregistrée, mais nous n&apos;avons pas pu vous envoyer l&apos;email
            de confirmation. Notez la référence ci-dessus et appelez-nous si besoin — nous vous rappellerons
            avant la préparation.
          </span>
        </div>
      )}

      {creneau && (
        <div className="bg-neutral-50 border border-neutral-200 p-6 mb-10 flex flex-col items-center">
          <Truck size={24} className="text-neutral-400 mb-3" strokeWidth={1.5} />
          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-[0.2em] mb-2">Livraison prévue</span>
          {dateLabel && (
            <span className="text-2xl font-serif text-neutral-800 capitalize">{dateLabel}</span>
          )}
          <span className="text-lg text-green-primary mt-1">{creneau}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-neutral-50 border border-neutral-200 p-4 flex gap-3 items-start text-left text-sm text-neutral-600">
          <Info size={18} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            {hadIncertain
              ? 'Certains produits seront pesés à la préparation. Le prix exact vous sera communiqué à la livraison.'
              : 'Si l’écart de prix dépasse la fourchette annoncée, nous vous contactons avant préparation.'}
          </span>
        </div>
        <p className="text-sm text-neutral-500 italic">
          Le règlement s&apos;effectuera à la livraison (CB ou espèces).
        </p>
        <Link
          href="/"
          className="flex items-center justify-center w-full bg-white text-green-primary border border-green-primary py-4 px-6 font-medium text-sm uppercase tracking-widest hover:bg-green-primary hover:text-white transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
        {cancelUrl && (
          <Link
            href={cancelUrl}
            className="flex items-center justify-center gap-2 w-full text-xs uppercase tracking-widest font-medium text-neutral-400 hover:text-red-text transition-colors"
          >
            <XCircle size={14} strokeWidth={1.5} />
            Annuler ma livraison
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <main className="flex-grow flex items-center justify-center py-16 px-4 bg-neutral-50 min-h-screen">
      <Suspense fallback={<div className="text-center p-10 font-serif text-lg text-neutral-500">Chargement de votre confirmation...</div>}>
        <ConfirmationContent />
      </Suspense>
    </main>
  );
}
