// File-local offline queue pour mutations admin (PATCH/POST/PUT/DELETE).
//
// Cas d'usage : papa met à jour un prix ou toggle une dispo en magasin avec
// un réseau capricieux. Si la requête échoue parce que le navigateur est
// offline, on l'enqueue dans localStorage. Au retour du réseau, flush() rejoue
// les opérations dans l'ordre, en dédupliquant par `dedupKey` (la dernière
// valeur écrite gagne).
//
// L'optimistic update reste affiché en attendant la synchro.

export type QueuedOp = {
  id: string;
  dedupKey: string;
  endpoint: string;
  method: 'PATCH' | 'POST' | 'PUT' | 'DELETE';
  body: unknown;
  enqueuedAt: number;
};

const STORAGE_KEY = 'admin_offline_queue_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function read(): QueuedOp[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

function write(ops: QueuedOp[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    /* quota / private mode — on ignore */
  }
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getPending(): QueuedOp[] {
  return read();
}

export function getPendingCount(): number {
  return read().length;
}

function newId(): string {
  if (isBrowser() && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function enqueueOp(input: Omit<QueuedOp, 'id' | 'enqueuedAt'>) {
  const ops = read();
  const filtered = ops.filter((o) => o.dedupKey !== input.dedupKey);
  filtered.push({
    ...input,
    id: newId(),
    enqueuedAt: Date.now(),
  });
  write(filtered);
  notify();
}

export type MutateResult =
  | { ok: true; queued: false; data?: unknown }
  | { ok: true; queued: true }
  | { ok: false; queued: false; status: number; error: string };

function isNetworkError(err: unknown): boolean {
  if (!isBrowser()) return false;
  if (!navigator.onLine) return true;
  return err instanceof TypeError;
}

/**
 * Tente une mutation admin. Si le réseau est coupé ou la requête échoue
 * pour une raison réseau, l'opération est queue + un retry est planifié.
 *
 * - 4xx (auth, validation) → erreur remontée à l'appelant (pas de queue)
 * - 5xx → queue + retry au prochain `flush()`
 * - network error → queue + retry au prochain `flush()`
 */
export async function adminMutate(opts: {
  endpoint: string;
  method: QueuedOp['method'];
  body: unknown;
  dedupKey: string;
}): Promise<MutateResult> {
  if (isBrowser() && !navigator.onLine) {
    enqueueOp(opts);
    return { ok: true, queued: true };
  }

  try {
    const res = await fetch(opts.endpoint, {
      method: opts.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts.body),
    });

    if (res.ok) {
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      return { ok: true, queued: false, data };
    }

    if (res.status >= 500) {
      enqueueOp(opts);
      return { ok: true, queued: true };
    }

    let errMessage = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) errMessage = j.error;
    } catch {
      /* */
    }
    return { ok: false, queued: false, status: res.status, error: errMessage };
  } catch (err) {
    if (isNetworkError(err)) {
      enqueueOp(opts);
      return { ok: true, queued: true };
    }
    throw err;
  }
}

let flushing = false;

export async function flush(): Promise<{ ok: number; failed: number; remaining: number }> {
  if (flushing) return { ok: 0, failed: 0, remaining: read().length };
  flushing = true;
  try {
    const ops = read();
    if (ops.length === 0) return { ok: 0, failed: 0, remaining: 0 };

    const remaining: QueuedOp[] = [];
    let ok = 0;
    let failed = 0;

    for (const op of ops) {
      try {
        const res = await fetch(op.endpoint, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.body),
        });
        if (res.ok) {
          ok += 1;
        } else if (res.status >= 500) {
          remaining.push(op);
        } else {
          // 4xx — drop, l'opération n'est pas récupérable (validation, 401, etc.)
          failed += 1;
        }
      } catch {
        // network error — on garde
        remaining.push(op);
      }
    }

    write(remaining);
    notify();
    return { ok, failed, remaining: remaining.length };
  } finally {
    flushing = false;
  }
}

export function clearQueue() {
  write([]);
  notify();
}
