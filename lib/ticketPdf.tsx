import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { SITE } from '@/lib/site';
import { shortOrderId } from '@/lib/order';

// Ligne réelle pesée (saisie admin au passage en « Prête »).
export type TicketLigneReelle = {
  produitId?: string;
  optionId?: string;
  nom: string;
  libelle: string;
  quantite_reelle: number;
  prix_unitaire_reel: number;
};

export type TicketPdfOrder = {
  id: string;
  client_nom: string;
  client_telephone?: string | null;
  created_at: string;
  date_livraison?: string | null;
  creneau_livraison?: string | null;
  adresse?: string | null;
  complement_adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  frais_livraison_cents?: number | null;
  code_promo?: string | null;
  reduction_cents?: number | null;
  prix_final?: number | null;
  ticket_lignes?: TicketLigneReelle[] | null;
  lignes?: { nom: string; libelle: string; quantite: number; prix?: number | null }[] | null;
};

function euro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatDateLongue(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

type Row = { nom: string; libelle: string; quantite: number; prixUnitaire: number | null; sousTotal: number | null };

// Lignes réelles si dispo, sinon repli sur les lignes commandées (prix estimé).
function buildRows(order: TicketPdfOrder): Row[] {
  if (order.ticket_lignes && order.ticket_lignes.length > 0) {
    return order.ticket_lignes.map((l) => ({
      nom: l.nom,
      libelle: l.libelle,
      quantite: l.quantite_reelle,
      prixUnitaire: l.prix_unitaire_reel,
      sousTotal: Math.round(l.quantite_reelle * l.prix_unitaire_reel * 100) / 100,
    }));
  }
  return (order.lignes || []).map((l) => ({
    nom: l.nom,
    libelle: l.libelle,
    quantite: l.quantite,
    prixUnitaire: l.prix == null ? null : Number(l.prix),
    sousTotal: l.prix == null ? null : Math.round(Number(l.prix) * l.quantite * 100) / 100,
  }));
}

const GREEN = '#2C5530';
const BORDER = '#DDDDDD';
const MUTED = '#666666';

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GREEN },
  brandSub: { fontSize: 9, color: MUTED, marginTop: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ticketTag: { fontSize: 9, letterSpacing: 1, color: MUTED, textTransform: 'uppercase' },
  ticketNum: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: GREEN, marginVertical: 12 },
  section: { marginBottom: 10 },
  label: { fontSize: 8, letterSpacing: 1, color: MUTED, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10 },
  strong: { fontFamily: 'Helvetica-Bold' },
  tHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#999', paddingBottom: 4, marginTop: 8 },
  tHeadCell: { fontSize: 8, letterSpacing: 1, color: MUTED, textTransform: 'uppercase' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 6 },
  colNom: { flex: 1, paddingRight: 8 },
  colQte: { width: 70, textAlign: 'right' },
  colPU: { width: 80, textAlign: 'right' },
  colST: { width: 70, textAlign: 'right' },
  libelle: { fontSize: 8, color: MUTED, marginTop: 1 },
  totalsBox: { marginTop: 12, marginLeft: 'auto', width: 240 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#999' },
  totalFinalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  totalFinalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GREEN },
  green: { color: GREEN },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  footerText: { fontSize: 7.5, color: MUTED, lineHeight: 1.4 },
});

