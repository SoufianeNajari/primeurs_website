'use client'

import { useEffect, useRef } from 'react'

// Carte Leaflet via CDN — zéro dep npm, juste 2 fichiers chargés une fois.
// Affiche les stops numérotés + le point de départ + une polyline reliant
// dans l'ordre nearest-neighbor (calculé côté serveur, juste rendu ici).

type Stop = { id: string; lat: number; lng: number; nom: string; adresse: string }

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

// Typage minimal de l'API Leaflet utilisée ici. Pas de dep npm ;
// on consomme via CDN dans une page admin uniquement.
type LeafletMap = { remove: () => void; setView: (...a: unknown[]) => unknown; fitBounds: (...a: unknown[]) => unknown }
type LeafletAPI = {
  map: (el: HTMLElement) => LeafletMap
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: unknown) => unknown }
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => { addTo: (m: unknown) => { bindPopup: (h: string) => unknown } }
  divIcon: (opts: Record<string, unknown>) => unknown
  latLngBounds: (pts: [number, number][]) => { extend: (p: [number, number]) => unknown }
  polyline: (path: [number, number][], opts: Record<string, unknown>) => { addTo: (m: unknown) => unknown }
}
declare global { interface Window { L?: LeafletAPI } }

function loadCss(): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      resolve()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = LEAFLET_CSS
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
}

function loadJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Leaflet load error')))
      return
    }
    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Leaflet load error'))
    document.head.appendChild(script)
  })
}

export default function TourneeMap({
  start,
  stops,
}: {
  start: { lat: number; lng: number }
  stops: Stop[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      await loadCss()
      try {
        await loadJs()
      } catch {
        return
      }
      if (cancelled || !containerRef.current || !window.L) return
      const L = window.L

      // Cleanup d'une éventuelle instance précédente (re-render)
      if (mapRef.current) {
        try { (mapRef.current as { remove: () => void }).remove() } catch { /* */ }
        mapRef.current = null
      }

      const map = L.map(containerRef.current)
      map.setView([start.lat, start.lng], 12)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Marker boutique
      L.marker([start.lat, start.lng], { title: 'Boutique' })
        .addTo(map)
        .bindPopup('<strong>Départ — Boutique</strong>')

      const bounds = L.latLngBounds([[start.lat, start.lng]])

      // Markers numérotés (DivIcon avec le n°)
      stops.forEach((s, i) => {
        const icon = L.divIcon({
          className: 'tournee-stop-icon',
          html: `<span style="background:#2C5530;color:#fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);font-family:sans-serif">${i + 1}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })
        L.marker([s.lat, s.lng], { icon, title: s.nom })
          .addTo(map)
          .bindPopup(`<strong>${i + 1}. ${escapeHtml(s.nom)}</strong><br/>${escapeHtml(s.adresse)}`)
        bounds.extend([s.lat, s.lng])
      })

      // Polyline retour-aller
      const path: [number, number][] = [
        [start.lat, start.lng],
        ...stops.map((s) => [s.lat, s.lng] as [number, number]),
        [start.lat, start.lng],
      ]
      L.polyline(path, { color: '#2C5530', weight: 3, opacity: 0.7 }).addTo(map)

      map.fitBounds(bounds, { padding: [40, 40] })
    }
    init()
    return () => {
      cancelled = true
      if (mapRef.current) {
        try { (mapRef.current as { remove: () => void }).remove() } catch { /* */ }
        mapRef.current = null
      }
    }
  }, [start.lat, start.lng, stops])

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] border-t border-neutral-200"
      aria-label="Carte de la tournée"
    />
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
