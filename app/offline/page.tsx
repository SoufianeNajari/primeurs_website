'use client'

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex-grow flex items-center justify-center py-12 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 text-center">
        
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <WifiOff size={40} className="text-gray-500" />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Vous êtes hors ligne</h1>
        
        <p className="text-gray-600 mb-8 text-lg">
          Reconnectez-vous à Internet pour découvrir notre catalogue et passer commande.
        </p>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-[#1D9E75] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#15805e] transition-all active:scale-[0.98] shadow-md"
        >
          Réessayer
        </button>

      </div>
    </main>
  );
}
