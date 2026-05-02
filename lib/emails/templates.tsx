import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';
import { SITE } from '@/lib/site';
import { calcFourchette, formatFourchette, type FourchetteBornes } from '@/lib/fourchette';

export type LigneCommande = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
  commentaire?: string;
};

const BRAND = {
  green: '#2C5530',
  greenLight: '#4A7A4F',
  bg: '#FAF9F7',
  border: '#E5E5E5',
  text: '#333333',
  muted: '#666666',
  red: '#9B3A3A',
  alertBg: '#FFF4E5',
  alertBorder: '#E0A030',
  alertText: '#7A4A00',
};

function totalEstime(lignes: LigneCommande[]): number | null {
  let total = 0;
  let hasPrix = false;
  for (const l of lignes) {
    if (l.prix != null) {
      total += Number(l.prix) * l.quantite;
      hasPrix = true;
    }
  }
  return hasPrix ? total : null;
}

function hasIncertain(lignes: LigneCommande[]): boolean {
  return lignes.some((l) => l.prix == null);
}

function formatPrice(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatDateLong(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '24px 0',
  color: BRAND.text,
};
const container = {
  backgroundColor: '#ffffff',
  border: `1px solid ${BRAND.border}`,
  margin: '0 auto',
  maxWidth: '600px',
  padding: '32px 24px',
};
const h1 = {
  color: BRAND.text,
  fontFamily: 'Georgia, serif',
  fontSize: '26px',
  fontWeight: 'normal' as const,
  lineHeight: 1.3,
  margin: '0 0 16px',
};
const h2 = {
  color: BRAND.text,
  fontFamily: 'Georgia, serif',
  fontSize: '18px',
  fontWeight: 'normal' as const,
  margin: '24px 0 12px',
  paddingBottom: '8px',
  borderBottom: `1px solid ${BRAND.border}`,
};
const paragraph = {
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 12px',
  color: BRAND.text,
};
const muted = { ...paragraph, color: BRAND.muted, fontSize: '13px' };
const hr = { borderColor: BRAND.border, margin: '24px 0' };

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
};
const thStyle = {
  textAlign: 'left' as const,
  padding: '8px 6px',
  borderBottom: `2px solid ${BRAND.border}`,
  color: BRAND.muted,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  fontWeight: 600,
};
const tdStyle = {
  padding: '10px 6px',
  borderBottom: `1px solid ${BRAND.border}`,
  verticalAlign: 'top' as const,
  color: BRAND.text,
};

