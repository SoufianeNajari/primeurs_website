'use client'

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex-grow flex items-center justify-center py-12 px-4 bg-neutral-50 min-h-screen">
      <div className="max-w-md w-full bg-white border border-neutral-200 p-10 md:p-12 text-center">
        
        <div className="mx-auto flex justify-center mb-8">
          <WifiOff size={48} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-3xl font-serif text-neutral-800 mb-4 tracking-tight">Vous êtes hors ligne</h1>
        
        <p className="text-neutral-600 mb-10 text-lg leading-relaxed">
          Reconnectez-vous à Internet pour découvrir notre catalogue et passer commande.
        </p>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-green-primary text-white py-4 font-serif text-lg hover:bg-green-dark transition-colors border border-green-primary"
        >
          Réessayer
        </button>

      </div>
    </main>
  );
}
