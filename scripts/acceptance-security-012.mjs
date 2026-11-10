#!/usr/bin/env node
/**
 * Live checks for migration 012 security hardening.
 *
 *   pnpm acceptance:security-012
 *   node --env-file=apps/admin/.env.local ./scripts/acceptance-security-012.mjs
 */
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/admin/package.json"));
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anon || !serviceKey) {
  console.error("Missing Supabase env");
  process.exit(2);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;

function ok(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const email = `sec012_${randomBytes(4).toString("hex")}@eldersafe.test`;
  const password = "SecTest1!Aa";

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    console.error("Could not create probe user", createError?.message);
    process.exit(1);
  }
  const userId = created.user.id;

  await service.from("profiles").upsert({
    id: userId,
    role: "volunteer",
    display_name: "Sec Probe",
  });
  await service.from("volunteers").upsert({
    id: userId,
    name: "Sec Probe",
    phone: "91234567",
    age: 30,
    service_areas: ["Test"],
    bio: "probe",
    approval_status: "approved",
  });

  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  ok("volunteer can sign in", !signInError, signInError?.message);

  const { error: roleError } = await userClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);
  ok("C0 role self-escalation blocked", Boolean(roleError), roleError?.message);

  const { data: profileAfter } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  ok("C0 role still volunteer", profileAfter?.role === "volunteer");

  const { data: elders, error: eldersError } = await userClient
    .from("elders")
    .select("id, health_notes, device_key_hash")
    .limit(5);
  ok(
    "C1 elders table not readable by volunteer",
    Boolean(eldersError) || !elders?.length,
    eldersError?.message ?? `rows=${elders?.length ?? 0}`,
  );

  const { data: emergencies, error: emError } = await userClient
    .from("emergencies")
    .select("id, police_share_token")
    .limit(5);
  ok(
    "C3 emergencies not readable by volunteer",
    Boolean(emError) || !emergencies?.length,
    emError?.message ?? `rows=${emergencies?.length ?? 0}`,
  );

  const { data: pending } = await service
    .from("help_requests")
    .select("id")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (pending?.id) {
    // PostgREST often returns no error when RLS filters out all rows.
    const { error: updError } = await userClient
      .from("help_requests")
      .update({ status: "completed" })
      .eq("id", pending.id);
    const { data: after } = await service
      .from("help_requests")
      .select("status")
      .eq("id", pending.id)
      .maybeSingle();
    ok(
      "H2 direct help_requests update blocked",
      after?.status === "pending",
      updError?.message ?? `status=${after?.status}`,
    );
  } else {
    ok("H2 skipped (no pending help request seed)", true);
  }

  const { error: logError } = await userClient.from("activity_logs").insert({
    actor_type: "admin",
    actor_id: userId,
    action: "forged.admin.action",
  });
  ok("H4 forged admin log blocked", Boolean(logError), logError?.message);

  const { error: selfLogError } = await userClient.from("activity_logs").insert({
    actor_type: "volunteer",
    actor_id: userId,
    action: "volunteer.security.probe",
  });
  ok("H4 volunteer self log allowed", !selfLogError, selfLogError?.message);

  const { data: listed, error: listError } = await userClient.storage
    .from("voice-recordings")
    .list("", { limit: 1 });
  ok(
    "C2 storage list denied or empty under RLS",
    Boolean(listError) || !listed?.length,
    listError?.message ?? `items=${listed?.length ?? 0}`,
  );

  await service.auth.admin.deleteUser(userId);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
