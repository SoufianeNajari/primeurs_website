// Validation email côté serveur. Volontairement stricte sur la longueur (RFC
// 5321) et permissive sur le format (regex couvrant 99%+ des emails réels).
// On rejette les formats clairement invalides (espaces, double @, pas de point
// dans le domaine) sans chercher à valider les cas de bord (quoted local
// parts, IDN domains) qui n'ont pas vocation à arriver via un formulaire web.
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) return false;
  return EMAIL_REGEX.test(trimmed);
}