function LignesTable({ lignes, lockPrices = false }: { lignes: LigneCommande[]; lockPrices?: boolean }) {
  return (
    <table style={tableStyle} cellPadding={0} cellSpacing={0}>
      <thead>
        <tr>
          <th style={thStyle}>Produit</th>
          <th style={{ ...thStyle, textAlign: 'center' as const, width: '50px' }}>Qté</th>
          <th style={{ ...thStyle, textAlign: 'right' as const, width: '110px' }}>
            {lockPrices ? 'Prix unitaire (lock)' : 'Prix unitaire'}
          </th>
          <th style={{ ...thStyle, textAlign: 'right' as const, width: '90px' }}>Sous-total</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((l, i) => {
          const incertain = l.prix == null;
          const sousTotal = incertain ? null : Number(l.prix) * l.quantite;
          return (
            <tr key={i}>
              <td style={tdStyle}>
                <div><strong>{l.nom}</strong></div>
                <div style={{ color: BRAND.muted, fontSize: '12px' }}>{l.libelle}</div>
                {l.commentaire && (
                  <div
                    style={{
                      backgroundColor: BRAND.alertBg,
                      borderLeft: `3px solid ${BRAND.alertBorder}`,
                      color: BRAND.alertText,
                      fontSize: '12px',
                      padding: '4px 8px',
                      marginTop: '6px',
                      fontStyle: 'italic',
                    }}
                  >
                    Note client : {l.commentaire}
                  </div>
                )}
                {incertain && (
                  <div
                    style={{
                      color: BRAND.alertText,
                      fontSize: '11px',
                      fontStyle: 'italic',
                      marginTop: '4px',
                    }}
                  >
                    À peser / calibrer
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: 600 }}>{l.quantite}</td>
              <td style={{ ...tdStyle, textAlign: 'right' as const }}>
                {incertain ? <span style={{ color: BRAND.muted, fontStyle: 'italic' }}>à la remise</span> : formatPrice(Number(l.prix))}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' as const, fontWeight: 600 }}>
                {sousTotal != null ? formatPrice(sousTotal) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Footer() {
  const addr = `${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.city}`;
  return (
    <Section style={{ textAlign: 'center', marginTop: '32px' }}>
      <Hr style={hr} />
      <Text style={{ ...paragraph, fontFamily: 'Georgia, serif', fontSize: '17px', margin: '0 0 4px' }}>
        <strong>{SITE.name}</strong>
      </Text>
      <Text style={muted}>{addr}</Text>
      <Text style={muted}>{SITE.telephoneDisplay}</Text>
    </Section>
  );
}

function ShopEmail(props: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  jourRetrait: string;
  creneau?: string | null;
  dateRetraitSouhaite?: string | null;
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
  date: string;
  fourchetteMaxPct: number;
}) {
  const total = totalEstime(props.lignes);
  const incertain = hasIncertain(props.lignes);
  const borneMax = total != null ? Math.round(total * props.fourchetteMaxPct * 100) / 100 : null;
  const dateLong = formatDateLong(props.dateRetraitSouhaite);

  return (
    <Html>
      <Head />
      <Preview>Commande {props.prenom} {props.nom} — retrait {dateLong || props.jourRetrait}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Commande #{props.orderId.slice(0, 8).toUpperCase()}
          </Heading>
          <Text style={muted}>Reçue le {props.date}</Text>

          {dateLong ? (
            <Section
              style={{
                backgroundColor: BRAND.bg,
                border: `2px solid ${BRAND.green}`,
                padding: '16px 20px',
                margin: '16px 0 24px',
                textAlign: 'center' as const,
              }}
            >
              <Text
                style={{
                  color: BRAND.green,
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase' as const,
                  margin: '0 0 6px',
                  fontWeight: 600,
                }}
              >
                Retrait souhaité
              </Text>
              <Text
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '22px',
                  margin: 0,
                  color: BRAND.text,
                  fontWeight: 'bold' as const,
                }}
              >
                {dateLong}
              </Text>
              <Text style={{ fontSize: '15px', color: BRAND.green, margin: '6px 0 0' }}>
                {props.jourRetrait}{props.creneau && <> · {props.creneau}</>}
              </Text>
            </Section>
          ) : (
            <Section
              style={{
                backgroundColor: BRAND.bg,
                border: `1px solid ${BRAND.border}`,
                padding: '12px 16px',
                margin: '16px 0 24px',
              }}
            >
              <Text style={{ ...paragraph, fontSize: '17px', color: BRAND.green, margin: 0 }}>
                <strong>Retrait : {props.jourRetrait}</strong>
                {props.creneau && <> · {props.creneau}</>}
              </Text>
            </Section>
          )}

          <Heading as="h2" style={h2}>Client</Heading>
          <Text style={paragraph}>
            <strong>{props.prenom} {props.nom}</strong>
          </Text>
          <Text style={{ ...paragraph, fontSize: '17px' }}>
            📞 <a href={`tel:${props.telephone.replace(/\s+/g, '')}`} style={{ color: BRAND.green, textDecoration: 'none' }}>
              <strong>{props.telephone}</strong>
            </a>
          </Text>
          <Text style={muted}>✉️ {props.email}</Text>
          {props.message && (
            <Text style={{ ...paragraph, fontStyle: 'italic', color: BRAND.muted, marginTop: '8px' }}>
              « {props.message} »
            </Text>
          )}

          <Heading as="h2" style={h2}>Produits — fiche de préparation</Heading>
          <LignesTable lignes={props.lignes} lockPrices />

          {incertain ? (
            <Section
              style={{
                backgroundColor: BRAND.alertBg,
                border: `1px solid ${BRAND.alertBorder}`,
                padding: '14px 16px',
                margin: '20px 0 0',
              }}
            >
              <Text style={{ ...paragraph, color: BRAND.alertText, margin: 0, fontSize: '14px' }}>
                <strong>Prix communiqué au client à la remise.</strong> Une ou plusieurs lignes
                sont marquées « À peser / calibrer » : les prix seront fixés au moment du retrait.
              </Text>
            </Section>
          ) : (
            total != null && (
              <>
                <Hr style={hr} />
                <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: BRAND.muted, fontSize: '14px' }}>Total estimé annoncé client</td>
                      <td style={{ padding: '4px 0', textAlign: 'right' as const, fontWeight: 600 }}>{formatPrice(total)}</td>
                    </tr>
                    {borneMax != null && (
                      <tr>
                        <td style={{ padding: '4px 0', color: BRAND.muted, fontSize: '14px' }}>
                          Borne haute fourchette (+{Math.round((props.fourchetteMaxPct - 1) * 100)}%)
                        </td>
                        <td
                          style={{
                            padding: '4px 0',
                            textAlign: 'right' as const,
                            fontWeight: 700,
                            fontSize: '17px',
                            color: BRAND.green,
                          }}
                        >
                          {formatPrice(borneMax)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {borneMax != null && (
                  <Section
                    style={{
                      backgroundColor: BRAND.alertBg,
                      border: `1px solid ${BRAND.alertBorder}`,
                      padding: '14px 16px',
                      margin: '20px 0 0',
                    }}
                  >
                    <Text style={{ ...paragraph, color: BRAND.alertText, margin: 0, fontSize: '14px' }}>
                      ⚠️ <strong>Si le coût réel dépasse {formatPrice(borneMax)}</strong>,
                      prévenir le client avant préparation au{' '}
                      <a href={`tel:${props.telephone.replace(/\s+/g, '')}`} style={{ color: BRAND.alertText }}>
                        <strong>{props.telephone}</strong>
                      </a>.
                    </Text>
                  </Section>
                )}
              </>
            )
          )}

          <Hr style={hr} />
          <Text style={{ ...muted, fontSize: '11px' }}>ID commande : {props.orderId}</Text>
        </Container>
      </Body>
    </Html>
  );
}

function ClientEmail(props: {
  prenom: string;
  jourRetrait: string;
  creneau?: string | null;
  dateRetraitSouhaite?: string | null;
  lignes: LigneCommande[];
  fourchetteBornes: FourchetteBornes;
}) {
  const total = totalEstime(props.lignes);
  const incertain = hasIncertain(props.lignes);
  const fourchette = total != null && !incertain ? calcFourchette(total, props.fourchetteBornes) : null;
  const dateLong = formatDateLong(props.dateRetraitSouhaite);

  return (
    <Html>
      <Head />
      <Preview>Votre commande chez {SITE.name} est confirmée</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Bonjour {props.prenom},</Heading>
          <Text style={paragraph}>
            Nous vous remercions de votre confiance. Votre commande a bien été enregistrée.
          </Text>

          <Section
            style={{
              backgroundColor: BRAND.bg,
              border: `1px solid ${BRAND.border}`,
              padding: '20px',
              margin: '24px 0',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                color: BRAND.green,
                fontSize: '12px',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                margin: '0 0 8px',
              }}
            >
              Votre retrait est prévu
            </Text>
            <Text
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                fontWeight: 'bold' as const,
                margin: 0,
                color: BRAND.text,
              }}
            >
              {dateLong || props.jourRetrait}
            </Text>
            {dateLong && (
              <Text style={{ fontSize: '14px', color: BRAND.muted, margin: '4px 0 0' }}>
                {props.jourRetrait}
              </Text>
            )}
            {props.creneau && (
              <Text style={{ fontSize: '16px', color: BRAND.green, margin: '6px 0 0' }}>
                Créneau : {props.creneau}
              </Text>
            )}
          </Section>

          <Heading as="h2" style={h2}>Récapitulatif</Heading>
          <LignesTable lignes={props.lignes} />

          {incertain ? (
            <Text style={{ ...paragraph, marginTop: '16px' }}>
              <strong>Prix à la remise.</strong> Certains produits seront pesés ou calibrés
              au moment du retrait : nous vous communiquerons le prix exact à ce moment-là.
            </Text>
          ) : (
            fourchette && (
              <>
                <Text style={{ ...paragraph, marginTop: '16px', fontSize: '17px' }}>
                  <strong>Total final estimé : {formatFourchette(fourchette)}</strong>
                </Text>
                <Text style={muted}>
                  Prix indicatif, ajusté à la remise (cours du jour, poids réel).
                  Si l&apos;écart dépasse cette fourchette, nous vous contactons avant préparation.
                </Text>
              </>
            )
          )}

          <Text
            style={{
              ...paragraph,
              color: BRAND.red,
              fontStyle: 'italic',
              textAlign: 'center' as const,
              marginTop: '24px',
            }}
          >
            Le règlement s&apos;effectue directement en boutique lors du retrait.
          </Text>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export async function emailShop(args: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  jourRetrait: string;
  creneau?: string | null;
  dateRetraitSouhaite?: string | null;
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
  fourchetteMaxPct: number;
}): Promise<string> {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return render(<ShopEmail {...args} date={date} />);
}

export async function emailClient(args: {
  prenom: string;
  jourRetrait: string;
  creneau?: string | null;
  dateRetraitSouhaite?: string | null;
  lignes: LigneCommande[];
  fourchetteBornes: FourchetteBornes;
}): Promise<string> {
  return render(<ClientEmail {...args} />);
}
