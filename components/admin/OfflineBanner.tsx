'use client';

import { useEffect, useRef } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { flush } from '@/lib/admin/offline-queue';
import { useOfflineQueue } from './useOfflineQueue';
import { useToast } from './Toast';

export default function OfflineBanner() {
  const { pending, online } = useOfflineQueue();
  const toast = useToast();
  const flushingRef = useRef(false);
  const lastOnlineRef = useRef(online);

  useEffect(() => {
    const justBackOnline = !lastOnlineRef.current && online;
    lastOnlineRef.current = online;

    if (online && pending > 0 && !flushingRef.current) {
      flushingRef.current = true;
      flush()
        .then(({ ok, failed }) => {
          if (justBackOnline || ok > 0 || failed > 0) {
            if (ok > 0) toast.success(`${ok} changement(s) synchronisé(s)`);
            if (failed > 0) toast.error(`${failed} changement(s) abandonné(s)`);
          }
        })
        .finally(() => {
          flushingRef.current = false;
        });
    }
  }, [online, pending, toast]);

  if (online && pending === 0) return null;

  if (!online) {
    return (
      <div className="sticky top-[60px] md:top-[68px] z-40 bg-amber-500 text-white px-4 py-2 text-xs uppercase tracking-widest font-medium flex items-center justify-center gap-2">
        <CloudOff size={14} />
        <span>
          Hors ligne{pending > 0 ? ` — ${pending} en attente` : ''}
        </span>
      </div>
    );
  }

  // online, pending > 0 → en cours de flush
  return (
    <div className="sticky top-[60px] md:top-[68px] z-40 bg-neutral-800 text-white px-4 py-2 text-xs uppercase tracking-widest font-medium flex items-center justify-center gap-2">
      <Loader2 size={14} className="animate-spin" />
      <span>Synchronisation… {pending} restant(s)</span>
    </div>
  );
}
