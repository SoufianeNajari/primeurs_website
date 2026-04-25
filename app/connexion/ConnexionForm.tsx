'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'request' | 'request-sent';

export default function ConnexionForm({ fromPath }: { fromPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [telephone, setTelephone] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(fromPath);
        router.refresh();
        return;
      }
      setError(data.error || 'Erreur');
      if (data.canRequest) setMode('request');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/client/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone, prenom, nom, email, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setMode('request-sent');
        return;
      }
      setError(data.error || 'Erreur');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'request-sent') {
    return (
      <div className="bg-white border border-neutral-200 p-8 text-center space-y-4">
        <h2 className="text-xl font-serif text-green-primary">Demande envoyée</h2>
        <p className="text-sm text-neutral-600">
          Merci ! Nous avons bien reçu votre demande. Vous recevrez un appel ou un message
          dès que votre accès aura été activé.
        </p>
      </div>
    );
  }

  if (mode === 'request') {
    return (
      <form onSubmit={handleRequest} className="bg-white border border-neutral-200 p-8 space-y-5">
        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 p-3">
          Ce numéro n&apos;est pas encore autorisé. Laissez-nous vos coordonnées, nous vous
          rappellerons rapidement pour activer votre accès.
        </div>

        {error && (
          <div className="text-red-text text-sm bg-red-soft p-3 border border-red-text/20">
            {error}
          </div>
        )}

        <Field label="Téléphone" required>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06 12 34 56 78"
            required
            className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" required>
            <input
              type="text"
              autoComplete="given-name"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
            />
          </Field>
          <Field label="Nom" required>
            <input
              type="text"
              autoComplete="family-name"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
            />
          </Field>
        </div>

        <Field label="Email (facultatif)">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
          />
        </Field>

        <Field label="Message (facultatif)">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none"
          />
        </Field>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className="flex-1 py-3 border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-primary text-white py-3 font-serif hover:bg-green-dark disabled:opacity-50"
          >
            {loading ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="bg-white border border-neutral-200 p-8 space-y-5">
      {error && (
        <div className="text-red-text text-sm bg-red-soft p-3 border border-red-text/20">
          {error}
        </div>
      )}

      <Field label="Numéro de téléphone" required>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="06 12 34 56 78"
          required
          className="w-full px-4 py-3 border border-neutral-300 focus:ring-1 focus:ring-green-primary focus:border-green-primary outline-none text-lg"
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-primary text-white py-4 font-serif text-lg hover:bg-green-dark transition-colors disabled:opacity-50"
      >
        {loading ? 'Vérification…' : 'Accéder à la boutique'}
      </button>

      <p className="text-xs text-neutral-500 text-center">
        Pas encore de compte ?{' '}
        <button
          type="button"
          onClick={() => setMode('request')}
          className="underline hover:text-green-primary"
        >
          Demander un accès
        </button>
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest font-medium text-neutral-500 mb-1.5">
        {label}
        {required && <span className="text-red-text"> *</span>}
      </span>
      {children}
    </label>
  );
}
