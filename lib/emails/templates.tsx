import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link as EmailLink,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';
import { SITE } from '@/lib/site';
import { calcFourchette, type FourchetteBornes } from '@/lib/fourchette';
import { shortOrderId } from '@/lib/order';

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

function formatPriceCents(c: number): string {
  return formatPrice(c / 100);
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

function buildAdresseFull(adresse: string, complementAdresse: string | null | undefined, codePostal: string, ville: string): string {
  const parts = [adresse];
  if (complementAdresse) parts.push(complementAdresse);
  parts.push(`${codePostal} ${ville}`);
  return parts.join(', ');
}

function buildMapsUrl(adresse: string, codePostal: string, ville: string): string {
  const q = encodeURIComponent(`${adresse}, ${codePostal} ${ville}, France`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
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
                {incertain ? <span style={{ color: BRAND.muted, fontStyle: 'italic' }}>à la pesée</span> : formatPrice(Number(l.prix))}
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

type LivraisonInfos = {
  adresse: string;
  complementAdresse?: string | null;
  ville: string;
  codePostal: string;
  creneauLabel: string;
  dateLivraison: string;
  fraisLivraisonCents: number;
  codePromo?: string | null;
  reductionCents?: number;
};

function ShopEmail(props: LivraisonInfos & {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
  date: string;
  fourchetteBornes: FourchetteBornes;
}) {
  const total = totalEstime(props.lignes);
  const incertain = hasIncertain(props.lignes);
  const fourchette = total != null ? calcFourchette(total, props.fourchetteBornes) : null;
  const fraisEuros = props.fraisLivraisonCents / 100;
  const reductionEuros = (props.reductionCents ?? 0) / 100;
  const totalCentral = total != null ? total + fraisEuros - reductionEuros : null;
  const bornesClient = fourchette
    ? { min: fourchette.min + fraisEuros - reductionEuros, max: fourchette.max + fraisEuros - reductionEuros }
    : null;
  const dateLong = formatDateLong(props.dateLivraison);
  const adresseFull = buildAdresseFull(props.adresse, props.complementAdresse, props.codePostal, props.ville);
  const mapsUrl = buildMapsUrl(props.adresse, props.codePostal, props.ville);

  return (
    <Html>
      <Head />
      <Preview>Livraison {props.prenom} {props.nom} — {dateLong || props.creneauLabel} — {props.ville}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>
            Livraison {shortOrderId(props.orderId)}
          </Heading>
          <Text style={muted}>Reçue le {props.date}</Text>

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
              Créneau livraison
            </Text>
            {dateLong && (
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
            )}
            <Text style={{ fontSize: '15px', color: BRAND.green, margin: '6px 0 0' }}>
              {props.creneauLabel}
            </Text>
          </Section>

          <Heading as="h2" style={h2}>Adresse de livraison</Heading>
          <Text style={{ ...paragraph, fontSize: '17px', margin: '0 0 6px' }}>
            <strong>{adresseFull}</strong>
          </Text>
          {props.complementAdresse && (
            <Text style={muted}>Complément : {props.complementAdresse}</Text>
          )}
          <Text style={paragraph}>
            <EmailLink href={mapsUrl} style={{ color: BRAND.green, fontWeight: 600 }}>
              📍 Ouvrir dans Google Maps
            </EmailLink>
          </Text>

          <Heading as="h2" style={h2}>Client</Heading>
          <Text style={paragraph}>
            <strong>{props.prenom} {props.nom}</strong>
          </Text>
          <Text style={{ ...paragraph, fontSize: '17px' }}>
            📞 <EmailLink href={`tel:${props.telephone.replace(/\s+/g, '')}`} style={{ color: BRAND.green, textDecoration: 'none' }}>
              <strong>{props.telephone}</strong>
            </EmailLink>
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
                <strong>Prix communiqué au client à la livraison.</strong> Une ou plusieurs lignes
                sont marquées « À peser / calibrer ».
              </Text>
            </Section>
          ) : (
            total != null && totalCentral != null && bornesClient && (
              <>
                <Hr style={hr} />
                <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: BRAND.muted, fontSize: '14px' }}>Sous-total produits</td>
                      <td style={{ padding: '4px 0', textAlign: 'right' as const, fontWeight: 600 }}>{formatPrice(total)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: BRAND.muted, fontSize: '14px' }}>Frais de livraison</td>
                      <td style={{ padding: '4px 0', textAlign: 'right' as const, fontWeight: 600 }}>
                        {props.fraisLivraisonCents > 0 ? formatPriceCents(props.fraisLivraisonCents) : 'Offerts'}
                      </td>
                    </tr>
                    {props.codePromo && props.reductionCents && props.reductionCents > 0 && (
                      <tr>
                        <td style={{ padding: '4px 0', color: BRAND.green, fontSize: '14px' }}>
                          Code promo {props.codePromo}
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right' as const, fontWeight: 600, color: BRAND.green }}>
                          −{formatPriceCents(props.reductionCents)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td
                        style={{
                          padding: '8px 0 4px',
                          borderTop: `1px solid ${BRAND.border}`,
                          color: BRAND.text,
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        Total estimé annoncé
                      </td>
                      <td
                        style={{
                          padding: '8px 0 4px',
                          borderTop: `1px solid ${BRAND.border}`,
                          textAlign: 'right' as const,
                          fontWeight: 700,
                          fontSize: '16px',
                        }}
                      >
                        {formatPrice(totalCentral)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <Section
                  style={{
                    backgroundColor: BRAND.bg,
                    border: `1px solid ${BRAND.border}`,
                    padding: '14px 16px',
                    margin: '16px 0 0',
                  }}
                >
                  <Text
                    style={{
                      color: BRAND.muted,
                      fontSize: '11px',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase' as const,
                      margin: '0 0 6px',
                      fontWeight: 600,
                    }}
                  >
                    Fourchette annoncée au client
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '20px',
                      margin: 0,
                      color: BRAND.green,
                      fontWeight: 'bold' as const,
                    }}
                  >
                    {formatPrice(bornesClient.min)} – {formatPrice(bornesClient.max)}
                  </Text>
                  <Text style={{ ...muted, margin: '4px 0 0', fontSize: '12px' }}>
                    (−{Math.round((1 - props.fourchetteBornes.min) * 100)}% / +{Math.round((props.fourchetteBornes.max - 1) * 100)}% sur sous-total, frais et code inclus)
                  </Text>
                </Section>

                <Section
                  style={{
                    backgroundColor: BRAND.alertBg,
                    border: `1px solid ${BRAND.alertBorder}`,
                    padding: '14px 16px',
                    margin: '12px 0 0',
                  }}
                >
                  <Text style={{ ...paragraph, color: BRAND.alertText, margin: 0, fontSize: '14px' }}>
                    ⚠️ <strong>Si le coût réel dépasse {formatPrice(bornesClient.max)}</strong>,
                    prévenir le client avant préparation au{' '}
                    <EmailLink href={`tel:${props.telephone.replace(/\s+/g, '')}`} style={{ color: BRAND.alertText }}>
                      <strong>{props.telephone}</strong>
                    </EmailLink>.
                  </Text>
                </Section>
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

function ClientEmail(props: LivraisonInfos & {
  prenom: string;
  lignes: LigneCommande[];
  fourchetteBornes: FourchetteBornes;
  codeParrainage?: string | null;
  reductionParrainageCents?: number;
  panierMinParrainageCents?: number;
}) {
  const total = totalEstime(props.lignes);
  const incertain = hasIncertain(props.lignes);
  const fourchette = total != null && !incertain ? calcFourchette(total, props.fourchetteBornes) : null;
  const dateLong = formatDateLong(props.dateLivraison);
  const adresseFull = buildAdresseFull(props.adresse, props.complementAdresse, props.codePostal, props.ville);
  const fraisEuros = props.fraisLivraisonCents / 100;
  const reductionEuros = (props.reductionCents ?? 0) / 100;
  const totalCentral = total != null && !incertain ? total + fraisEuros - reductionEuros : null;
  const totalAvecFraisMin = fourchette ? fourchette.min + fraisEuros - reductionEuros : null;
  const totalAvecFraisMax = fourchette ? fourchette.max + fraisEuros - reductionEuros : null;

  return (
    <Html>
      <Head />
      <Preview>Votre livraison Primeur Chez Vous est confirmée</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Bonjour {props.prenom},</Heading>
          <Text style={paragraph}>
            Nous vous remercions de votre confiance. Votre commande a bien été enregistrée et sera livrée à votre adresse.
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
              Votre livraison est prévue
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
              {dateLong || props.creneauLabel}
            </Text>
            <Text style={{ fontSize: '16px', color: BRAND.green, margin: '6px 0 0' }}>
              {props.creneauLabel}
            </Text>
            <Text style={{ ...muted, marginTop: '12px' }}>
              à <strong>{adresseFull}</strong>
            </Text>
          </Section>

          <Heading as="h2" style={h2}>Récapitulatif</Heading>
          <LignesTable lignes={props.lignes} />

          {incertain ? (
            <Text style={{ ...paragraph, marginTop: '16px' }}>
              <strong>Prix à la livraison.</strong> Certains produits seront pesés ou calibrés
              à la préparation : nous vous communiquerons le prix exact à la livraison.
            </Text>
          ) : (
            total != null && totalCentral != null && fourchette && (
              <>
                <table style={{ ...tableStyle, marginTop: '20px' }} cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0', color: BRAND.muted, fontSize: '14px' }}>Sous-total produits</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' as const, fontWeight: 600 }}>
                        {formatPrice(total)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: BRAND.muted, fontSize: '14px' }}>Frais de livraison</td>
                      <td
                        style={{
                          padding: '6px 0',
                          textAlign: 'right' as const,
                          fontWeight: 600,
                          color: props.fraisLivraisonCents === 0 ? BRAND.green : BRAND.text,
                        }}
                      >
                        {props.fraisLivraisonCents > 0 ? formatPriceCents(props.fraisLivraisonCents) : 'Offerts'}
                      </td>
                    </tr>
                    {props.codePromo && props.reductionCents && props.reductionCents > 0 && (
                      <tr>
                        <td style={{ padding: '6px 0', color: BRAND.green, fontSize: '14px' }}>
                          Code promo {props.codePromo}
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right' as const, fontWeight: 600, color: BRAND.green }}>
                          −{formatPriceCents(props.reductionCents)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td
                        style={{
                          padding: '10px 0 4px',
                          borderTop: `1px solid ${BRAND.border}`,
                          color: BRAND.text,
                          fontSize: '15px',
                          fontWeight: 600,
                        }}
                      >
                        Total estimé
                      </td>
                      <td
                        style={{
                          padding: '10px 0 4px',
                          borderTop: `1px solid ${BRAND.border}`,
                          textAlign: 'right' as const,
                          fontWeight: 700,
                          fontSize: '18px',
                        }}
                      >
                        {formatPrice(totalCentral)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {totalAvecFraisMin != null && totalAvecFraisMax != null && (
                  <Text style={{ ...muted, marginTop: '14px', fontSize: '13px' }}>
                    Fourchette possible à la préparation : <strong>{formatPrice(totalAvecFraisMin)} – {formatPrice(totalAvecFraisMax)}</strong>
                    {' '}(cours du jour, poids réel). Si l&apos;écart dépasse, nous vous contactons avant livraison.
                  </Text>
                )}
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
            Le règlement s&apos;effectue à la livraison (CB ou espèces).
          </Text>

          {props.codeParrainage && (
            <Section
              style={{
                backgroundColor: BRAND.bg,
                border: `1px dashed ${BRAND.green}`,
                padding: '20px',
                marginTop: '32px',
                textAlign: 'center' as const,
              }}
            >
              <Text
                style={{
                  color: BRAND.green,
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase' as const,
                  margin: '0 0 8px',
                  fontWeight: 600,
                }}
              >
                Parrainez et gagnez −{formatPriceCents(props.reductionParrainageCents ?? 500)}
              </Text>
              <Text style={{ ...paragraph, marginTop: 0, marginBottom: '12px' }}>
                Partagez votre code à un proche : il bénéficie de <strong>−{formatPriceCents(props.reductionParrainageCents ?? 500)}</strong> sur sa première commande, et nous vous offrons <strong>−{formatPriceCents(props.reductionParrainageCents ?? 500)}</strong> sur la vôtre.
              </Text>
              <Text
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 'bold' as const,
                  letterSpacing: '2px',
                  color: BRAND.green,
                  margin: '8px 0',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${BRAND.border}`,
                  display: 'inline-block' as const,
                }}
              >
                {props.codeParrainage}
              </Text>
              <Text style={{ ...muted, marginTop: '10px', fontSize: '12px' }}>
                Valable sur les paniers de {formatPriceCents(props.panierMinParrainageCents ?? 3000)} minimum.
              </Text>
            </Section>
          )}

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

function MerciParrainEmail(props: {
  parrainEmail: string;
  filleulPrenom: string;
  filleulNom: string;
  codeMerci: string;
  reductionCents: number;
  panierMinCents: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Merci ! {props.filleulPrenom} a utilisé votre code — voici votre cadeau</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Merci pour le coup de main !</Heading>
          <Text style={paragraph}>
            Bonne nouvelle : <strong>{props.filleulPrenom} {props.filleulNom}</strong> vient de passer sa première commande chez {SITE.name} grâce à votre code de parrainage.
          </Text>
          <Text style={paragraph}>
            Pour vous remercier, voici un code à utiliser sur votre prochaine commande :
          </Text>

          <Section
            style={{
              backgroundColor: BRAND.bg,
              border: `2px solid ${BRAND.green}`,
              padding: '24px',
              margin: '24px 0',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                color: BRAND.green,
                fontSize: '11px',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                margin: '0 0 8px',
                fontWeight: 600,
              }}
            >
              Votre cadeau
            </Text>
            <Text
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                fontWeight: 'bold' as const,
                letterSpacing: '3px',
                color: BRAND.green,
                margin: '8px 0',
              }}
            >
              {props.codeMerci}
            </Text>
            <Text style={{ ...paragraph, marginTop: '8px', marginBottom: 0 }}>
              <strong>−{formatPriceCents(props.reductionCents)}</strong> sur votre prochaine commande
            </Text>
            <Text style={{ ...muted, marginTop: '8px', fontSize: '12px' }}>
              Valable une seule fois, sur un panier d&apos;au moins {formatPriceCents(props.panierMinCents)}.
              <br />Code réservé à votre adresse email.
            </Text>
          </Section>

          <Text style={paragraph}>
            Vous pouvez continuer à partager votre code de parrainage : il fonctionne pour autant de filleuls que vous voulez, et chaque utilisation vous fait gagner un nouveau cadeau.
          </Text>

          <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
            <EmailLink
              href={`${SITE.url}/boutique`}
              style={{
                display: 'inline-block' as const,
                backgroundColor: BRAND.green,
                color: '#ffffff',
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                padding: '12px 24px',
                textDecoration: 'none',
                border: `1px solid ${BRAND.green}`,
              }}
            >
              Passer commande
            </EmailLink>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export type EmailShopArgs = LivraisonInfos & {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
  fourchetteBornes: FourchetteBornes;
};

export type EmailClientArgs = LivraisonInfos & {
  prenom: string;
  lignes: LigneCommande[];
  fourchetteBornes: FourchetteBornes;
  codeParrainage?: string | null;
  reductionParrainageCents?: number;
  panierMinParrainageCents?: number;
};

export type EmailMerciParrainArgs = {
  parrainEmail: string;
  filleulPrenom: string;
  filleulNom: string;
  codeMerci: string;
  reductionCents: number;
  panierMinCents: number;
};

export async function emailShop(args: EmailShopArgs): Promise<string> {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return render(<ShopEmail {...args} date={date} />);
}

export async function emailClient(args: EmailClientArgs): Promise<string> {
  return render(<ClientEmail {...args} />);
}

export async function emailMerciParrain(args: EmailMerciParrainArgs): Promise<string> {
  return render(<MerciParrainEmail {...args} />);
}

// ───── Rappel J-1 ─────

function RappelJ1Email(props: {
  prenom: string;
  dateLivraison: string;
  creneauLabel: string;
  adresseFull: string;
  cancelUrl: string;
  livreurPrenom: string;
}) {
  const dateLong = formatDateLong(props.dateLivraison) ?? props.dateLivraison;
  return (
    <Html>
      <Head />
      <Preview>Votre livraison Primeur Chez Vous demain — {dateLong}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Bonjour {props.prenom},</Heading>
          <Text style={paragraph}>
            Petit rappel : votre livraison <strong>Primeur Chez Vous</strong> est prévue demain.
          </Text>

          <Section
            style={{
              backgroundColor: BRAND.bg,
              border: `2px solid ${BRAND.green}`,
              padding: '20px',
              margin: '24px 0',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                color: BRAND.green,
                fontSize: '11px',
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                margin: '0 0 8px',
                fontWeight: 600,
              }}
            >
              Demain
            </Text>
            <Text style={{ fontFamily: 'Georgia, serif', fontSize: '22px', margin: 0, color: BRAND.text, fontWeight: 'bold' as const }}>
              {dateLong}
            </Text>
            <Text style={{ fontSize: '15px', color: BRAND.green, margin: '6px 0 0' }}>
              {props.creneauLabel}
            </Text>
            <Text style={{ ...muted, marginTop: '12px' }}>
              à <strong>{props.adresseFull}</strong>
            </Text>
          </Section>

          <Text style={paragraph}>
            <strong>{props.livreurPrenom}</strong> sera à votre porte sur ce créneau. Si vous n&apos;êtes pas chez vous,
            il vous appellera pour convenir d&apos;un point de remise (voisin, gardien, lieu sûr).
          </Text>

          <Hr style={hr} />

          <Text style={{ ...muted, textAlign: 'center' as const, fontSize: '13px', margin: '8px 0 16px' }}>
            Empêchement de dernière minute ?
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 8px' }}>
            <EmailLink
              href={props.cancelUrl}
              style={{
                color: BRAND.muted,
                fontSize: '13px',
                textDecoration: 'underline',
              }}
            >
              Annuler ma livraison
            </EmailLink>
          </Section>
          <Text style={{ ...muted, textAlign: 'center' as const, fontSize: '12px' }}>
            Annulation gratuite et immédiate, sans débit.
          </Text>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export type EmailRappelJ1Args = {
  prenom: string;
  dateLivraison: string;
  creneauLabel: string;
  adresseFull: string;
  cancelUrl: string;
  livreurPrenom: string;
};

export async function emailRappelJ1(args: EmailRappelJ1Args): Promise<string> {
  return render(<RappelJ1Email {...args} />);
}

// ───── Relance J+14 ─────

function RelanceJ14Email(props: {
  prenom: string;
  boutiqueUrl: string;
  livreurPrenom: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Le marché du moment — Primeur Chez Vous</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Bonjour {props.prenom},</Heading>
          <Text style={paragraph}>
            Cela fait deux semaines que nous vous avons livré, j&apos;espère que tout vous a plu.
          </Text>
          <Text style={paragraph}>
            Le marché change vite à cette période : de nouveaux fruits arrivent, certains
            légumes finissent leur saison. Si l&apos;envie d&apos;une commande vous prend, je
            sélectionne tout au matin à Rungis.
          </Text>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
            <EmailLink
              href={props.boutiqueUrl}
              style={{
                backgroundColor: BRAND.green,
                color: '#ffffff',
                padding: '14px 28px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px',
                letterSpacing: '0.5px',
                display: 'inline-block',
              }}
            >
              Voir la boutique
            </EmailLink>
          </Section>

          <Text style={{ ...muted, textAlign: 'center' as const, fontSize: '12px', marginTop: '8px' }}>
            Livraison à votre porte sur les créneaux du mardi et du vendredi après-midi.
          </Text>

          <Hr style={hr} />
          <Text style={paragraph}>
            À très vite,<br />
            <strong>{props.livreurPrenom}</strong>
          </Text>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export type EmailRelanceJ14Args = {
  prenom: string;
  boutiqueUrl: string;
  livreurPrenom: string;
};

export async function emailRelanceJ14(args: EmailRelanceJ14Args): Promise<string> {
  return render(<RelanceJ14Email {...args} />);
}
