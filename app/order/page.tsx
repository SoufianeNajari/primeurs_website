'use client'

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, cartKey } from '@/components/CartContext';
import CartItemNote from '@/components/CartItemNote';
import { Loader2, ArrowLeft, ShoppingBag, AlertTriangle, Trash2, Info, Truck, MapPin, Tag, Check, X } from 'lucide-react';
import Link from 'next/link';
import {
  VILLES_AUTORISEES,
  formatCreneauDate,
  listCreneauOptions,
  computeFraisLivraisonCents,
  type CreneauOption,
} from '@/lib/livraison';
import { useLivraisonConfig } from '@/lib/use-livraison-config';
import FreeShippingBar from '@/components/FreeShippingBar';
import { formatPrixMontant, cartHasPoidsIncertain, isPoidsIncertain } from '@/lib/produit';
import { calcFourchette, formatFourchette } from '@/lib/fourchette';
import { useFourchetteBornes } from '@/lib/use-fourchette';
import { formatEuros } from '@/lib/format';
import { CUSTOMER_MEMORY_KEY, type CustomerMemory } from '@/components/WelcomeBackBanner';
import UpsellSuggestions from '@/components/UpsellSuggestions';

const DRAFT_KEY = 'primeur_order_draft';
// Brouillon expiré au-delà de 7 jours.
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Draft = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  complementAdresse: string;
  ville: string;        // nom de la ville (clé fonctionnelle)
  creneauKey: string;   // ex 'mardi-17-19'
  message: string;
  codePromo: string;
};

const EMPTY_DRAFT: Draft = {
  prenom: '', nom: '', email: '', telephone: '',
  adresse: '', complementAdresse: '', ville: '',
  creneauKey: '', message: '', codePromo: '',
};

type PromoState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'valid'; code: string; libelle: string; reductionCents: number }
  | { status: 'invalid'; raison: string };


