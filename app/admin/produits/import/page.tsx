'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, RefreshCw, FileDown } from 'lucide-react';
import type { ImportRowResult } from '@/app/api/admin/produits/import/route';

type Summary = { created: number; updated: number; errors: number };

const TEMPLATE_HEADERS = [
  'nom',
  'categorie',
  'slug',
  'description',
  'description_longue',
  'origine',
  'bio',
  'local',
  'variete',
  'qualite',
  'mois_debut',
  'mois_fin',
  'ordre',
  'disponible',
  'image_url',
  'conseils_conservation',
  'options',
];

const TEMPLATE_EXAMPLE = [
  'Pommes Golden,Fruits,,Pommes croquantes et sucrées,,France,false,false,Golden,Extra,9,3,1,true,,,au kg:4.30|à la pièce:0.50',
  'Tomates cerise,Légumes,,,,"France, Île-de-France",false,true,,Catégorie 1,6,9,2,true,,,la barquette:2.50|au kg:8.00',
  'Comté 18 mois,Fromages,,,,"France, Jura",false,false,,,,,3,true,,,au kg:32.00|à la coupe',
];

function buildTemplateCsv(): string {
  return [TEMPLATE_HEADERS.join(','), ...TEMPLATE_EXAMPLE].join('\n');
}

export default function ImportProduitsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError('');
    setResults(null);
    setSummary(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/produits/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'import');
      } else {
        setResults(data.results);
        setSummary(data.summary);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob(['﻿' + buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produits-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link
        href="/admin/produits"
        className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-green-primary mb-4"
      >
        <ArrowLeft size={16} /> Retour aux produits
      </Link>

      <h1 className="text-2xl font-serif text-neutral-800 mb-2">Import CSV produits</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Importez ou mettez à jour plusieurs produits depuis un tableur. Les produits existants
        (basés sur le slug) seront mis à jour ; les nouveaux seront créés.
      </p>

      <div className="bg-white border border-neutral-200 p-6 mb-6">
        <h2 className="text-sm uppercase tracking-widest text-neutral-500 font-medium mb-3">Format attendu</h2>
        <ul className="text-sm text-neutral-700 space-y-1 mb-4 list-disc pl-5">
          <li>Séparateur virgule (<code>,</code>) — UTF-8</li>
          <li>Colonnes obligatoires : <code>nom</code>, <code>categorie</code>, <code>options</code></li>
          <li>
            Format <code>options</code> : <code>libelle:prix</code>, séparées par <code>|</code>.
            Prix optionnel. Ex&nbsp;: <code>au kg:3.50|la botte:1.20</code>
          </li>
          <li>Booléens (<code>bio</code>, <code>local</code>, <code>disponible</code>) : <code>true/false</code> ou <code>oui/non</code></li>
          <li>
            <code>variete</code> (texte affiché sur la carte, ex&nbsp;: « Golden ») et{' '}
            <code>qualite</code> (texte affiché sur la fiche, ex&nbsp;: « Extra ») sont optionnels
          </li>
          <li>Le badge 🇫🇷 s&apos;affiche automatiquement si <code>origine</code> contient « France »</li>
          <li>Mois (1-12) pour saison, ordre = nombre entier (tri)</li>
          <li>
            Si <code>slug</code> vide → généré automatiquement depuis le nom
          </li>
        </ul>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 border border-neutral-300 hover:border-green-primary text-neutral-700 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
        >
          <FileDown size={14} />
          Télécharger un modèle CSV
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-6 mb-6">
        <label className="block text-sm uppercase tracking-widest text-neutral-500 font-medium mb-3">
          Fichier CSV
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-neutral-100 file:text-neutral-700 file:font-medium file:uppercase file:tracking-widest file:text-[11px] hover:file:bg-neutral-200 cursor-pointer"
        />
        {file && (
          <p className="text-xs text-neutral-500 mt-2">
            {file.name} — {(file.size / 1024).toFixed(1)} ko
          </p>
        )}
        {error && (
          <div className="bg-red-soft text-red-text p-3 border border-red-text/20 text-sm mt-4 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={!file || submitting}
          className="mt-4 inline-flex items-center gap-2 bg-green-primary text-white px-5 py-2.5 font-medium uppercase tracking-widest text-[11px] hover:bg-green-dark disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload size={14} />
              Lancer l&apos;import
            </>
          )}
        </button>
      </form>

      {summary && (
        <div className="bg-white border border-neutral-200 p-6">
          <h2 className="text-lg font-serif text-neutral-800 mb-4">Rapport d&apos;import</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border border-green-300 bg-green-50 p-4 text-center">
              <div className="text-2xl font-serif text-green-800">{summary.created}</div>
              <div className="text-[11px] uppercase tracking-widest text-green-700 mt-1">Créés</div>
            </div>
            <div className="border border-blue-300 bg-blue-50 p-4 text-center">
              <div className="text-2xl font-serif text-blue-800">{summary.updated}</div>
              <div className="text-[11px] uppercase tracking-widest text-blue-700 mt-1">Mis à jour</div>
            </div>
            <div className={`border p-4 text-center ${summary.errors > 0 ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-neutral-50'}`}>
              <div className={`text-2xl font-serif ${summary.errors > 0 ? 'text-red-800' : 'text-neutral-400'}`}>
                {summary.errors}
              </div>
              <div className={`text-[11px] uppercase tracking-widest mt-1 ${summary.errors > 0 ? 'text-red-700' : 'text-neutral-500'}`}>
                Erreurs
              </div>
            </div>
          </div>

          {results && results.length > 0 && (
            <div className="border border-neutral-200">
              <div className="grid grid-cols-[60px_1fr_120px] gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-widest text-neutral-500 font-medium">
                <div>Ligne</div>
                <div>Produit</div>
                <div>Statut</div>
              </div>
              <ul className="divide-y divide-neutral-100">
                {results.map((r, i) => (
                  <li key={i} className="grid grid-cols-[60px_1fr_120px] gap-3 px-4 py-2 text-sm items-center">
                    <span className="text-neutral-500">{r.ligne}</span>
                    <span className="text-neutral-800 truncate">
                      {r.nom}
                      {r.message && (
                        <span className={`block text-xs mt-0.5 ${r.status === 'error' ? 'text-red-700' : 'text-blue-700'}`}>{r.message}</span>
                      )}
                    </span>
                    <span>
                      {r.status === 'created' && (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                          <CheckCircle2 size={12} /> Créé
                        </span>
                      )}
                      {r.status === 'updated' && (
                        <span className="inline-flex items-center gap-1 text-blue-700 text-xs">
                          <CheckCircle2 size={12} /> Mis à jour
                        </span>
                      )}
                      {r.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-red-700 text-xs">
                          <AlertCircle size={12} /> Erreur
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
