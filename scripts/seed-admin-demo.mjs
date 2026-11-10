#!/usr/bin/env node
/**
 * Seed ~1000+ demo rows for admin table performance checks.
 *
 * Usage (from repo root, with service-role credentials):
 *   pnpm seed:admin-demo
 *   pnpm seed:admin-demo -- --clean
 *
 * Creates:
 *   - 200 elders
 *   - 80 volunteer auth users + profiles + volunteers (mixed statuses)
 *   - 1000 help_requests
 *   - 40 emergencies
 *   - activity_logs for seed actions
 */
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../apps/admin/package.json"),
);
const { createClient } = require("@supabase/supabase-js");

const args = new Set(process.argv.slice(2));
const CLEAN = args.has("--clean");
const ELDER_COUNT = Number(process.env.SEED_ELDERS ?? 200);
const VOLUNTEER_COUNT = Number(process.env.SEED_VOLUNTEERS ?? 80);
const HELP_COUNT = Number(process.env.SEED_HELP_REQUESTS ?? 1000);
const EMERGENCY_COUNT = Number(process.env.SEED_EMERGENCIES ?? 40);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=apps/admin/.env.local scripts/seed-admin-demo.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEED_TAG = "seed-admin-demo";
const STATUSES = ["pending", "approved", "rejected", "disabled"];
const HELP_STATUSES = ["pending", "accepted", "completed", "cancelled"];

function hashDeviceKey(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function hkPhone(i) {
  return String(51000000 + (i % 40000000));
}

async function cleanSeed() {
  console.log("Cleaning previous seed rows…");
  const { data: elders } = await supabase
    .from("elders")
    .select("id")
    .like("health_notes", `%${SEED_TAG}%`);
  const elderIds = (elders ?? []).map((row) => row.id);
  if (elderIds.length) {
    await supabase.from("elders").delete().in("id", elderIds);
  }

  const { data: volunteers } = await supabase
    .from("volunteers")
    .select("id")
    .like("bio", `%${SEED_TAG}%`);
  for (const row of volunteers ?? []) {
    await supabase.auth.admin.deleteUser(row.id);
  }
  console.log(
    `Removed ${elderIds.length} seeded elders and ${(volunteers ?? []).length} seeded volunteers.`,
  );
}

async function seedElders() {
  const rows = [];
  for (let i = 0; i < ELDER_COUNT; i += 1) {
    const rawKey = `${SEED_TAG}-elder-${i}-${randomUUID()}`;
    rows.push({
      name: `Seed Elder ${String(i + 1).padStart(3, "0")}`,
      age: 65 + (i % 30),
      phone: hkPhone(i),
      address: `Seed Address ${i + 1}, Kowloon`,
      emergency_contact: `Contact ${i + 1} / ${hkPhone(i + 1000)}`,
      health_notes: `${SEED_TAG} elder`,
      language: i % 2 === 0 ? "zh-HK" : "en",
      device_key_hash: hashDeviceKey(rawKey),
      consent_version: "v1",
      consent_accepted_at: new Date().toISOString(),
      is_disabled: i % 17 === 0,
    });
  }

  const { data, error } = await supabase.from("elders").insert(rows).select("id");
  if (error) throw new Error(`elders insert failed: ${error.message}`);
  console.log(`Inserted ${data.length} elders`);
  return data.map((row) => row.id);
}

async function seedVolunteers() {
  const ids = [];
  for (let i = 0; i < VOLUNTEER_COUNT; i += 1) {
    const email = `seed.volunteer.${i + 1}.${Date.now()}@example.com`;
    const password = `SeedPass${i + 1}!Aa`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { seed: SEED_TAG },
    });
    if (error || !data.user) {
      throw new Error(`createUser failed: ${error?.message ?? "unknown"}`);
    }
    const id = data.user.id;
    const status = STATUSES[i % STATUSES.length];
    const { error: profileError } = await supabase.from("profiles").insert({
      id,
      role: "volunteer",
      display_name: `Seed Volunteer ${i + 1}`,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(id);
      throw new Error(`profile insert failed: ${profileError.message}`);
    }
    const { error: volunteerError } = await supabase.from("volunteers").insert({
      id,
      name: `Seed Volunteer ${i + 1}`,
      phone: hkPhone(2000 + i),
      age: 20 + (i % 40),
      service_areas: ["Sham Shui Po", "Yau Ma Tei"].slice(0, 1 + (i % 2)),
      bio: `${SEED_TAG} volunteer`,
      approval_status: status,
    });
    if (volunteerError) {
      await supabase.auth.admin.deleteUser(id);
      throw new Error(`volunteer insert failed: ${volunteerError.message}`);
    }
    ids.push({ id, status, email });
    if ((i + 1) % 20 === 0) console.log(`  volunteers ${i + 1}/${VOLUNTEER_COUNT}`);
  }
  console.log(`Inserted ${ids.length} volunteers`);
  return ids;
}