function TicketDoc({ order }: { order: TicketPdfOrder }) {
  const rows = buildRows(order);
  const sumRows = rows.reduce((acc, r) => acc + (r.sousTotal ?? 0), 0);
  const fraisEuros = (order.frais_livraison_cents ?? 0) / 100;
  const reductionEuros = (order.reduction_cents ?? 0) / 100;
  // prix_final = somme des lignes réelles (sous-total produits). Le montant
  // réellement payé ajoute les frais de livraison et retire la réduction.
  const sousTotalProduits = order.prix_final != null ? Number(order.prix_final) : Math.round(sumRows * 100) / 100;
  const total = Math.round((sousTotalProduits + fraisEuros - reductionEuros) * 100) / 100;

  const dateLiv = formatDateLongue(order.date_livraison);
  const adresseParts = [order.adresse, order.complement_adresse, `${order.code_postal ?? ''} ${order.ville ?? ''}`.trim()]
    .filter((p) => p && String(p).trim().length > 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>{SITE.name}</Text>
            <Text style={s.brandSub}>{SITE.telephoneDisplay} · {SITE.email}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.ticketTag}>Ticket de caisse</Text>
            <Text style={s.ticketNum}>{shortOrderId(order.id)}</Text>
            <Text style={s.brandSub}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={[s.section, { flex: 1, paddingRight: 12 }]}>
            <Text style={s.label}>Client</Text>
            <Text style={[s.value, s.strong]}>{order.client_nom}</Text>
            {order.client_telephone ? <Text style={s.value}>{order.client_telephone}</Text> : null}
          </View>
          <View style={[s.section, { flex: 1 }]}>
            <Text style={s.label}>{dateLiv ? 'Livraison' : 'Commande'}</Text>
            <Text style={[s.value, s.strong]}>{dateLiv ?? formatDateLongue(order.created_at.slice(0, 10))}</Text>
            {order.creneau_livraison ? <Text style={s.value}>{order.creneau_livraison}</Text> : null}
            {adresseParts.map((p, i) => (
              <Text key={i} style={s.value}>{p}</Text>
            ))}
          </View>
        </View>

        <View style={s.tHead}>
          <Text style={[s.tHeadCell, s.colNom]}>Article</Text>
          <Text style={[s.tHeadCell, s.colQte]}>Qté</Text>
          <Text style={[s.tHeadCell, s.colPU]}>Prix unit.</Text>
          <Text style={[s.tHeadCell, s.colST]}>Sous-total</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={s.tRow} wrap={false}>
            <View style={s.colNom}>
              <Text style={s.strong}>{r.nom}</Text>
              {r.libelle ? <Text style={s.libelle}>{r.libelle}</Text> : null}
            </View>
            <Text style={s.colQte}>{r.quantite}</Text>
            <Text style={s.colPU}>{r.prixUnitaire == null ? '—' : euro(r.prixUnitaire)}</Text>
            <Text style={[s.colST, s.strong]}>{r.sousTotal == null ? '—' : euro(r.sousTotal)}</Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={{ color: MUTED }}>Sous-total produits</Text>
            <Text>{euro(sousTotalProduits)}</Text>
          </View>
          {order.frais_livraison_cents != null && order.frais_livraison_cents > 0 ? (
            <View style={s.totalRow}>
              <Text style={{ color: MUTED }}>Frais de livraison</Text>
              <Text>{euro(fraisEuros)}</Text>
            </View>
          ) : order.adresse ? (
            <View style={s.totalRow}>
              <Text style={s.green}>Livraison offerte</Text>
              <Text style={s.green}>0,00 €</Text>
            </View>
          ) : null}
          {order.code_promo && order.reduction_cents != null && order.reduction_cents > 0 ? (
            <View style={s.totalRow}>
              <Text style={s.green}>Code {order.code_promo}</Text>
              <Text style={s.green}>-{euro(reductionEuros)}</Text>
            </View>
          ) : null}
          <View style={s.totalRowFinal}>
            <Text style={s.totalFinalLabel}>Total payé</Text>
            <Text style={s.totalFinalValue}>{euro(total)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {SITE.name} — Livraison de fruits et légumes frais. Règlement à la livraison (CB ou espèces).
          </Text>
          <Text style={s.footerText}>
            Micro-entreprise — TVA non applicable, art. 293 B du CGI. Merci de votre confiance.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderTicketPdf(order: TicketPdfOrder): Promise<Buffer> {
  return renderToBuffer(<TicketDoc order={order} />);
}
