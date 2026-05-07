import { supabaseAdmin } from '@/lib/supabase'
import { SITE } from '@/lib/site'
import { nearestNeighborOrder, buildGoogleMapsUrl } from '@/lib/tournee'
import { geocodeAddress } from '@/lib/geocoding'
import TourneeMap from './TourneeMap'
import Link from 'next/link'
import { MapPin, Phone, ExternalLink, AlertTriangle, Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Commande = {
  id: string
  client_nom: string
  client_telephone: string
  adresse: string
  complement_adresse: string | null
  code_postal: string | null
  ville: string | null
  date_livraison: string | null
  creneau_livraison: string | null
  statut: string
  lat: number | null
  lng: number | null
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLong(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

async function fetchProchaineDateLivraison(): Promise<string | null> {
  const today = todayIso()
  const { data } = await supabaseAdmin
    .from('commandes')
    .select('date_livraison')
    .gte('date_livraison', today)
    .not('adresse', 'is', null)
    .not('statut', 'eq', 'annulée')
    .order('date_livraison', { ascending: true })
    .limit(1)
  return data?.[0]?.date_livraison ?? null
}

export default async function TourneePage({ searchParams }: { searchParams?: { date?: string } }) {
  const requestedDate = searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
    ? searchParams.date
    : null
  const date = requestedDate ?? (await fetchProchaineDateLivraison()) ?? todayIso()

  const { data: commandes, error } = await supabaseAdmin
    .from('commandes')
    .select('id, client_nom, client_telephone, adresse, complement_adresse, code_postal, ville, date_livraison, creneau_livraison, statut, lat, lng')
    .eq('date_livraison', date)
    .not('adresse', 'is', null)
    .neq('statut', 'annulée')
    .order('creneau_livraison', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-soft text-red-text p-4 border border-red-text/20">
          Erreur de chargement : {error.message}
        </div>
      </div>
    )
  }

  // Géocode inline les adresses manquantes (cap à 10 par chargement pour ne
  // pas bloquer trop longtemps — au-delà, l'admin recharge la page).
  const list = (commandes || []) as Commande[]
  let geocodedCount = 0
  const GEOCODE_CAP = 10
  for (const cmd of list) {
    if (cmd.lat != null && cmd.lng != null) continue
    if (geocodedCount >= GEOCODE_CAP) break
    if (!cmd.adresse) continue
    const result = await geocodeAddress(cmd.adresse, cmd.code_postal ?? '', cmd.ville ?? '')
    if (result) {
      cmd.lat = result.lat
      cmd.lng = result.lng
      await supabaseAdmin
        .from('commandes')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', cmd.id)
    }
    geocodedCount++
  }

  // Tri nearest-neighbor par créneau
  const start = { lat: SITE.geo.latitude, lng: SITE.geo.longitude }
  const groups = new Map<string, Commande[]>()
  for (const c of list) {
    const k = c.creneau_livraison || 'Sans créneau'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(c)
  }
  const sortedGroups = Array.from(groups.entries()).map(([creneau, cmds]) => {
    const { ordered, unlocated, totalKm } = nearestNeighborOrder(start, cmds)
    return { creneau, ordered, unlocated, totalKm }
  })

  const totalCommandes = list.length
  const stillMissing = list.filter((c) => c.lat == null || c.lng == null).length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 no-print">
        <h2 className="text-2xl font-serif text-neutral-800 mb-2 inline-flex items-center gap-2">
          <Truck className="text-green-primary" size={24} strokeWidth={1.5} />
          Tournée du {formatDateLong(date)}
        </h2>
        <p className="text-sm text-neutral-500 mb-3">
          {totalCommandes} livraison{totalCommandes > 1 ? 's' : ''} · ordre optimisé depuis la boutique (nearest-neighbor)
        </p>
        <form action="/admin/tournee" method="GET" className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border border-neutral-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="text-[11px] uppercase tracking-widest font-medium px-3 py-1.5 border border-neutral-300 hover:border-green-primary hover:text-green-primary"
          >
            Voir
          </button>
          <Link
            href="/admin/tournee"
            className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-green-primary ml-2"
          >
            Prochaine livraison
          </Link>
        </form>
      </div>

      {totalCommandes === 0 && (
        <div className="text-center text-neutral-500 py-12 font-serif text-lg border border-neutral-200 bg-white">
          Aucune livraison prévue pour cette date.
        </div>
      )}

      {stillMissing > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 mb-4 text-sm flex items-start gap-2 no-print">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {stillMissing} adresse{stillMissing > 1 ? 's' : ''} non géocodée{stillMissing > 1 ? 's' : ''} (Nominatim cap à {GEOCODE_CAP} par chargement).{' '}
            <a href={`/admin/tournee?date=${date}`} className="underline font-medium">Recharger</a> pour continuer.
          </span>
        </div>
      )}

      <div className="space-y-8">
        {sortedGroups.map((g) => {
          const stopsForMap = g.ordered
            .filter((c) => c.lat != null && c.lng != null)
            .map((c) => ({
              id: c.id,
              lat: c.lat as number,
              lng: c.lng as number,
              nom: c.client_nom,
              adresse: c.adresse,
            }))
          const gmapsUrl = buildGoogleMapsUrl(start, stopsForMap)
          return (
            <section key={g.creneau} className="bg-white border border-neutral-200">
              <header className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg text-neutral-800">{g.creneau}</h3>
                  <p className="text-xs text-neutral-500">
                    {g.ordered.length} livraison{g.ordered.length > 1 ? 's' : ''} · {g.totalKm.toFixed(1)} km AR estimés
                  </p>
                </div>
                {gmapsUrl && (
                  <a
                    href={gmapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-green-primary text-white text-xs uppercase tracking-widest font-semibold px-3 py-2 hover:bg-green-dark"
                  >
                    <ExternalLink size={14} />
                    Ouvrir Google Maps
                  </a>
                )}
              </header>

              <ol className="divide-y divide-neutral-100">
                {g.ordered.map((c, idx) => (
                  <li key={c.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 inline-flex items-center justify-center bg-green-primary text-white text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-base text-neutral-800">{c.client_nom}</div>
                      <div className="text-sm text-neutral-700">
                        {c.adresse}
                        {c.complement_adresse && <span className="italic text-neutral-500"> — {c.complement_adresse}</span>}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {c.code_postal} {c.ville}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                        <a href={`tel:${c.client_telephone}`} className="inline-flex items-center gap-1 text-green-primary font-medium">
                          <Phone size={12} /> {c.client_telephone}
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                        >
                          <MapPin size={12} /> Y aller
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
                {g.unlocated.map((c) => (
                  <li key={c.id} className="px-5 py-3 flex items-start gap-3 bg-amber-50">
                    <span className="shrink-0 w-7 h-7 inline-flex items-center justify-center bg-amber-500 text-white text-sm font-bold">
                      ?
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-base text-neutral-800">{c.client_nom}</div>
                      <div className="text-sm text-neutral-700">
                        {c.adresse} · {c.code_postal} {c.ville}
                      </div>
                      <div className="text-xs text-amber-800 italic mt-0.5">
                        Adresse non géocodée — sera tentée au prochain chargement
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {stopsForMap.length > 0 && (
                <TourneeMap start={start} stops={stopsForMap} />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
