import { NextResponse } from 'next/server';

// Format UUID standard (any version, lowercase ou uppercase). Sert à valider
// les identifiants reçus en route param ou en body avant de les passer à
// Supabase — sans validation, un id mal formé déclenche une erreur Postgres
// 22P02 et ressort en 500. Avec validation, on renvoie un 400 propre.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

// Helper pour les routes API : retourne une NextResponse 400 si l'id est
// invalide, sinon null. Usage :
//   const badId = badRequestIfNotUuid(params.id);
//   if (badId) return badId;
export function badRequestIfNotUuid(value: unknown, label = 'Identifiant invalide'): NextResponse | null {
  if (!isValidUuid(value)) {
    return NextResponse.json({ error: label }, { status: 400 });
  }
  return null;
}
