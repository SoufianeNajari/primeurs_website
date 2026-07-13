'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { splitClientNom } from '@/lib/order';

type OrderInfo = {
  client_nom: string;
  date_livraison: string | null;
  creneau_livraison: string | null;
  cancelled_at: string | null;
  statut: string;
};

function formatDateLong(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function CancelClient({
  tokenOk,
  orderId,
  exp,
  sig,
  order,
  cancellationOpen,
  cutoffHeure,
  telephone,
  telephoneDisplay,
  whatsapp,
  whatsappDisplay,
}: {
  tokenOk: boolean;
  orderId: string;
  exp: number;
  sig: string;
  order: OrderInfo | null;
  cancellationOpen: boolean;
  cutoffHeure: number;
  telephone: string;
  telephoneDisplay: string;
  whatsapp: string;
  whatsappDisplay: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(order?.cancelled_at != null);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, exp, sig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'annulation.');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[#FAF9F7] min-h-screen py-16 px-4">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-green-primary transition-colors mb-8"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Retour à l&apos;accueil
        </Link>

        <div className="bg-white border border-neutral-200 p-8 md:p-10">
          {!tokenOk ? (
            <div className="text-center">
              <AlertTriangle className="mx-auto text-red-text mb-4" size={36} strokeWidth={1.5} />
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Lien invalide ou expiré</h1>
              <p className="text-neutral-600 leading-relaxed">
                Ce lien d&apos;annulation n&apos;est plus valable. Pour annuler votre commande, contactez-nous directement par téléphone.
              </p>
            </div>
          ) : !order ? (
            <div className="text-center">
              <AlertTriangle className="mx-auto text-red-text mb-4" size={36} strokeWidth={1.5} />
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Commande introuvable</h1>
              <p className="text-neutral-600">Le lien semble valide mais la commande n&apos;a pas été trouvée.</p>
            </div>
          ) : done || order.cancelled_at ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-green-primary mb-4" size={36} strokeWidth={1.5} />
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Livraison annulée</h1>
              <p className="text-neutral-600 leading-relaxed">
                Votre livraison du <strong>{formatDateLong(order.date_livraison) ?? '—'}</strong> a été annulée. Aucun débit ne sera effectué.
              </p>
              <p className="text-sm text-neutral-500 mt-4 italic">
                À très bientôt — vous pouvez recommander quand vous voulez sur la boutique.
              </p>
            </div>
          ) : order.statut === 'retirée' ? (
            <div className="text-center">
              <AlertTriangle className="mx-auto text-amber-600 mb-4" size={36} strokeWidth={1.5} />
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Commande déjà livrée</h1>
              <p className="text-neutral-600">Cette commande a déjà été livrée et ne peut plus être annulée en ligne.</p>
            </div>
          ) : !cancellationOpen ? (
            <div className="text-center">
              <AlertTriangle className="mx-auto text-amber-600 mb-4" size={36} strokeWidth={1.5} />
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Annulation en ligne fermée</h1>
              <p className="text-neutral-600 leading-relaxed">
                Le délai d&apos;annulation en ligne (la veille de la livraison à {cutoffHeure}h) est dépassé&nbsp;:
                votre commande est déjà en préparation. Pour un empêchement de dernière minute, contactez-nous
                directement, on fait au mieux ensemble.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={`tel:${telephone}`}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-300 text-neutral-700 px-6 py-3 text-sm font-medium hover:border-green-primary hover:text-green-primary transition-colors"
                >
                  <Phone size={16} strokeWidth={1.5} /> {telephoneDisplay}
                </a>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  className="inline-flex items-center justify-center gap-2 border border-neutral-300 text-neutral-700 px-6 py-3 text-sm font-medium hover:border-green-primary hover:text-green-primary transition-colors"
                >
                  <MessageCircle size={16} strokeWidth={1.5} /> WhatsApp {whatsappDisplay}
                </a>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-serif text-neutral-800 mb-3">Annuler ma livraison ?</h1>
              <p className="text-neutral-600 leading-relaxed mb-6">
                Bonjour <strong>{splitClientNom(order.client_nom).prenom}</strong>, vous êtes sur le point d&apos;annuler votre livraison prévue
                {' '}<strong>{formatDateLong(order.date_livraison) ?? 'prochainement'}</strong>
                {order.creneau_livraison ? <> ({order.creneau_livraison})</> : null}.
              </p>
              <p className="text-sm text-neutral-500 mb-8 italic">
                Aucun débit n&apos;a été effectué — l&apos;annulation est gratuite et immédiate.
              </p>

              {error && (
                <div className="bg-red-soft text-red-text p-4 border border-red-text/20 text-sm font-medium mb-6 flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} strokeWidth={1.5} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={submitting}
                  className="bg-red-text text-white px-6 py-3 text-sm uppercase tracking-widest font-medium hover:bg-red-text/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {submitting ? 'Annulation…' : 'Confirmer l\'annulation'}
                </button>
                <Link
                  href="/"
                  className="border border-neutral-300 text-neutral-700 px-6 py-3 text-sm uppercase tracking-widest font-medium hover:border-neutral-500 transition-colors text-center"
                >
                  Garder ma livraison
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
