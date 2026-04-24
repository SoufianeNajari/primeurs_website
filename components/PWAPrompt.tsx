'use client'

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

export default function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Vérifier si on est déjà en mode PWA (standalone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isStandalone) return;

    // Gérer l'événement natif d'installation (surtout Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Vérifier le nombre de visites
    const visitsStr = localStorage.getItem('primeur_visits');
    const visits = parseInt(visitsStr || '0', 10);
    const hasSeenPrompt = localStorage.getItem('primeur_pwa_prompt_seen');
    
    // Si c'est la première fois de la session qu'on charge
    if (!sessionStorage.getItem('primeur_session_counted')) {
      localStorage.setItem('primeur_visits', (visits + 1).toString());
      sessionStorage.setItem('primeur_session_counted', 'true');
    }
    
    if (!hasSeenPrompt && visits >= 1) { // À la 2ème visite (visits vaut au moins 1 avant incrémentation ou 2 après)
      // Afficher avec un petit délai pour ne pas agresser l'utilisateur
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    triggerHaptic();
    setShowPrompt(false);
    localStorage.setItem('primeur_pwa_prompt_seen', 'true');
  };

  const handleInstall = async () => {
    triggerHaptic();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem('primeur_pwa_prompt_seen', 'true');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback iOS ou si l'événement n'a pas été capturé
      alert("Pour installer l'application sur iOS : appuyez sur le bouton Partager puis 'Sur l'écran d'accueil'. Sur Android : ouvrez le menu de votre navigateur et sélectionnez 'Ajouter à l'écran d'accueil'.");
      setShowPrompt(false);
      localStorage.setItem('primeur_pwa_prompt_seen', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-28 md:w-[350px] z-[70] animate-fade-in-up">
      <div className="bg-white border border-neutral-200 shadow-xl p-4 flex gap-4">
        <div className="flex-grow">
          <h3 className="font-serif text-neutral-800 text-lg leading-tight mb-1">Installer l&apos;application</h3>
          <p className="text-xs text-neutral-500 mb-3">Commandez plus rapidement depuis votre écran d&apos;accueil.</p>
          <div className="flex gap-2">
            <button 
              onClick={handleInstall}
              className="bg-green-primary text-white text-[11px] uppercase tracking-widest px-4 py-2 hover:bg-green-dark transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Installer
            </button>
            <button 
              onClick={handleDismiss}
              className="text-neutral-500 hover:text-neutral-800 text-[11px] uppercase tracking-widest px-3 py-2 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-neutral-300 hover:text-neutral-500 transition-colors self-start -mt-1 -mr-1"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
