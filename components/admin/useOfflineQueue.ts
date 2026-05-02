'use client';

import { useEffect, useState } from 'react';
import { getPendingCount, subscribe } from '@/lib/admin/offline-queue';

export function useOfflineQueue() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(getPendingCount());

    const onUpdate = () => setPending(getPendingCount());
    const unsub = subscribe(onUpdate);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return { pending, online };
}
