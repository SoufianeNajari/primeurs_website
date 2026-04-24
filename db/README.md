# Migrations DB

Système simple de migrations SQL pour Supabase / Postgres.

## Setup (une fois)

1. Récupère ta **connection string Postgres** dans Supabase :
   Dashboard > Project Settings > Database > **Connection string** (onglet "URI").
   Format : `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

2. Ajoute-la à ton `.env.local` :
   ```
   SUPABASE_DB_URL=postgresql://postgres:TON_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```

   > ⚠️ Ne commit jamais cette URL. `.env.local` est déjà gitignored.

## Utilisation

```bash
npm run db:migrate        # applique les migrations en attente
npm run db:migrate:dry    # liste ce qui serait appliqué, sans rien exécuter
```

Le runner :
- crée automatiquement une table `_migrations` qui track ce qui a été joué
- exécute chaque migration dans une transaction (rollback en cas d'erreur)
- stocke un hash sha256 du fichier pour détecter les éditions a posteriori

## Convention

- Fichiers : `db/migrations/NNN_nom.sql` (NNN = entier sur 3 chiffres, croissant)
- Une migration = un changement atomique (DDL idempotent de préférence : `create table if not exists`, `alter table ... add column if not exists`, etc.)
- Une migration déjà appliquée ne doit JAMAIS être éditée : crée une nouvelle migration qui corrige.
