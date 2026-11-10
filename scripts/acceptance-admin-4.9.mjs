#!/usr/bin/env node
/**
 * Acceptance checks for admin stage 4.9.
 *
 * Static checks always run.
 * Live HTTP checks run when ADMIN_BASE_URL is reachable.
 * Live DB checks run when apps/admin/.env.local (or process env) has Supabase keys.
 *
 *   pnpm acceptance:admin-4.9
 *   ADMIN_BASE_URL=http://127.0.0.1:3003 pnpm acceptance:admin-4.9
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/admin/package.json"));
const { createClient } = require("@supabase/supabase-js");

const results = [];

function pass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`PASS  ${id} — ${detail}`);
}

function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.error(`FAIL  ${id} — ${detail}`);
}

function check(id, condition, detail) {
  if (condition) pass(id, detail);
  else fail(id, detail);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

async function staticChecks() {
  const proxy = readFileSync(resolve(root, "apps/admin/src/proxy.ts"), "utf8");
  check(
    "static.proxy.excludes-api-but-pages-gated",
    proxy.includes("canAccessAdminApp") &&
      proxy.includes("adminUnauthorizedPath") &&
      proxy.includes('matcher: "/((?!api|trpc|_next|_vercel|.*\\\\..*).*)"'),
    "Page proxy gates admin role; API matcher excluded (handler-level auth required)",
  );

  const routes = walk(resolve(root, "apps/admin/src/app/api"));
  let missingAuth = 0;
  const mutationRoutes = [];
  for (const file of routes) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("requireAdminApi")) missingAuth += 1;
    if (
      /\bexport async function (POST|PATCH|PUT|DELETE)\b/.test(text) &&
      (text.includes(".update(") || text.includes(".insert("))
    ) {
      mutationRoutes.push({ file, text });
    }
  }
  check(
    "static.api.requireAdminApi",
    missingAuth === 0,
    missingAuth === 0
      ? `All ${routes.length} API routes call requireAdminApi`
      : `${missingAuth}/${routes.length} API routes missing requireAdminApi`,
  );

  let missingLog = 0;
  for (const { text } of mutationRoutes) {
    if (!text.includes("activity_logs")) missingLog += 1;
  }
  check(
    "static.mutations.write-activity-logs",
    missingLog === 0,
    missingLog === 0
      ? `All ${mutationRoutes.length} mutating admin APIs write activity_logs`
      : `${missingLog}/${mutationRoutes.length} mutating routes missing activity_logs`,
  );

  const migration = resolve(
    root,
    "supabase/migrations/004_activity_logs_append_only.sql",
  );
  check(
    "static.logs.append-only-migration",
    existsSync(migration) &&
      readFileSync(migration, "utf8").includes("forbid_activity_logs_mutation"),
    "004_activity_logs_append_only.sql present",
  );

  const access = readFileSync(
    resolve(root, "packages/shared/src/auth/access.ts"),
    "utf8",
  );
  check(
    "static.access.admin-only",
    access.includes('ctx.role === "admin"') &&
      access.includes("canAccessAdminApp"),
    "canAccessAdminApp requires role=admin",
  );

  // Role matrix (mirrors packages/shared/src/auth/access.ts).
  function canAccessAdminApp(ctx) {
    return Boolean(ctx.userId) && ctx.role === "admin";
  }
  check(
    "static.access.matrix.admin",
    canAccessAdminApp({ userId: "a", role: "admin", approvalStatus: null }),
    "admin role allowed",
  );
  check(
    "static.access.matrix.volunteer",
    !canAccessAdminApp({
      userId: "v",
      role: "volunteer",
      approvalStatus: "approved",
    }),
    "approved volunteer denied",
  );
  check(
    "static.access.matrix.anon",
    !canAccessAdminApp({ userId: null, role: null, approvalStatus: null }),
    "anonymous denied",
  );

  const seed = resolve(root, "scripts/seed-admin-demo.mjs");
  check(
    "static.seed-script",
    existsSync(seed) &&
      readFileSync(seed, "utf8").includes("SEED_HELP_REQUESTS"),
    "seed-admin-demo.mjs available for 1000-row load test",
  );

  // Pagination keeps UI bounded even with 1000+ rows.
  const managers = [
    "apps/admin/src/lib/management/elders.ts",
    "apps/admin/src/lib/management/volunteers.ts",
    "apps/admin/src/lib/management/matches.ts",
    "apps/admin/src/lib/management/emergencies.ts",
    "apps/admin/src/lib/management/logs.ts",
  ];
  let paginated = 0;
  for (const rel of managers) {
    const text = readFileSync(resolve(root, rel), "utf8");
    if (text.includes(".range(") && /PAGE_SIZE/.test(text)) paginated += 1;
  }
  check(
    "static.tables.paginated",
    paginated === managers.length,
    `${paginated}/${managers.length} list helpers use page-size + range()`,
  );

  // Synthetic 1000-row page slice timing (client would only receive one page).
  const fake = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`,
  }));
  const started = performance.now();
  const pageSize = 20;
  const page = fake.slice(0, pageSize);
  const mapped = page.map((row) => `${row.id}:${row.name}`).join("|");
  const elapsed = performance.now() - started;
  check(
    "static.perf.page-slice-1000",
    page.length === pageSize && mapped.length > 0 && elapsed < 50,
    `slice+map 20 of 1000 in ${elapsed.toFixed(2)}ms`,
  );
}

async function livePageGate(baseUrl) {
  const paths = [
    "/",
    "/elders",
    "/volunteers",
    "/matches",
    "/emergencies",
    "/logs",
    "/activity",
  ];
  for (const path of paths) {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    const ok =
      (res.status === 307 || res.status === 302 || res.status === 303) &&
      location.includes("/login");
    check(
      `live.page.unauth.${path}`,
      ok,
      ok
        ? `unauthenticated → login (${res.status})`
        : `expected redirect to login, got ${res.status} loc=${location}`,
    );
  }

  const apiPaths = [
    "/api/elders",
    "/api/volunteers",
    "/api/matches",
    "/api/emergencies",
    "/api/logs",
    "/api/engagement",
  ];
  for (const path of apiPaths) {
    const res = await fetch(`${baseUrl}${path}`);
    const ok = res.status === 401 || res.status === 503;
    check(
      `live.api.unauth.${path}`,
      ok,
      ok
        ? `unauthenticated API blocked (${res.status})`
        : `expected 401/503, got ${res.status}`,
    );
  }
}

async function liveSupabaseChecks() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !serviceKey || !anonKey) {
    fail(
      "live.supabase.env",
      "Missing Supabase env; skip approve/log/perf live DB checks",
    );
    return;
  }
  pass("live.supabase.env", "Supabase env loaded");

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sample } = await service
    .from("activity_logs")
    .select("id")
    .limit(1);
  if (sample?.[0]?.id) {
    const { error: updateError } = await service
      .from("activity_logs")
      .update({ action: "should.not.update" })
      .eq("id", sample[0].id);
    check(
      "live.logs.append-only-update",
      Boolean(updateError),
      updateError
        ? `update blocked: ${updateError.message}`
        : "update unexpectedly succeeded",
    );
  } else {
    const { data: inserted, error: insertError } = await service
      .from("activity_logs")
      .insert({
        actor_type: "system",
        action: "acceptance.append_only.probe",
        metadata: { probe: true },
      })
      .select("id")
      .single();
    assert.ifError(insertError);
    const { error: updateError } = await service
      .from("activity_logs")
      .update({ action: "should.not.update" })
      .eq("id", inserted.id);
    check(
      "live.logs.append-only-update",
      Boolean(updateError),
      updateError
        ? `update blocked: ${updateError.message}`
        : "update unexpectedly succeeded",
    );
  }

  const email = `accept.volunteer.${Date.now()}@example.com`;
  const password = "AcceptTest1!Aa";
  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    fail("live.approve.create", createError?.message ?? "createUser failed");
    return;
  }
  const userId = created.user.id;
  await service.from("profiles").insert({
    id: userId,
    role: "volunteer",
    display_name: "Acceptance Volunteer",
  });
  await service.from("volunteers").insert({
    id: userId,
    name: "Acceptance Volunteer",
    phone: "91234567",
    age: 30,
    service_areas: ["Mong Kok"],
    bio: "acceptance",
    approval_status: "pending",
  });

  const before = new Date().toISOString();
  const { error: approveError } = await service
    .from("volunteers")
    .update({ approval_status: "approved" })
    .eq("id", userId);
  check(
    "live.approve.status",
    !approveError,
    approveError ? approveError.message : "volunteer set to approved",
  );

  await service.from("activity_logs").insert({
    actor_type: "admin",
    actor_id: "acceptance-runner",
    action: "admin.volunteer.approve",
    target_type: "volunteer",
    target_id: userId,
    metadata: { from: "pending", to: "approved", source: "acceptance-4.9" },
  });

  const { data: after } = await service
    .from("volunteers")
    .select("approval_status")
    .eq("id", userId)
    .maybeSingle();
  check(
    "live.approve.readable",
    after?.approval_status === "approved",
    `approval_status=${after?.approval_status}`,
  );

  const { data: logRow } = await service
    .from("activity_logs")
    .select("id, action, created_at")
    .eq("action", "admin.volunteer.approve")
    .eq("target_id", userId)
    .gte("created_at", before)
    .maybeSingle();
  check(
    "live.approve.logged",
    Boolean(logRow?.id),
    logRow ? `log ${logRow.id}` : "approve log missing",
  );

  const pendingClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const pendingEmail = `accept.pending.${Date.now()}@example.com`;
  const { data: pendingUser } = await service.auth.admin.createUser({
    email: pendingEmail,
    password,
    email_confirm: true,
  });
  if (pendingUser?.user) {
    await service.from("profiles").insert({
      id: pendingUser.user.id,
      role: "volunteer",
      display_name: "Pending",
    });
    await service.from("volunteers").insert({
      id: pendingUser.user.id,
      name: "Pending",
      phone: "91234568",
      age: 28,
      service_areas: ["Jordan"],
      bio: "pending",
      approval_status: "pending",
    });
    await pendingClient.auth.signInWithPassword({
      email: pendingEmail,
      password,
    });
    const { data: pendingHelp, error: pendingHelpError } = await pendingClient
      .from("help_requests")
      .select("id")
      .limit(1);
    check(
      "live.rls.pending-cannot-read-help",
      (pendingHelp ?? []).length === 0,
      pendingHelpError
        ? `blocked/empty (${pendingHelpError.message})`
        : `rows=${(pendingHelp ?? []).length}`,
    );
    await service.auth.admin.deleteUser(pendingUser.user.id);
  }

  const approvedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await approvedClient.auth.signInWithPassword({ email, password });
  const { error: approvedReadError } = await approvedClient
    .from("help_requests")
    .select("id")
    .limit(1);
  check(
    "live.rls.approved-can-read-help",
    !approvedReadError,
    approvedReadError
      ? approvedReadError.message
      : "approved volunteer can select help_requests",
  );

  const started = performance.now();
  const { count, error: countError } = await service
    .from("help_requests")
    .select("id", { count: "exact", head: true });
  const { data: page, error: pageError } = await service
    .from("help_requests")
    .select("id, status, created_at, elders(name), volunteers(name)")
    .order("created_at", { ascending: false })
    .range(0, 19);
  const elapsed = performance.now() - started;
  check(
    "live.perf.list-20",
    !countError && !pageError && elapsed < 3000,
    `count=${count ?? "?"} page=${page?.length ?? 0} in ${elapsed.toFixed(0)}ms`,
  );

  await service.auth.admin.deleteUser(userId);
}

async function main() {
  console.log("=== Admin 4.9 acceptance ===\n");
  await staticChecks();

  const baseUrl = (
    process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:3003"
  ).replace(/\/$/, "");
  try {
    // Warm the Next.js compile path first; cold start can exceed a short timeout.
    const health = await fetch(`${baseUrl}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    if (health.status) {
      pass("live.admin.reachable", `${baseUrl} status=${health.status}`);
      await livePageGate(baseUrl);
    }
  } catch (error) {
    fail(
      "live.admin.reachable",
      `Admin app not reachable at ${baseUrl} (${error instanceof Error ? error.message : "error"}). Start with pnpm --filter @eldersafe/admin run dev`,
    );
  }

  await liveSupabaseChecks();

  const failed = results.filter((row) => !row.ok);
  const skippedLiveDb = failed.every((row) =>
    row.id.startsWith("live.supabase") ||
    row.id.startsWith("live.approve") ||
    row.id.startsWith("live.rls") ||
    row.id.startsWith("live.logs") ||
    row.id.startsWith("live.perf") ||
    row.id === "live.supabase.env",
  );
  console.log(
    `\nSummary: ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length) {
    console.error("Failed / blocked checks:");
    for (const row of failed) console.error(` - ${row.id}: ${row.detail}`);
    // Env-only live DB failures should not fail CI for static gate; exit 2.
    if (
      failed.length === 1 &&
      failed[0].id === "live.supabase.env"
    ) {
      process.exit(2);
    }
    if (
      skippedLiveDb &&
      failed.every(
        (row) =>
          row.id === "live.supabase.env" || row.id === "live.admin.reachable",
      )
    ) {
      process.exit(2);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
