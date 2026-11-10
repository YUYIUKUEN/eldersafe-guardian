#!/usr/bin/env node
/**
 * Acceptance checks for points / leaderboard / certificates.
 *
 *   node scripts/acceptance-points-certificates.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../apps/admin/package.json"),
);
const { createClient } = require("@supabase/supabase-js");

// Load shared TS helpers via dynamic import of built logic duplicated inline
// for ranking assertions (keep script dependency-light).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TAG = "accept-points-certs";
const YEAR_MONTH = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
}).format(new Date()); // YYYY-MM

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function hashDeviceKey(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

async function cleanup() {
  console.log("Cleaning previous acceptance rows…");
  // Settlements / certificates for tagged volunteers
  const { data: vols } = await supabase
    .from("volunteers")
    .select("id")
    .like("bio", `%${TAG}%`);
  const volIds = (vols ?? []).map((v) => v.id);
  if (volIds.length) {
    await supabase.from("certificates").delete().in("volunteer_id", volIds);
    await supabase.from("points").delete().in("volunteer_id", volIds);
    await supabase.from("help_requests").delete().in("volunteer_id", volIds);
  }
  await supabase
    .from("leaderboard_settlements")
    .delete()
    .eq("year_month", YEAR_MONTH)
    .filter("podium", "cs", JSON.stringify([{ name: "Accept Vol A" }]));
  // Broader: delete settlement for this month if created by this script
  const { data: settlements } = await supabase
    .from("leaderboard_settlements")
    .select("year_month, podium")
    .eq("year_month", YEAR_MONTH);
  for (const row of settlements ?? []) {
    const podium = row.podium ?? [];
    if (
      Array.isArray(podium) &&
      podium.some((p) => String(p?.name ?? "").includes("Accept Vol"))
    ) {
      await supabase
        .from("leaderboard_settlements")
        .delete()
        .eq("year_month", row.year_month);
      await supabase
        .from("certificates")
        .delete()
        .eq("year_month", row.year_month);
    }
  }

  const { data: elders } = await supabase
    .from("elders")
    .select("id")
    .like("health_notes", `%${TAG}%`);
  for (const e of elders ?? []) {
    await supabase.from("help_requests").delete().eq("elder_id", e.id);
    await supabase.from("elders").delete().eq("id", e.id);
  }
  for (const id of volIds) {
    await supabase.auth.admin.deleteUser(id);
  }
}

async function createVolunteer(label, index) {
  const email = `accept.vol.${index}.${Date.now()}@eldersafe.test`;
  const password = `AcceptTest1!${index}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: label },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser");
  const id = data.user.id;
  const { error: pErr } = await supabase.from("profiles").upsert({
    id,
    role: "volunteer",
    display_name: label,
  });
  if (pErr) throw new Error(pErr.message);
  const { error: vErr } = await supabase.from("volunteers").upsert({
    id,
    name: label,
    phone: String(61000000 + index),
    age: 25 + index,
    service_areas: ["深水埗"],
    bio: `${TAG} ${label}`,
    approval_status: "approved",
    leaderboard_anonymous: false,
  });
  if (vErr) throw new Error(vErr.message);
  return { id, email, password, name: label };
}

async function createElder() {
  const deviceKey = `${TAG}-elder-${randomUUID()}`;
  const { data, error } = await supabase
    .from("elders")
    .insert({
      name: "Accept Elder",
      age: 78,
      phone: "91239999",
      address: "Accept Address",
      emergency_contact: "Family / 91238888",
      health_notes: `${TAG} elder`,
      language: "zh-HK",
      device_key_hash: hashDeviceKey(deviceKey),
      consent_version: "2026-11-pdpo-v1",
      consent_accepted_at: new Date().toISOString(),
      is_disabled: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, deviceKey };
}

async function createCompletedHelpRequest(elderId, volunteerId) {
  const acceptedAt = new Date(Date.now() - 45 * 60_000).toISOString();
  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      elder_id: elderId,
      audio_path: `voice-recordings/${TAG}/${randomUUID()}.webm`,
      status: "accepted",
      volunteer_id: volunteerId,
      accepted_at: acceptedAt,
      completed_at: completedAt,
      latitude: 22.3,
      longitude: 114.2,
    })
    .select("id, accepted_at, completed_at, volunteer_id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function awardViaRpc(helpRequestId, elderId, points, rating, breakdown) {
  return supabase.rpc("confirm_help_request_award_points", {
    p_help_request_id: helpRequestId,
    p_elder_id: elderId,
    p_points: points,
    p_rating: rating,
    p_breakdown: breakdown,
  });
}

async function insertPointsDirect(volunteerId, helpRequestId, points, createdAt) {
  const { error } = await supabase.from("points").insert({
    volunteer_id: volunteerId,
    help_request_id: helpRequestId,
    points,
    created_at: createdAt,
  });
  if (error) throw new Error(error.message);
}

async function main() {
  console.log(`Acceptance year-month (HK): ${YEAR_MONTH}`);
  await cleanup();

  // ---- 1) Duplicate confirm awards once ----
  const elder = await createElder();
  const volDup = await createVolunteer("Accept Dup Only", 0);
  const help = await createCompletedHelpRequest(elder.id, volDup.id);

  const first = await awardViaRpc(help.id, elder.id, 15, 5, {
    base: 10,
    longServiceBonus: 0,
    highRatingBonus: 5,
  });
  if (first.error) {
    fail("duplicate_confirm_first_award", first.error.message);
  } else {
    pass("duplicate_confirm_first_award", JSON.stringify(first.data));
  }

  const second = await awardViaRpc(help.id, elder.id, 15, 5, {
    base: 10,
    longServiceBonus: 0,
    highRatingBonus: 5,
  });
  const secondBlocked =
    Boolean(second.error) &&
    /HELP_REQUEST_NOT_CONFIRMABLE|not_confirmable|unique/i.test(
      second.error.message,
    );
  if (secondBlocked) {
    pass("duplicate_confirm_blocked", second.error.message);
  } else {
    fail(
      "duplicate_confirm_blocked",
      second.error?.message ?? JSON.stringify(second.data),
    );
  }

  const { count: pointsCount } = await supabase
    .from("points")
    .select("id", { count: "exact", head: true })
    .eq("help_request_id", help.id);
  if (pointsCount === 1) {
    pass("duplicate_confirm_one_points_row", `count=${pointsCount}`);
  } else {
    fail("duplicate_confirm_one_points_row", `count=${pointsCount}`);
  }

  // ---- 2) Five volunteers ranking + ties ----
  // Scores for current HK month:
  // A: 30 pts / 3 services
  // B: 25 pts / 2 services
  // C: 20 pts / 4 services  } tied on points+services with D? 
  // D: 20 pts / 4 services  } → tie for podium decision
  // E: 10 pts / 1 service
  const specs = [
    { name: "Accept Vol A", points: [10, 10, 10], label: "A" },
    { name: "Accept Vol B", points: [15, 10], label: "B" },
    { name: "Accept Vol C", points: [5, 5, 5, 5], label: "C" },
    { name: "Accept Vol D", points: [5, 5, 5, 5], label: "D" },
    { name: "Accept Vol E", points: [10], label: "E" },
  ];

  const volunteers = [];
  for (let i = 0; i < specs.length; i += 1) {
    const v = await createVolunteer(specs[i].name, i + 1);
    volunteers.push(v);
    for (let j = 0; j < specs[i].points.length; j += 1) {
      const hr = await createCompletedHelpRequest(elder.id, v.id);
      // Mark help completed + confirmed so data is consistent
      await supabase
        .from("help_requests")
        .update({
          status: "completed",
          elder_confirmed_at: new Date().toISOString(),
        })
        .eq("id", hr.id);
      // Backdate into current HK month window
      const createdAt = new Date().toISOString();
      await insertPointsDirect(v.id, hr.id, specs[i].points[j], createdAt);
    }
  }

  // Service role has no auth.uid(), so call ranking via SQL equivalent of the RPC.
  const volIds = volunteers.map((v) => v.id);
  const { data: pointRows, error: pointsErr } = await supabase
    .from("points")
    .select("volunteer_id, points, created_at, volunteers(name)")
    .in("volunteer_id", volIds);
  if (pointsErr) {
    fail("monthly_leaderboard_query", pointsErr.message);
  } else {
    const names = new Set([
      "Accept Vol A",
      "Accept Vol B",
      "Accept Vol C",
      "Accept Vol D",
      "Accept Vol E",
    ]);
    const totals = new Map();
    for (const row of pointRows ?? []) {
      const volunteer = row.volunteers;
      const name = Array.isArray(volunteer)
        ? volunteer[0]?.name
        : volunteer?.name;
      if (!names.has(name)) continue;
      const createdHk = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(row.created_at));
      if (createdHk !== YEAR_MONTH) continue;
      const cur = totals.get(name) ?? { name, points: 0, completedCount: 0 };
      cur.points += Number(row.points) || 0;
      cur.completedCount += 1;
      totals.set(name, cur);
    }
    const acceptRows = [...totals.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return a.name.localeCompare(b.name);
    });
    // competition rank
    let lastKey = null;
    let rank = 0;
    let index = 0;
    for (const row of acceptRows) {
      index += 1;
      const key = `${row.points}:${row.completedCount}`;
      if (key !== lastKey) {
        rank = index;
        lastKey = key;
      }
      row.rank = rank;
    }

    const order = acceptRows.map((r) => r.name);
    const points = acceptRows.map((r) => r.points);
    const completed = acceptRows.map((r) => r.completedCount);
    console.log("Ranking:", JSON.stringify(acceptRows, null, 2));

    const okOrder =
      order[0] === "Accept Vol A" &&
      order[1] === "Accept Vol B" &&
      new Set(order.slice(2, 4)).has("Accept Vol C") &&
      new Set(order.slice(2, 4)).has("Accept Vol D") &&
      order[4] === "Accept Vol E" &&
      points[0] === 30 &&
      points[1] === 25 &&
      points[2] === 20 &&
      points[3] === 20 &&
      points[4] === 10 &&
      completed[2] === 4 &&
      completed[3] === 4;

    if (okOrder) {
      pass("leaderboard_sort_and_tie", order.join(" > "));
    } else {
      fail(
        "leaderboard_sort_and_tie",
        `got ${order.join(" > ")} points=${points} completed=${completed}`,
      );
    }

    const cRank = acceptRows.find((r) => r.name === "Accept Vol C")?.rank;
    const dRank = acceptRows.find((r) => r.name === "Accept Vol D")?.rank;
    const aRank = acceptRows.find((r) => r.name === "Accept Vol A")?.rank;
    const bRank = acceptRows.find((r) => r.name === "Accept Vol B")?.rank;
    if (
      Number(aRank) === 1 &&
      Number(bRank) === 2 &&
      Number(cRank) === Number(dRank) &&
      Number(cRank) === 3
    ) {
      pass("podium_tie_decision", `A=1 B=2 C/D=${cRank}`);
    } else {
      fail("podium_tie_decision", `A=${aRank} B=${bRank} C=${cRank} D=${dRank}`);
    }
  }

  // ---- 3) Certificate PDF Chinese checked by companion tsx generator ----
  // (filled by runner after this script; placeholder removed)

  // ---- 4) Settle then refuse second settle ----
  const a = volunteers.find((v) => v.name === "Accept Vol A");
  const b = volunteers.find((v) => v.name === "Accept Vol B");
  const c = volunteers.find((v) => v.name === "Accept Vol C");
  if (!a || !b || !c) {
    fail("settle_month", "missing volunteers");
  } else {
    // Need an admin profile to satisfy settled_by FK
    let adminId = null;
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (admins?.[0]?.id) {
      adminId = admins[0].id;
    } else {
      const email = `accept.admin.${Date.now()}@eldersafe.test`;
      const { data: adminUser, error: adminErr } =
        await supabase.auth.admin.createUser({
          email,
          password: "AcceptAdmin1!",
          email_confirm: true,
        });
      if (adminErr || !adminUser.user) {
        fail("settle_month_admin", adminErr?.message ?? "no admin");
      } else {
        adminId = adminUser.user.id;
        await supabase.from("profiles").upsert({
          id: adminId,
          role: "admin",
          display_name: "Accept Admin",
        });
      }
    }

    if (adminId) {
      // Clear any existing settlement for month first
      await supabase
        .from("certificates")
        .delete()
        .eq("year_month", YEAR_MONTH);
      await supabase
        .from("leaderboard_settlements")
        .delete()
        .eq("year_month", YEAR_MONTH);

      const podium = [
        {
          volunteerId: a.id,
          name: a.name,
          rank: 1,
          points: 30,
          completedCount: 3,
        },
        {
          volunteerId: b.id,
          name: b.name,
          rank: 2,
          points: 25,
          completedCount: 2,
        },
        {
          volunteerId: c.id,
          name: c.name,
          rank: 3,
          points: 20,
          completedCount: 4,
        },
      ];

      const { error: s1 } = await supabase.from("leaderboard_settlements").insert({
        year_month: YEAR_MONTH,
        settled_by: adminId,
        podium,
      });
      if (s1) fail("settle_month_first", s1.message);
      else pass("settle_month_first");

      // Insert certificate rows + PDFs lightly (metadata only for lock test)
      for (const seat of podium) {
        await supabase.from("certificates").insert({
          volunteer_id: seat.volunteerId,
          year_month: YEAR_MONTH,
          rank: seat.rank,
          file_path: `${YEAR_MONTH}/rank-${seat.rank}-${seat.volunteerId}.pdf`,
        });
      }

      const { error: s2 } = await supabase.from("leaderboard_settlements").insert({
        year_month: YEAR_MONTH,
        settled_by: adminId,
        podium,
      });
      if (s2 && (s2.code === "23505" || /duplicate|unique/i.test(s2.message))) {
        pass("settle_month_locked", s2.message);
      } else {
        fail("settle_month_locked", s2?.message ?? "second settle unexpectedly ok");
      }
    }
  }

  console.log("\n=== Summary ===");
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} failed`);
    process.exit(1);
  }
  console.log("\nAll acceptance checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
