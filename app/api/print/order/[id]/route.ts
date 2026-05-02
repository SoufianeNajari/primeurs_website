import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin-auth'
import { getFourchetteBornes } from '@/lib/fourchette'
import { renderTicketHtml, type TicketOrder } from '@/lib/printableTicketHtml'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const [{ data: order }, fourchette, { data: produitsActuels }] = await Promise.all([
    supabaseAdmin.from('commandes').select('*').eq('id', params.id).single(),
    getFourchetteBornes(),
    supabaseAdmin.from('produits').select('id, options'),
  ])

  if (!order) return new NextResponse('Commande introuvable', { status: 404 })

  const prixActuels: Record<string, number | null> = {}
  for (const p of produitsActuels || []) {
    const opts = (p.options || []) as { id: string; prix?: number | null }[]
    for (const o of opts) {
      prixActuels[`${p.id}:${o.id}`] = o.prix == null ? null : Number(o.prix)
    }
  }

  const ticketHtml = renderTicketHtml(order as TicketOrder, prixActuels, fourchette)

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Commande</title>
<style>
  @page { size: A4; margin: 8mm; }
  html, body { margin: 0; padding: 0; background: white; color: #000; font-family: system-ui, sans-serif; }
  body { padding: 8mm; }
  @media screen { body { max-width: 800px; margin: 0 auto; padding: 16px; } }
  .actions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .actions button { min-height: 44px; padding: 0 16px; font: 600 12px/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; border: 1px solid; }
  .actions .primary { background: #2C5530; color: white; border-color: #2C5530; }
  .actions .secondary { background: white; color: #333; border-color: #ccc; }
  @media print { .actions { display: none !important; } }
</style>
</head>
<body>
  <div class="actions">
    <button class="primary" type="button" onclick="window.print()">Imprimer</button>
    <button class="secondary" type="button" onclick="window.close(); if (history.length > 1) history.back();">Fermer</button>
  </div>
  ${ticketHtml}
  <script>
    (function () {
      function go() { try { window.print() } catch (e) {} }
      if (document.readyState === 'complete') {
        requestAnimationFrame(function () { requestAnimationFrame(go) })
      } else {
        window.addEventListener('load', function () {
          requestAnimationFrame(function () { requestAnimationFrame(go) })
        })
      }
    })()
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}
