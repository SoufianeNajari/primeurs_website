-- Sprint 4.3 — Corrections advisor Supabase
-- 1) search_path figé sur le trigger articles_set_updated_at (évite l'injection de fonction via search_path mutable)
-- 2) RLS activée sur _migrations (table interne du runner, ne doit pas être exposée par PostgREST)

create or replace function articles_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table _migrations enable row level security;
