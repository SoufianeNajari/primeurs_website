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

export type LigneCommande = {
  produitId: string;
  optionId: string;
  nom: string;
  categorie: string;
  libelle: string;
  prix?: number | null;
  quantite: number;
};

const BRAND = {
  green: '#2C5530',
  greenLight: '#4A7A4F',
  bg: '#FAF9F7',
  border: '#E5E5E5',
  text: '#333333',
  muted: '#666666',
  red: '#9B3A3A',
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

function formatPrice(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
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
const itemRow = {
  fontSize: '14px',
  lineHeight: 1.6,
  margin: '0 0 10px',
  color: BRAND.text,
};
const hr = { borderColor: BRAND.border, margin: '24px 0' };

function LignesList({ lignes }: { lignes: LigneCommande[] }) {
  return (
    <Section>
      {lignes.map((l, i) => (
        <Text key={i} style={itemRow}>
          <strong>{l.nom}</strong>{' '}
          <span style={{ color: BRAND.muted, fontStyle: 'italic' }}>({l.categorie})</span>
          {' — Quantité : '}
          <strong>{l.quantite}</strong>
          {l.prix != null ? (
            <span style={{ color: BRAND.muted }}>
              {' — '}
              {formatPrice(Number(l.prix))} {l.libelle}
            </span>
          ) : (
            <span style={{ color: BRAND.muted }}>
              {' — '}
              {l.libelle}
            </span>
          )}
        </Text>
      ))}
    </Section>
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
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
  date: string;
}) {
  const total = totalEstime(props.lignes);
  return (
    <Html>
      <Head />
      <Preview>Nouvelle commande — {props.prenom} {props.nom}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading as="h1" style={h1}>Nouvelle commande reçue</Heading>
          <Text style={muted}>{props.date}</Text>

          <Heading as="h2" style={h2}>Client</Heading>
          <Text style={paragraph}>
            <strong>{props.prenom} {props.nom}</strong>
          </Text>
          <Text style={paragraph}>📞 {props.telephone}</Text>
          <Text style={paragraph}>✉️ {props.email}</Text>

          <Heading as="h2" style={h2}>Retrait</Heading>
          <Text style={{ ...paragraph, fontSize: '17px', color: BRAND.green }}>
            <strong>{props.jourRetrait}</strong>
            {props.creneau && <> · {props.creneau}</>}
          </Text>
          {props.message && (
            <Text style={{ ...paragraph, fontStyle: 'italic', color: BRAND.muted }}>
              « {props.message} »
            </Text>
          )}

          <Heading as="h2" style={h2}>Produits commandés</Heading>
          <LignesList lignes={props.lignes} />

          {total != null && (
            <>
              <Hr style={hr} />
              <Text style={{ ...paragraph, fontSize: '16px' }}>
                <strong>Total estimé :</strong> {formatPrice(total)}{' '}
                <span style={{ color: BRAND.muted, fontStyle: 'italic', fontSize: '13px' }}>
                  (pesée finale en boutique)
                </span>
              </Text>
            </>
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
  lignes: LigneCommande[];
}) {
  const total = totalEstime(props.lignes);
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
              textAlign: 'center',
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
              {props.jourRetrait}
            </Text>
            {props.creneau && (
              <Text style={{ fontSize: '16px', color: BRAND.green, margin: '6px 0 0' }}>
                Créneau : {props.creneau}
              </Text>
            )}
          </Section>

          <Heading as="h2" style={h2}>Récapitulatif</Heading>
          <LignesList lignes={props.lignes} />

          {total != null && (
            <Text style={paragraph}>
              <strong>Sous-total estimé : {formatPrice(total)}</strong>{' '}
              <span style={{ color: BRAND.muted, fontStyle: 'italic' }}>
                — la pesée finale sera effectuée en boutique.
              </span>
            </Text>
          )}

          <Text
            style={{
              ...paragraph,
              color: BRAND.red,
              fontStyle: 'italic',
              textAlign: 'center',
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
  message?: string | null;
  lignes: LigneCommande[];
  orderId: string;
}): Promise<string> {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return render(<ShopEmail {...args} date={date} />);
}

export async function emailClient(args: {
  prenom: string;
  jourRetrait: string;
  creneau?: string | null;
  lignes: LigneCommande[];
}): Promise<string> {
  return render(<ClientEmail {...args} />);
}
