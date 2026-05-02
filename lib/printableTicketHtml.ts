import { calcFourchette, type FourchetteBornes } from '@/lib/fourchette'

type Ligne = {
  produitId: string
  optionId: string
  nom: string
  categorie: string
  libelle: string
  prix?: number | null
  quantite: number
}

export type TicketOrder = {
  id: string
  client_nom: string
  client_email?: string | null
  client_telephone: string
  lignes: Ligne[]
  message?: string | null
  statut: string
  created_at: string
  date_retrait_souhaite?: string | null
  jour_retrait?: string | null
  creneau?: string | null
  prix_final?: number | null
}

function esc(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shortId(id: string): string {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function formatDateLongue(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function totalEstime(lignes: Ligne[]) {
  let total = 0
  let hasPrix = false
  let hasIncertain = false
  for (const l of lignes) {
    if (l.prix != null && !Number.isNaN(Number(l.prix))) {
      total += Number(l.prix) * l.quantite
      hasPrix = true
    } else {
      hasIncertain = true
    }
  }
  return { total: hasPrix ? total : null, allIncertain: !hasPrix && hasIncertain, hasIncertain }
}

export function renderTicketHtml(
  order: TicketOrder,
  prixActuels: Record<string, number | null>,
  fourchette: FourchetteBornes,
): string {
  const tot = totalEstime(order.lignes)
  const dateRetrait = order.date_retrait_souhaite || order.created_at.slice(0, 10)

  const lignesHtml = order.lignes.map((ligne) => {
    const incertain = ligne.prix == null
    const sousTotal = incertain ? null : Number(ligne.prix) * ligne.quantite
    const prixActuel = prixActuels[`${ligne.produitId}:${ligne.optionId}`]
    const prixDiff = !incertain && prixActuel != null && Math.abs(prixActuel - Number(ligne.prix)) > 0.001
    return `
      <tr style="border-bottom:1px dashed #999">
        <td style="padding:3px 4px">☐</td>
        <td style="padding:3px 4px">
          <div><strong>${esc(ligne.nom)}</strong> <span style="font-style:italic;color:#555">${esc(ligne.libelle)}</span></div>
        </td>
        <td style="padding:3px 4px;text-align:right;font-weight:700">${ligne.quantite}</td>
        <td style="padding:3px 4px;text-align:right">${incertain ? '— peser' : `${Number(ligne.prix).toFixed(2)}€`}</td>
        <td style="padding:3px 4px;text-align:right;color:${prixDiff ? '#c2410c' : '#666'};font-weight:${prixDiff ? 700 : 400}">
          ${prixActuel == null ? '— rem.' : `${prixActuel.toFixed(2)}€`}${prixDiff ? ' ⚠' : ''}
        </td>
        <td style="padding:3px 4px;text-align:right;font-weight:700">${incertain ? '—' : `${sousTotal!.toFixed(2)}€`}</td>
      </tr>`
  }).join('')

  const totalBlock = tot.total != null && !tot.hasIncertain
    ? `<div style="display:flex;justify-content:space-between;border-top:2px solid #000;padding-top:4px;font-size:11pt">
         <span>Total estimé client</span><strong>${tot.total.toFixed(2)}€</strong>
       </div>
       <div style="display:flex;justify-content:space-between;font-size:9pt;color:#c2410c">
         <span>Borne haute (+${Math.round((fourchette.max - 1) * 100)}%) — appeler client si dépassée</span>
         <span>${calcFourchette(tot.total, fourchette).max.toFixed(2)}€</span>
       </div>`
    : tot.hasIncertain && tot.total != null
    ? `<div style="border-top:2px solid #000;padding-top:4px;font-size:10pt">
         <div style="font-weight:700">Pas de total annoncé au client (articles à peser)</div>
         <div style="font-size:9pt;color:#555">Sous-total interne articles avec prix : ${tot.total.toFixed(2)}€</div>
       </div>`
    : tot.allIncertain
    ? `<div style="font-size:10pt;font-style:italic;border-top:1px solid #000;padding-top:4px">Tous les articles à tarifer à la pesée.</div>`
    : ''

  const prixFinalBlock = order.prix_final != null
    ? `<div style="margin-top:6px;border-top:1px solid #000;padding-top:4px;display:flex;justify-content:space-between;font-size:11pt">
         <span>Prix final ticket</span><strong>${Number(order.prix_final).toFixed(2)}€</strong>
       </div>`
    : ''

  const messageBlock = order.message
    ? `<div style="margin-top:8px;border-left:3px solid #000;padding-left:6px;font-size:9.5pt">
         <strong>Message client :</strong> <em>${esc(order.message)}</em>
       </div>`
    : ''

  return `<div style="font-family:system-ui,sans-serif;color:#000;font-size:10pt">
    <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:8px">
      <div>
        <div style="font-size:15pt;font-weight:700">${esc(order.client_nom)}</div>
        <div style="font-size:10pt">${esc(order.client_telephone)}${order.client_email ? ` · ${esc(order.client_email)}` : ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:monospace;font-size:11pt">${shortId(order.id)}</div>
        <div style="font-size:9pt;text-transform:uppercase">${esc(order.statut)}</div>
      </div>
    </div>
    <div style="margin-bottom:6px;font-size:10pt">
      <strong>Retrait :</strong> ${formatDateLongue(dateRetrait)}${order.jour_retrait ? ` · ${esc(order.jour_retrait)}` : ''}${order.creneau ? ` · ${esc(order.creneau)}` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:6px">
      <thead>
        <tr style="border-bottom:1px solid #000">
          <th style="text-align:left;padding:2px 4px;width:30px">☐</th>
          <th style="text-align:left;padding:2px 4px">Produit</th>
          <th style="text-align:right;padding:2px 4px;width:60px">Qté</th>
          <th style="text-align:right;padding:2px 4px;width:70px">Prix cmd.</th>
          <th style="text-align:right;padding:2px 4px;width:70px">Auj.</th>
          <th style="text-align:right;padding:2px 4px;width:70px">Sous-tot.</th>
        </tr>
      </thead>
      <tbody>${lignesHtml}</tbody>
    </table>
    ${totalBlock}
    ${prixFinalBlock}
    ${messageBlock}
  </div>`
}
