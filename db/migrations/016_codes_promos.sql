-- Migration 016 — Sprint P0.1 : codes promotionnels
--
-- Table codes_promos (clé/valeur) + colonnes commandes.code_promo et
-- commandes.reduction_cents pour traçabilité. Approche key/value sur
-- le code lui-même pour permettre des codes manuels (ex: BIENVENUE10,
-- ETE2026) sans gestion d'inscriptions clients.
--
-- Types de réduction supportés :
--   - 'pourcent'      : valeur = % entier (ex: 10 = -10%)
--   - 'montant_fixe'  : valeur = cents (ex: 500 = -5€)
--
-- Limites usage :
--   - usage_max NULL = illimité, sinon plafond global
--   - usage_actuel incrémenté côté serveur à chaque commande validée
--   - expire_at NULL = pas de date d'expiration
--   - actif = false → code désactivé (annulation manuelle)

create table if not exists public.codes_promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('pourcent', 'montant_fixe')),
  valeur integer not null check (valeur > 0),
  reduction_max_cents integer,
  min_panier_cents integer not null default 0,
  usage_max integer,
  usage_actuel integer not null default 0,
  expire_at timestamptz,
  actif boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists codes_promos_code_idx on public.codes_promos (code) where actif = true;

alter table public.codes_promos enable row level security;

-- Lecture publique : seulement les codes actifs et non expirés. Permet la
-- validation côté browser via supabasePublic sans exposer les codes inactifs.
create policy "codes_promos lecture publique des codes actifs"
  on public.codes_promos for select
  using (
    actif = true
    and (expire_at is null or expire_at > now())
    and (usage_max is null or usage_actuel < usage_max)
  );

-- Pas de policy write : seul service_role (admin / API) écrit.

-- Colonnes de traçabilité sur commandes
alter table public.commandes
  add column if not exists code_promo text,
  add column if not exists reduction_cents integer not null default 0;

-- Code de lancement BIENVENUE10 : -10% plafonné à 5€, panier min 30€, illimité.
-- Le plafond protège des paniers énormes (le but est de désamorcer la 1ʳᵉ
-- commande, pas de subventionner un panier de 200€).
insert into public.codes_promos (code, type, valeur, reduction_max_cents, min_panier_cents, usage_max, actif, description)
values ('BIENVENUE10', 'pourcent', 10, 500, 3000, null, true, 'Bienvenue chez Primeur Chez Vous — 10% sur la 1ʳᵉ commande (max 5€)')
on conflict (code) do nothing;
