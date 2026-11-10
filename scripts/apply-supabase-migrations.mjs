#!/usr/bin/env node
/**
 * Apply pending remote migrations that service-role PostgREST cannot run (DDL).
 *
 * Requires one of:
 *   SUPABASE_DB_PASSWORD  — Database settings → Database password
 *   DATABASE_URL          — full postgres connection string
 *
 *   pnpm apply:supabase-migrations
 *   node --env-file=apps/admin/.env.local ./scripts/apply-supabase-migrations.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "package.json"));

let pg;
try {
  pg = require("pg");
} catch {
  console.error(
    "Missing dependency `pg`. Install with: pnpm add -w -D pg",
  );
  process.exit(1);
}

const FILES = [
  "supabase/migrations/003_volunteer_approval_rls.sql",
  "supabase/migrations/004_activity_logs_append_only.sql",
  "supabase/migrations/005_volunteer_status_allow_service_role.sql",
  "supabase/migrations/005_points_system.sql",
  "supabase/migrations/006_volunteer_leaderboard.sql",
  "supabase/migrations/007_leaderboard_settlements.sql",
  "supabase/migrations/008_volunteer_help_feed.sql",
  "supabase/migrations/009_volunteer_help_feed_transcript.sql",
  "supabase/migrations/010_volunteer_accept_release.sql",
  "supabase/migrations/011_volunteer_complete_records.sql",
];

function buildConnectionConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } };

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !url) {
    console.error(
      "Missing SUPABASE_DB_PASSWORD (or DATABASE_URL) and NEXT_PUBLIC_SUPABASE_URL.\n" +
        "Add the DB password as a Cloud Agent secret, or paste 003/004 into the Supabase SQL Editor.",
    );
    process.exit(2);
  }
  const ref = new URL(url).hostname.split(".")[0];
  return {
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: `postgres.${ref}`,
    password,
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  const config = buildConnectionConfig();
  const client = new pg.Client(config);
  await client.connect();
  console.log("Connected; applying migrations…");
  for (const rel of FILES) {
    const full = resolve(root, rel);
    if (!existsSync(full)) {
      throw new Error(`Missing ${rel}`);
    }
    const sql = readFileSync(full, "utf8");
    console.log(`→ ${rel}`);
    await client.query(sql);
    console.log(`  OK`);
  }
  await client.end();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