async function seedHelpRequests(elderIds, volunteers) {
  const approved = volunteers.filter((v) => v.status === "approved");
  const rows = [];
  const now = Date.now();
  for (let i = 0; i < HELP_COUNT; i += 1) {
    const status = HELP_STATUSES[i % HELP_STATUSES.length];
    const created = new Date(now - i * 36e5);
    const volunteer =
      status === "pending"
        ? null
        : (approved[i % Math.max(approved.length, 1)] ?? null);
    const acceptedAt =
      status === "pending" || !volunteer
        ? null
        : new Date(created.getTime() + 15 * 60e3).toISOString();
    const completedAt =
      status === "completed"
        ? new Date(created.getTime() + 90 * 60e3).toISOString()
        : null;
    const cancelledAt =
      status === "cancelled"
        ? new Date(created.getTime() + 40 * 60e3).toISOString()
        : null;

    rows.push({
      elder_id: elderIds[i % elderIds.length],
      audio_path: `voice-recordings/seed/${SEED_TAG}-${i}.webm`,
      status,
      latitude: 22.3 + (i % 50) * 0.001,
      longitude: 114.17 + (i % 50) * 0.001,
      volunteer_id: volunteer?.id ?? null,
      created_at: created.toISOString(),
      accepted_at: acceptedAt,
      completed_at: completedAt,
      cancelled_at: cancelledAt,
      elder_confirmed_at:
        status === "completed" && i % 3 === 0
          ? new Date(created.getTime() + 120 * 60e3).toISOString()
          : null,
    });
  }

  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("help_requests").insert(chunk);
    if (error) throw new Error(`help_requests insert failed: ${error.message}`);
    inserted += chunk.length;
    console.log(`  help_requests ${inserted}/${HELP_COUNT}`);
  }
  return inserted;
}

async function seedEmergencies(elderIds) {
  const rows = [];
  for (let i = 0; i < EMERGENCY_COUNT; i += 1) {
    const active = i % 4 === 0;
    const started = new Date(Date.now() - i * 72e5);
    rows.push({
      elder_id: elderIds[i % elderIds.length],
      status: active ? "active" : i % 5 === 0 ? "cancelled" : "resolved",
      started_at: started.toISOString(),
      ended_at: active
        ? null
        : new Date(started.getTime() + 45 * 60e3).toISOString(),
      police_share_token: `${SEED_TAG}-${randomUUID()}`,
      latitude: 22.31 + i * 0.001,
      longitude: 114.16 + i * 0.001,
    });
  }
  const { data, error } = await supabase
    .from("emergencies")
    .insert(rows)
    .select("id");
  if (error) throw new Error(`emergencies insert failed: ${error.message}`);
  console.log(`Inserted ${data.length} emergencies`);
  return data.length;
}

async function seedLogs(elderIds, volunteers) {
  const rows = [];
  for (let i = 0; i < 300; i += 1) {
    const volunteer = volunteers[i % volunteers.length];
    rows.push({
      actor_type: i % 3 === 0 ? "admin" : i % 3 === 1 ? "volunteer" : "elder",
      actor_id:
        i % 3 === 1
          ? volunteer.id
          : i % 3 === 2
            ? elderIds[i % elderIds.length]
            : null,
      action:
        i % 3 === 0
          ? "admin.volunteer.approve"
          : i % 3 === 1
            ? "volunteer.login"
            : "elder.help_request.create",
      target_type: i % 3 === 2 ? "elder" : "volunteer",
      target_id: i % 3 === 2 ? elderIds[i % elderIds.length] : volunteer.id,
      metadata: { seed: SEED_TAG, i },
    });
  }
  const { error } = await supabase.from("activity_logs").insert(rows);
  if (error) throw new Error(`activity_logs insert failed: ${error.message}`);
  console.log(`Inserted ${rows.length} activity_logs`);
}

async function main() {
  if (CLEAN) {
    await cleanSeed();
    if (args.has("--clean-only")) return;
  }

  console.log("Seeding admin demo data…");
  const elderIds = await seedElders();
  const volunteers = await seedVolunteers();
  await seedHelpRequests(elderIds, volunteers);
  await seedEmergencies(elderIds);
  await seedLogs(elderIds, volunteers);
  console.log("Done.");
  console.log(
    JSON.stringify(
      {
        elders: elderIds.length,
        volunteers: volunteers.length,
        helpRequests: HELP_COUNT,
        emergencies: EMERGENCY_COUNT,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