export default function OrderPage() {
  const { cart, totalItems, totalEstime, removeFromCart, isLoaded, refreshPrices } = useCart();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [promo, setPromo] = useState<PromoState>({ status: 'idle' });
  const [showPromoInput, setShowPromoInput] = useState(false);
  const bornes = useFourchetteBornes();
  const config = useLivraisonConfig();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  // Créneaux disponibles (avec leur prochaine date), recalculés quand le cutoff change.
  const creneauOptions: CreneauOption[] = useMemo(
    () => listCreneauOptions(config.cutoffHeure),
    [config.cutoffHeure],
  );

  const villeSelectionnee = useMemo(
    () => VILLES_AUTORISEES.find((v) => v.nom === draft.ville) || null,
    [draft.ville],
  );

  // Refresh prix au mount : si l'admin a modifié des prix depuis le dernier
  // chargement du panier (ou si le SW a servi une réponse Supabase périmée),
  // on resynchronise avant que le client confirme la commande.
  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  useEffect(() => {
    setIsMounted(true);
    let restored: Partial<Draft> = {};
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt?: number; data?: Partial<Draft> };
        if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
          localStorage.removeItem(DRAFT_KEY);
        } else {
          restored = parsed.data ?? {};
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }

    // Fallback identité depuis la mémoire client (90j)
    const needsIdentity = !restored.prenom && !restored.nom && !restored.email && !restored.telephone;
    if (needsIdentity) {
      try {
        const rawMem = localStorage.getItem(CUSTOMER_MEMORY_KEY);
        if (rawMem) {
          const mem = JSON.parse(rawMem) as CustomerMemory;
          if (mem?.client && mem.savedAt && Date.now() - mem.savedAt < 90 * 24 * 60 * 60 * 1000) {
            restored = {
              ...restored,
              prenom: mem.client.prenom || '',
              nom: mem.client.nom || '',
              email: mem.client.email || '',
              telephone: mem.client.telephone || '',
            };
          }
        }
      } catch {
        // ignore
      }
    }

    setDraft({ ...EMPTY_DRAFT, ...restored });
  }, []);

  // Si le créneau sauvegardé n'est plus disponible (cutoff dépassé), on reset.
  useEffect(() => {
    if (!isMounted || !draft.creneauKey) return;
    const ok = creneauOptions.some((o) => o.creneau.key === draft.creneauKey);
    if (!ok) updateDraft({ creneauKey: '' });
  }, [isMounted, creneauOptions, draft.creneauKey]);

  // Sauvegarde debounced du brouillon
  useEffect(() => {
    if (!isMounted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const hasContent = Object.values(draft).some((v) => v && v.trim() !== '');
      if (!hasContent) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data: draft }));
      } catch {
        // quota exceeded, ignore
      }
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, isMounted]);

  useEffect(() => {
    if (isMounted && isLoaded && totalItems === 0) {
      router.push('/');
    }
  }, [isMounted, isLoaded, totalItems, router]);

  // Validation debounced du code promo (350ms après la dernière frappe).
  useEffect(() => {
    if (!isMounted) return;
    if (promoTimer.current) clearTimeout(promoTimer.current);
    const code = draft.codePromo.trim();
    if (!code) {
      setPromo({ status: 'idle' });
      return;
    }
    const items = Object.values(cart);
    const incertain = cartHasPoidsIncertain(items);
    if (incertain || totalEstime == null) {
      setPromo({ status: 'invalid', raison: 'Code promo indisponible avec des produits pesés.' });
      return;
    }
    const panierCents = Math.round(totalEstime * 100);
    if (panierCents <= 0) {
      setPromo({ status: 'idle' });
      return;
    }
    setPromo({ status: 'checking' });
    promoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/codes-promos/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, panierCents, email: draft.email || null }),
        });
        const data = await res.json();
        if (data?.ok) {
          setPromo({
            status: 'valid',
            code: data.code,
            libelle: data.libelle,
            reductionCents: data.reductionCents,
          });
        } else {
          setPromo({ status: 'invalid', raison: data?.raison || 'Code invalide.' });
        }
      } catch {
        setPromo({ status: 'invalid', raison: 'Impossible de vérifier le code.' });
      }
    }, 350);
    return () => {
      if (promoTimer.current) clearTimeout(promoTimer.current);
    };
  }, [draft.codePromo, draft.email, totalEstime, cart, isMounted]);

  if (!isMounted || !isLoaded || totalItems === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-primary" size={32} />
      </div>
    );
  }

  const cartItems = Object.values(cart);
  const hasIncertain = cartHasPoidsIncertain(cartItems);
  const fourchette = totalEstime != null && !hasIncertain ? calcFourchette(totalEstime, bornes) : null;
  const sousTotalCents = !hasIncertain && totalEstime != null ? Math.round(totalEstime * 100) : null;
  const fraisCents = computeFraisLivraisonCents(
    sousTotalCents ?? 0,
    config.fraisCents,
    config.seuilGratuitCents,
  );
  const minCents = config.minCents;
  const minEuros = (minCents / 100).toFixed(2).replace('.', ',');
  // Min commande : on bloque uniquement si on connaît le total (pas d'incertain) et qu'il est en-dessous.
  const sousMin = !hasIncertain && totalEstime != null && totalEstime * 100 < minCents;

  const reductionCents = promo.status === 'valid' ? promo.reductionCents : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const client = {
      prenom: draft.prenom.trim(),
      nom: draft.nom.trim(),
      telephone: draft.telephone.trim(),
      email: draft.email.trim(),
    };

    const adresse = draft.adresse.trim();
    const complementAdresse = draft.complementAdresse.trim();
    const ville = draft.ville.trim();
    const creneauKey = draft.creneauKey;
    const message = draft.message;

    if (!adresse) {
      setError('Indique ton adresse de livraison.');
      return;
    }
    if (!ville || !VILLES_AUTORISEES.find((v) => v.nom === ville)) {
      setError('Choisis une ville desservie.');
      return;
    }
    const opt = creneauOptions.find((o) => o.creneau.key === creneauKey);
    if (!opt) {
      setError('Choisis un créneau de livraison.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      setError("Format d'e-mail invalide.");
      return;
    }
    const phoneDigitCount = client.telephone.replace(/\D/g, '').length;
    if (phoneDigitCount < 10) {
      setError("Le numéro de téléphone doit contenir au moins 10 chiffres.");
      return;
    }
    if (sousMin) {
      setError(`Minimum de commande : ${minEuros} €.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          panier: cartItems,
          adresse,
          complementAdresse,
          ville,
          codePostal: villeSelectionnee?.codePostal ?? '',
          creneauKey,
          dateLivraison: opt.iso,
          codePromo: promo.status === 'valid' ? promo.code : undefined,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la commande');

      // Si le client attendait un code promo mais le serveur ne l'a finalement
      // pas appliqué (expiré, usage_max atteint entre validation et submit),
      // on prévient avant redirect — l'email final donnera le montant exact.
      const promoExpected = promo.status === 'valid' ? promo.code : null;
      if (promoExpected && !data.codePromoApplique) {
        alert(
          `Votre commande a bien été enregistrée, mais le code promo "${promoExpected}" n'a finalement pas pu être appliqué (probablement épuisé entre-temps). Le récapitulatif par email vous indique le montant final.`,
        );
      }

      localStorage.setItem('primeur_last_order', JSON.stringify(cartItems));
      try {
        const memory: CustomerMemory = {
          savedAt: Date.now(),
          client: {
            prenom: client.prenom,
            nom: client.nom,
            email: client.email,
            telephone: client.telephone,
          },
          lignes: cartItems,
          jour: opt.creneau.label,
          creneau: opt.creneau.label,
        };
        localStorage.setItem(CUSTOMER_MEMORY_KEY, JSON.stringify(memory));
        sessionStorage.removeItem('primeur_welcome_dismissed');
      } catch {
        // quota exceeded, on continue
      }
      localStorage.removeItem(DRAFT_KEY);

      const params = new URLSearchParams({
        creneau: opt.creneau.label,
        date: opt.iso,
      });
      if (data?.commande_id) params.set('id', data.commande_id);
      if (data?.cancelUrl) params.set('cancel', data.cancelUrl);
      if (data?.emailClientSent === false) params.set('emailFail', '1');
      router.push(`/order/confirmation?${params.toString()}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Une erreur est survenue, veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow py-8 px-4 bg-neutral-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/boutique" className="p-2 bg-white rounded-sm border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-600">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="text-3xl font-serif text-neutral-800">Finaliser la commande</h1>
        </div>

        <div className="bg-white border border-neutral-200">
          <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center gap-3">
            <ShoppingBag className="text-green-primary" size={20} strokeWidth={1.5} />
            <h2 className="text-lg font-serif text-neutral-800">Récapitulatif ({totalItems} articles)</h2>
          </div>
          <ul className="divide-y divide-neutral-100 px-6">
            {cartItems.map((item) => {
              const key = cartKey(item.produitId, item.optionId);
              const prix = formatPrixMontant(item.prix ?? null);
              return (
                <li key={key} className="py-5 flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <span className="font-serif text-lg text-neutral-800 block truncate">{item.nom}</span>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{item.categorie}</span>
                      <span className="block text-sm text-green-dark font-medium mt-1">
                        {item.libelle}
                        {isPoidsIncertain(item) ? (
                          <span className="text-neutral-500 font-normal italic"> · Prix à la pesée</span>
                        ) : prix ? (
                          <span className="text-neutral-500 font-normal"> · {prix}</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="bg-neutral-50 px-4 py-2 border border-neutral-200 font-medium text-neutral-700 text-sm">
                        x {item.quantite}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(key)}
                        className="text-neutral-400 hover:text-red-text transition-colors p-2 -mr-2"
                        aria-label={`Retirer ${item.nom} du panier`}
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <CartItemNote itemKey={key} />
                </li>
              );
            })}
          </ul>
          {sousTotalCents != null && (
            <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50">
              <FreeShippingBar
                sousTotalCents={sousTotalCents}
                minCents={config.minCents}
                fraisCents={config.fraisCents}
                seuilGratuitCents={config.seuilGratuitCents}
              />
            </div>
          )}
          {hasIncertain ? (
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex gap-3 items-start text-sm text-neutral-600">
              <Info size={18} strokeWidth={1.5} className="text-green-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Votre panier contient des produits dont le poids sera pesé à la préparation.
                Le prix final vous sera communiqué à la livraison. Paiement à la réception.
              </span>
            </div>
          ) : (
            <>
              {totalEstime != null && (
                <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Sous-total estimé</span>
                  <span className="text-base font-serif text-neutral-700">{totalEstime.toFixed(2).replace('.', ',')}&nbsp;€</span>
                </div>
              )}
              {fraisCents > 0 && (
                <div className="px-6 py-3 bg-neutral-50 flex items-baseline justify-between border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Frais de livraison</span>
                  <span className="text-base font-serif text-neutral-700">{formatEuros(fraisCents)}</span>
                </div>
              )}
              {fraisCents === 0 && (
                <div className="px-6 py-3 bg-green-soft/30 flex items-baseline justify-between border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-widest text-green-dark font-medium">Frais de livraison</span>
                  <span className="text-base font-serif text-green-dark italic">Offerts</span>
                </div>
              )}
              {reductionCents > 0 && promo.status === 'valid' && (
                <div className="px-6 py-3 bg-green-soft/30 flex items-baseline justify-between border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-widest text-green-dark font-medium">
                    Code {promo.code}
                  </span>
                  <span className="text-base font-serif text-green-dark">
                    −{formatEuros(reductionCents)}
                  </span>
                </div>
              )}
              {fourchette && (
                <div className="px-6 py-3 bg-neutral-50 flex items-baseline justify-between border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Total final</span>
                  <span className="text-xl font-serif text-neutral-800">
                    {formatFourchette({
                      min: fourchette.min - reductionCents / 100,
                      max: fourchette.max - reductionCents / 100,
                    })}
                  </span>
                </div>
              )}
              {fourchette && (
                <p className="px-6 pb-4 pt-2 text-xs text-neutral-500 italic bg-neutral-50">
                  Prix indicatif, ajusté à la pesée (cours du jour, poids réel). Si l&apos;écart dépasse la fourchette, nous vous contactons avant préparation. Paiement à la réception.
                </p>
              )}
              {sousMin && (
                <div className="px-6 py-4 border-t border-neutral-200 bg-red-soft/40 flex gap-3 items-start text-sm text-red-text font-medium">
                  <AlertTriangle size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
                  <span>Minimum de commande&nbsp;: {minEuros}&nbsp;€. Ajoute quelques produits pour valider la livraison.</span>
                </div>
              )}
            </>
          )}
        </div>

        <UpsellSuggestions />

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-6 md:p-8 space-y-8">
          {error && (
            <div className="bg-red-soft text-red-text p-4 border border-red-text/20 text-sm font-medium flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <section className="space-y-6">
            <h2 className="text-xl font-serif text-neutral-800 border-b border-neutral-200 pb-4">
              Vos coordonnées
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="prenom" className="block text-xs uppercase tracking-wider text-neutral-600">Prénom *</label>
                <input
                  type="text" id="prenom" name="prenom" required
                  autoComplete="given-name"
                  value={draft.prenom}
                  onChange={(e) => updateDraft({ prenom: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="nom" className="block text-xs uppercase tracking-wider text-neutral-600">Nom *</label>
                <input
                  type="text" id="nom" name="nom" required
                  autoComplete="family-name"
                  value={draft.nom}
                  onChange={(e) => updateDraft({ nom: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs uppercase tracking-wider text-neutral-600">E-mail *</label>
                <input
                  type="email" id="email" name="email" required
                  autoComplete="email"
                  value={draft.email}
                  onChange={(e) => updateDraft({ email: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="telephone" className="block text-xs uppercase tracking-wider text-neutral-600">Téléphone *</label>
                <input
                  type="tel" id="telephone" name="telephone" required
                  autoComplete="tel"
                  value={draft.telephone}
                  onChange={(e) => updateDraft({ telephone: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-serif text-neutral-800 border-b border-neutral-200 pb-4 flex items-center gap-3">
              <MapPin size={20} className="text-green-primary" strokeWidth={1.5} />
              Adresse de livraison
            </h2>
            <div className="space-y-2">
              <label htmlFor="adresse" className="block text-xs uppercase tracking-wider text-neutral-600">Adresse *</label>
              <input
                type="text" id="adresse" name="adresse" required
                autoComplete="street-address"
                placeholder="N° et nom de rue"
                value={draft.adresse}
                onChange={(e) => updateDraft({ adresse: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="complementAdresse" className="block text-xs uppercase tracking-wider text-neutral-600">Complément (optionnel)</label>
              <input
                type="text" id="complementAdresse" name="complementAdresse"
                autoComplete="address-line2"
                placeholder="Bâtiment, étage, code, interphone…"
                value={draft.complementAdresse}
                onChange={(e) => updateDraft({ complementAdresse: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="ville" className="block text-xs uppercase tracking-wider text-neutral-600">Ville *</label>
                <select
                  id="ville" name="ville" required
                  value={draft.ville}
                  onChange={(e) => updateDraft({ ville: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors bg-white font-medium text-neutral-700"
                >
                  <option value="">Sélectionne ta ville…</option>
                  {VILLES_AUTORISEES.map((v) => (
                    <option key={v.nom} value={v.nom}>{v.nom}</option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 italic">Nous livrons 8 communes autour de Pontault-Combault.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="codePostal" className="block text-xs uppercase tracking-wider text-neutral-600">Code postal</label>
                <input
                  type="text" id="codePostal" name="codePostal" readOnly
                  value={villeSelectionnee?.codePostal ?? ''}
                  placeholder="—"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-sm bg-neutral-50 text-neutral-600 cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-serif text-neutral-800 border-b border-neutral-200 pb-4 flex items-center gap-3">
              <Truck size={20} className="text-green-primary" strokeWidth={1.5} />
              Créneau de livraison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creneauOptions.length === 0 && (
                <p className="text-sm text-neutral-500 italic">
                  Aucun créneau disponible avant le cutoff. Réessaie plus tard.
                </p>
              )}
              {creneauOptions.map((opt) => {
                const checked = draft.creneauKey === opt.creneau.key;
                return (
                  <label
                    key={opt.creneau.key}
                    className={`relative flex flex-col gap-1 border rounded-sm p-4 cursor-pointer transition-colors ${
                      checked
                        ? 'border-green-primary bg-green-soft/40 ring-1 ring-green-primary'
                        : 'border-neutral-300 bg-white hover:border-green-primary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="creneauKey"
                      value={opt.creneau.key}
                      checked={checked}
                      onChange={() => updateDraft({ creneauKey: opt.creneau.key })}
                      className="sr-only"
                    />
                    <span className="text-sm font-serif text-neutral-800">{opt.creneau.label}</span>
                    <span className="text-xs text-green-dark font-medium capitalize">{formatCreneauDate(opt.date)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500 italic">
              Commandez au plus tard la veille à {config.cutoffHeure}h. Au-delà, le créneau suivant est proposé.
            </p>
          </section>

          <section className="space-y-2">
            {!showPromoInput && promo.status !== 'valid' ? (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                disabled={hasIncertain}
                className="inline-flex items-center gap-2 text-sm text-green-primary hover:text-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag size={16} strokeWidth={1.5} />
                {hasIncertain ? 'Code promo indisponible avec produits pesés' : "J'ai un code promo"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="codePromo" className="block text-xs uppercase tracking-wider text-neutral-600 inline-flex items-center gap-2">
                    <Tag size={14} strokeWidth={1.5} /> Code promo
                  </label>
                  {promo.status !== 'valid' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPromoInput(false);
                        updateDraft({ codePromo: '' });
                        setPromo({ status: 'idle' });
                      }}
                      className="text-xs text-neutral-400 hover:text-neutral-600"
                    >
                      Annuler
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text" id="codePromo" name="codePromo"
                    autoComplete="off"
                    placeholder="BIENVENUE10"
                    value={draft.codePromo}
                    onChange={(e) => updateDraft({ codePromo: e.target.value.toUpperCase() })}
                    className={`w-full px-4 py-3 pr-10 border rounded-sm focus:ring-1 outline-none transition-colors uppercase tracking-wider font-medium ${
                      promo.status === 'valid'
                        ? 'border-green-primary bg-green-soft/30 focus:ring-green-primary focus:border-green-primary'
                        : promo.status === 'invalid'
                        ? 'border-red-text/50 bg-red-soft/30 focus:ring-red-text focus:border-red-text'
                        : 'border-neutral-300 focus:ring-green-primary focus:border-green-primary'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {promo.status === 'checking' && <Loader2 size={16} className="animate-spin text-neutral-400" />}
                    {promo.status === 'valid' && <Check size={18} className="text-green-primary" strokeWidth={2} />}
                    {promo.status === 'invalid' && <X size={18} className="text-red-text" strokeWidth={2} />}
                  </div>
                </div>
                {promo.status === 'valid' && (
                  <p className="text-xs text-green-dark font-medium">
                    Code accepté : {promo.libelle} (−{formatEuros(promo.reductionCents)} appliqué).
                  </p>
                )}
                {promo.status === 'invalid' && (
                  <p className="text-xs text-red-text">{promo.raison}</p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <label htmlFor="message" className="block text-xs uppercase tracking-wider text-neutral-600">Commentaire (optionnel)</label>
            <textarea
              id="message" name="message" rows={3}
              placeholder="Précisions pour le livreur, allergies, demandes spéciales…"
              value={draft.message}
              onChange={(e) => updateDraft({ message: e.target.value })}
              className="w-full px-4 py-3 border border-neutral-300 rounded-sm focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none transition-colors resize-none"
            ></textarea>
          </section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || sousMin || creneauOptions.length === 0}
              className="w-full bg-green-primary text-white py-4 px-6 font-serif text-lg hover:bg-green-dark transition-colors disabled:bg-neutral-300 disabled:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-green-primary disabled:border-neutral-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} strokeWidth={2} />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer la commande'
              )}
            </button>
            <p className="text-center text-sm text-neutral-500 mt-4 italic">
              Paiement à la livraison (CB ou espèces). Aucun acompte demandé.
            </p>
          </div>
        </form>

      </div>
    </main>
  );
}
