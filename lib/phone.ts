// Normalisation téléphone vers E.164 FR (+33XXXXXXXXX).
// Volontairement strict-FR : la whitelist n'est utile que pour des clients
// physiques de Pontault-Combault, pas besoin d'accepter les numéros étrangers.

const FR_E164 = /^\+33[1-9]\d{8}$/;

export function normalizePhoneFR(input: string): string | null {
  if (!input) return null;
  // Strip tout sauf chiffres et le + initial
  const cleaned = input.trim().replace(/[\s.\-()]/g, '');
  let digits: string;

  if (cleaned.startsWith('+33')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('0033')) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith('33') && cleaned.length === 11) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    digits = cleaned.slice(1);
  } else {
    return null;
  }

  if (!/^[1-9]\d{8}$/.test(digits)) return null;
  const e164 = `+33${digits}`;
  return FR_E164.test(e164) ? e164 : null;
}

export function formatPhoneFRDisplay(e164: string): string {
  // +33612345678 → 06 12 34 56 78
  if (!FR_E164.test(e164)) return e164;
  const d = e164.slice(3);
  return `0${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}
