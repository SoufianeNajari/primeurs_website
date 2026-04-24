#!/usr/bin/env node
// Runner de migrations SQL pour Supabase / Postgres.
//
// Utilisation :
//   npm run db:migrate           -> applique toutes les migrations non encore jouées
//   npm run db:migrate -- --dry  -> montre ce qui serait joué sans rien exécuter
//
// Convention de nommage : db/migrations/NNN_nom.sql (NNN = entier croissant).
// Chaque migration s'exécute dans une transaction unique. Le hash sha256 est
// stocké pour détecter les éditions ultérieures d'une migration déjà jouée.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

require('dotenv').config({ path: '.env.local', quiet: true });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const DRY_RUN = process.argv.includes('--dry');

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) die(`Dossier introuvable: ${MIGRATIONS_DIR}`);
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((f) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    return { name: f, sql, hash };
  });
}

async function main() {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    die(
      'Variable SUPABASE_DB_URL (ou DATABASE_URL) manquante dans .env.local.\n' +
        '  Récupère-la dans Supabase Dashboard > Project Settings > Database > Connection string (URI).\n' +
        '  Format : postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres',
    );
  }

  const migrations = loadMigrations();
  if (migrations.length === 0) {
    log('Aucune migration à jouer.');
    return;
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists _migrations (
        name text primary key,
        hash text not null,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows: applied } = await client.query('select name, hash from _migrations');
    const appliedMap = new Map(applied.map((r) => [r.name, r.hash]));

    let pending = 0;
    for (const m of migrations) {
      if (appliedMap.has(m.name)) {
        if (appliedMap.get(m.name) !== m.hash) {
          console.warn(
            `\x1b[33m!\x1b[0m ${m.name} a déjà été appliquée mais son contenu a changé depuis. Elle ne sera pas rejouée — crée plutôt une nouvelle migration.`,
          );
        }
        continue;
      }

      pending++;
      if (DRY_RUN) {
        console.log(`  [dry] ${m.name}`);
        continue;
      }

      console.log(`… ${m.name}`);
      await client.query('begin');
      try {
        await client.query(m.sql);
        await client.query(
          'insert into _migrations (name, hash) values ($1, $2)',
          [m.name, m.hash],
        );
        await client.query('commit');
        log(`${m.name} appliquée.`);
      } catch (err) {
        await client.query('rollback');
        die(`${m.name} a échoué: ${err.message}`);
      }
    }

    if (pending === 0) log('Base déjà à jour.');
    else if (DRY_RUN) log(`${pending} migration(s) en attente (dry run).`);
    else log(`${pending} migration(s) appliquée(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => die(err.stack || err.message));
