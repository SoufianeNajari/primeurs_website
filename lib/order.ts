export function shortOrderId(id: string): string {
  return '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function splitClientNom(full: string | null | undefined): { prenom: string; nom: string } {
  const [prenom = '', ...rest] = (full || '').trim().split(/\s+/);
  return { prenom, nom: rest.join(' ') };
}
