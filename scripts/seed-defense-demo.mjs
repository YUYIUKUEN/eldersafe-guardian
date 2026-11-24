#!/usr/bin/env node
/**
 * Seed a small, story-ready dataset for thesis / viva demonstration.
 *
 * Usage (from repo root, with service-role credentials):
 *   pnpm seed:defense-demo
 *   pnpm seed:defense-demo -- --clean
 *   pnpm seed:defense-demo -- --clean-only
 *
 * Creates:
 *   - 3 elders (high / medium / low engagement this month)
 *   - 8 volunteers (mixed points, activity levels, one pending)
 *   - 30 help_requests (pending / accepted / completed / cancelled)
 *   - Points rows so the monthly leaderboard has a clear Top ranking
 *   - 2 emergencies (1 active + 1 resolved) with location trail
 *   - ~30 days of activity_logs
 *
 * Prints login emails/passwords for the demo volunteers when done.
 */
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";

const require = createRequire(
  resolve(import.meta.dirname, "../apps/admin/package.json"),
);
const { createClient } = require("@supabase/supabase-js");

const args = new Set(process.argv.slice(2));
const CLEAN = args.has("--clean") || args.has("--clean-only");
const CLEAN_ONLY = args.has("--clean-only");

const SEED_TAG = "seed-defense-demo";
const DEMO_PASSWORD = "DemoPass1!";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: pnpm seed:defense-demo\n" +
      "(uses --env-file=apps/admin/.env.local)",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ELDERS = [
  {
    key: "chan",
    name: "陳婆婆",
    age: 78,
    phone: "91230001",
    address: "深水埗南昌街 88 號 3 樓",
    emergency_contact: "陳小明 / 91231111",
    health_notes: `${SEED_TAG} elder high-activity`,
    /** Target engagement level for the current HK calendar month. */
    monthLevel: "high",
  },
  {
    key: "lee",
    name: "李伯",
    age: 82,
    phone: "91230002",
    address: "油麻地窩打老道 12 號",
    emergency_contact: "李美華 / 91232222",
    health_notes: `${SEED_TAG} elder medium-activity`,
    monthLevel: "medium",
  },
  {
    key: "wong",
    name: "黃太太",
    age: 75,
    phone: "91230003",
    address: "觀塘翠屏道 5 號",
    emergency_contact: "黃大文 / 91233333",
    health_notes: `${SEED_TAG} elder low-activity`,
    monthLevel: "low",
  },
];

/**
 * Eight volunteers with intentional points + activity story for the viva.
 * Points are awarded via confirmed help_requests in the current HK month.
 */
const VOLUNTEERS = [
  {
    key: "wang",
    name: "王志明",
    email: "demo.vol.wang@eldersafe.test",
    phone: "61000001",
    age: 28,
    areas: ["深水埗", "油麻地"],
    bio: `${SEED_TAG} Top 1 — 高活躍`,
    approval_status: "approved",
    /** Confirmed completed jobs this month (drives points + high activity). */
    confirmedJobs: 5,
    pointPattern: [20, 20, 15, 20, 15], // 90 pts
    acceptedOpen: 0,
  },
  {
    key: "chan",
    name: "陳美玲",
    email: "demo.vol.chan@eldersafe.test",
    phone: "61000002",
    age: 32,
    areas: ["觀塘"],
    bio: `${SEED_TAG} Top 2 — 高活躍`,
    approval_status: "approved",
    confirmedJobs: 4,
    pointPattern: [20, 15, 15, 15], // 65 pts
    acceptedOpen: 0,
  },
  {
    key: "lam",
    name: "林志強",
    email: "demo.vol.lam@eldersafe.test",
    phone: "61000003",
    age: 24,
    areas: ["荃灣"],
    bio: `${SEED_TAG} Top 3 — 中活躍`,
    approval_status: "approved",
    confirmedJobs: 3,
    pointPattern: [15, 15, 15], // 45 pts
    acceptedOpen: 0,
  },
  {
    key: "wong",
    name: "黃嘉欣",
    email: "demo.vol.wong@eldersafe.test",
    phone: "61000004",
    age: 27,
    areas: ["沙田"],
    bio: `${SEED_TAG} 排行第 4 — 中活躍`,
    approval_status: "approved",
    confirmedJobs: 2,
    pointPattern: [15, 15], // 30 pts
    acceptedOpen: 0,
  },
  {
    key: "cheung",
    name: "張偉豪",
    email: "demo.vol.cheung@eldersafe.test",
    phone: "61000005",
    age: 35,
    areas: ["深水埗"],
    bio: `${SEED_TAG} 排行第 5 — 中活躍`,
    approval_status: "approved",
    confirmedJobs: 1,
    pointPattern: [15], // 15 pts
    acceptedOpen: 1,
  },
  {
    key: "lau",
    name: "劉雅文",
    email: "demo.vol.lau@eldersafe.test",
    phone: "61000006",
    age: 22,
    areas: ["油麻地", "深水埗"],
    bio: `${SEED_TAG} 有接單未完成 — 中活躍`,
    approval_status: "approved",
    confirmedJobs: 0,
    pointPattern: [],
    acceptedOpen: 2,
  },
  {
    key: "chow",
    name: "周啟明",
    email: "demo.vol.chow@eldersafe.test",
    phone: "61000007",
    age: 40,
    areas: ["觀塘"],
    bio: `${SEED_TAG} 本月無活動 — 低活躍`,
    approval_status: "approved",
    confirmedJobs: 0,
    pointPattern: [],
    acceptedOpen: 0,
  },
  {
    key: "ho",
    name: "何小雯",
    email: "demo.vol.ho@eldersafe.test",
    phone: "61000008",
    age: 26,
    areas: ["荃灣"],
    bio: `${SEED_TAG} 待審批 — 未上排行榜`,
    approval_status: "pending",
    confirmedJobs: 0,
    pointPattern: [],
    acceptedOpen: 0,
  },
];

function hashDeviceKey(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

function hkParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function hkIso(year, month, day, hour = 12, minute = 0, second = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = String(second).padStart(2, "0");
  return new Date(
    `${year}-${month}-${day}T${hh}:${mm}:${ss}+08:00`,
  ).toISOString();
}

function addDays(parts, delta) {
  const base = new Date(
    `${parts.year}-${parts.month}-${parts.day}T12:00:00+08:00`,
  );
  base.setTime(base.getTime() + delta * 24 * 60 * 60 * 1000);
  return hkParts(base);
}

/** Spread an index across days 2..today of the current HK month. */
function dayInCurrentMonth(index, total) {
  const today = hkParts(new Date());
  const maxDay = Number(today.day);
  const startDay = 2;
  const span = Math.max(maxDay - startDay, 1);
  const day = startDay + ((index * 7 + 3) % (span + 1));
  const hour = 9 + (index % 10);
  const minute = (index * 13) % 60;
  return hkIso(today.year, today.month, String(day).padStart(2, "0"), hour, minute);
}

/** A day in the previous calendar month that is still within the last 30 days. */
function dayInPreviousMonthNearNow(index) {
  const today = hkParts(new Date());
  const prev = addDays(
    { year: today.year, month: today.month, day: "01" },
    -1 - (index % 5),
  );
  return hkIso(prev.year, prev.month, prev.day, 10 + (index % 8), (index * 7) % 60);
}

async function cleanSeed() {
  console.log("Cleaning previous defense-demo seed…");

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
  const taggedIds = new Set((volunteers ?? []).map((row) => row.id));
  for (const id of taggedIds) {
    await supabase.auth.admin.deleteUser(id);
  }

  // Remove leftover demo emails from partial failed runs (activity_logs are
  // append-only and cannot be deleted — see migration 004).
  const demoEmails = new Set(
    VOLUNTEERS.map((v) => v.email.toLowerCase()),
  );
  const { data: listed } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  for (const user of listed?.users ?? []) {
    if (
      user.email &&
      demoEmails.has(user.email.toLowerCase()) &&
      !taggedIds.has(user.id)
    ) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  console.log(
    `Removed ${elderIds.length} elders and ${taggedIds.size} tagged volunteers.`,
  );
  console.log(
    "(activity_logs are append-only; previous demo log rows are left in place.)",
  );
}

async function seedElders() {
  const deviceKeys = {};
  const rows = ELDERS.map((elder) => {
    const rawKey = `${SEED_TAG}-${elder.key}-${randomUUID()}`;
    deviceKeys[elder.key] = rawKey;
    return {
      name: elder.name,
      age: elder.age,
      phone: elder.phone,
      address: elder.address,
      emergency_contact: elder.emergency_contact,
      health_notes: elder.health_notes,
      language: "zh-HK",
      device_key_hash: hashDeviceKey(rawKey),
      consent_version: "2026-11-pdpo-v1",
      consent_accepted_at: dayInCurrentMonth(0, 1),
      is_disabled: false,
    };
  });

  const { data, error } = await supabase
    .from("elders")
    .insert(rows)
    .select("id, name");
  if (error) throw new Error(`elders insert failed: ${error.message}`);

  const byKey = {};
  for (let i = 0; i < ELDERS.length; i += 1) {
    byKey[ELDERS[i].key] = {
      id: data[i].id,
      name: data[i].name,
      deviceKey: deviceKeys[ELDERS[i].key],
      monthLevel: ELDERS[i].monthLevel,
    };
  }
  console.log(`Inserted ${data.length} elders`);
  return byKey;
}

async function seedVolunteers() {
  const created = [];
  for (const vol of VOLUNTEERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: vol.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { seed: SEED_TAG, name: vol.name },
    });
    if (error || !data.user) {
      throw new Error(
        `createUser ${vol.email} failed: ${error?.message ?? "unknown"}`,
      );
    }
    const id = data.user.id;
    const { error: profileError } = await supabase.from("profiles").insert({
      id,
      role: "volunteer",
      display_name: vol.name,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(id);
      throw new Error(`profile insert failed: ${profileError.message}`);
    }
    const { error: volunteerError } = await supabase.from("volunteers").insert({
      id,
      name: vol.name,
      phone: vol.phone,
      age: vol.age,
      service_areas: vol.areas,
      bio: vol.bio,
      approval_status: vol.approval_status,
      leaderboard_anonymous: false,
    });
    if (volunteerError) {
      await supabase.auth.admin.deleteUser(id);
      throw new Error(`volunteer insert failed: ${volunteerError.message}`);
    }
    created.push({ ...vol, id });
  }
  console.log(`Inserted ${created.length} volunteers`);
  return created;
}

/**
 * Build exactly 30 help_requests with mixed statuses and intentional
 * elder/volunteer engagement + points for the monthly leaderboard.
 */
async function seedHelpRequestsAndPoints(elders, volunteers) {
  const byKey = Object.fromEntries(volunteers.map((v) => [v.key, v]));
  const helpRows = [];
  const pointPlans = []; // filled after insert with help_request ids
  let seq = 0;

  const pushHelp = (row) => {
    helpRows.push(row);
    seq += 1;
  };

  // Elder engagement story (current HK month helpCount):
  //   陳婆婆 = high (>=3), 李伯 = medium (exactly 2), 黃太太 = low (0 this month).
  // 李伯 gets exactly two "awaiting elder confirm" tickets below; everything
  // else this month belongs to 陳婆婆. 黃太太 only gets prior-month padding.

  // --- Confirmed completed jobs (points) → all on 陳婆婆 this month ---
  for (const vol of volunteers) {
    for (let i = 0; i < vol.confirmedJobs; i += 1) {
      const createdAt = dayInCurrentMonth(seq, 30);
      const createdMs = new Date(createdAt).getTime();
      const acceptedAt = new Date(createdMs + 20 * 60e3).toISOString();
      // Long service (>30 min) when points include the +5 long-service bonus.
      const points = vol.pointPattern[i] ?? 10;
      const durationMin = points >= 15 ? 45 : 20;
      const completedAt = new Date(
        createdMs + (20 + durationMin) * 60e3,
      ).toISOString();
      const confirmedAt = new Date(
        createdMs + (20 + durationMin + 30) * 60e3,
      ).toISOString();
      const rating = points >= 20 ? 5 : points >= 15 ? 4 : null;

      pushHelp({
        elder_id: elders.chan.id,
        audio_path: `voice-recordings/${SEED_TAG}/confirmed-${vol.key}-${i}.webm`,
        status: "completed",
        latitude: 22.319 + (seq % 20) * 0.001,
        longitude: 114.169 + (seq % 20) * 0.001,
        volunteer_id: vol.id,
        created_at: createdAt,
        accepted_at: acceptedAt,
        completed_at: completedAt,
        cancelled_at: null,
        elder_confirmed_at: confirmedAt,
        elder_rating: rating,
        _points: points,
        _volunteer_id: vol.id,
        _points_at: confirmedAt,
      });
    }
  }

  // --- Open accepted (not completed) for medium activity → 陳婆婆 ---
  for (const vol of volunteers) {
    for (let i = 0; i < vol.acceptedOpen; i += 1) {
      const createdAt = dayInCurrentMonth(seq, 30);
      const createdMs = new Date(createdAt).getTime();
      pushHelp({
        elder_id: elders.chan.id,
        audio_path: `voice-recordings/${SEED_TAG}/accepted-${vol.key}-${i}.webm`,
        status: "accepted",
        latitude: 22.31 + (seq % 10) * 0.002,
        longitude: 114.17 + (seq % 10) * 0.002,
        volunteer_id: vol.id,
        created_at: createdAt,
        accepted_at: new Date(createdMs + 15 * 60e3).toISOString(),
        completed_at: null,
        cancelled_at: null,
        elder_confirmed_at: null,
        elder_rating: null,
      });
    }
  }

  // --- Pending (waiting for volunteer) → 陳婆婆 ---
  for (let i = 0; i < 5; i += 1) {
    pushHelp({
      elder_id: elders.chan.id,
      audio_path: `voice-recordings/${SEED_TAG}/pending-${i}.webm`,
      status: "pending",
      latitude: 22.322 + i * 0.001,
      longitude: 114.168 + i * 0.001,
      volunteer_id: null,
      created_at: dayInCurrentMonth(seq, 30),
      accepted_at: null,
      completed_at: null,
      cancelled_at: null,
      elder_confirmed_at: null,
      elder_rating: null,
    });
  }

  // --- Exactly 2 tickets for 李伯 (medium engagement) ---
  // Completed by volunteer, waiting for elder confirm (no points yet).
  for (let i = 0; i < 2; i += 1) {
    const vol = byKey.cheung;
    const createdAt = dayInCurrentMonth(seq + 40, 30);
    const createdMs = new Date(createdAt).getTime();
    pushHelp({
      elder_id: elders.lee.id,
      audio_path: `voice-recordings/${SEED_TAG}/await-confirm-${i}.webm`,
      status: "completed",
      latitude: 22.315,
      longitude: 114.172,
      volunteer_id: vol.id,
      created_at: createdAt,
      accepted_at: new Date(createdMs + 10 * 60e3).toISOString(),
      completed_at: new Date(createdMs + 50 * 60e3).toISOString(),
      cancelled_at: null,
      elder_confirmed_at: null,
      elder_rating: null,
    });
  }

  // --- Cancelled → 陳婆婆 ---
  for (let i = 0; i < 3; i += 1) {
    const createdAt = dayInCurrentMonth(seq, 30);
    const createdMs = new Date(createdAt).getTime();
    pushHelp({
      elder_id: elders.chan.id,
      audio_path: `voice-recordings/${SEED_TAG}/cancelled-${i}.webm`,
      status: "cancelled",
      latitude: 22.318,
      longitude: 114.165,
      volunteer_id: null,
      created_at: createdAt,
      accepted_at: null,
      completed_at: null,
      cancelled_at: new Date(createdMs + 40 * 60e3).toISOString(),
      elder_confirmed_at: null,
      elder_rating: null,
    });
  }

  // Pad to exactly 30 with 黃太太 tickets dated in the *previous* month
  // (still within last-30-day trend, but month engagement stays low).
  while (helpRows.length < 30) {
    const i = helpRows.length;
    pushHelp({
      elder_id: elders.wong.id,
      audio_path: `voice-recordings/${SEED_TAG}/pad-wong-${i}.webm`,
      status: "cancelled",
      latitude: 22.3 + i * 0.001,
      longitude: 114.16 + i * 0.001,
      volunteer_id: null,
      created_at: dayInPreviousMonthNearNow(i),
      accepted_at: null,
      completed_at: null,
      cancelled_at: dayInPreviousMonthNearNow(i),
      elder_confirmed_at: null,
      elder_rating: null,
    });
  }

  if (helpRows.length > 30) {
    helpRows.length = 30;
  }

  // Strip internal planning fields before insert.
  const insertRows = helpRows.map(
    ({ _points, _volunteer_id, _points_at, ...row }) => row,
  );

  const { data: inserted, error } = await supabase
    .from("help_requests")
    .insert(insertRows)
    .select("id, status, elder_confirmed_at, volunteer_id");
  if (error) throw new Error(`help_requests insert failed: ${error.message}`);

  const pointRows = [];
  for (let i = 0; i < helpRows.length; i += 1) {
    const plan = helpRows[i];
    if (plan._points && plan._volunteer_id && inserted[i]) {
      pointRows.push({
        volunteer_id: plan._volunteer_id,
        help_request_id: inserted[i].id,
        points: plan._points,
        created_at: plan._points_at,
      });
    }
  }

  if (pointRows.length) {
    const { error: pointsError } = await supabase
      .from("points")
      .insert(pointRows);
    if (pointsError) {
      throw new Error(`points insert failed: ${pointsError.message}`);
    }
  }

  const statusCounts = inserted.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `Inserted ${inserted.length} help_requests (${JSON.stringify(statusCounts)}) and ${pointRows.length} points rows`,
  );
  return { helpRequests: inserted, pointCount: pointRows.length };
}

async function seedEmergencies(elders) {
  const activeStarted = dayInCurrentMonth(3, 10);
  const resolvedStarted = dayInCurrentMonth(8, 10);
  const resolvedEnded = new Date(
    new Date(resolvedStarted).getTime() + 35 * 60e3,
  ).toISOString();

  const rows = [
    {
      elder_id: elders.chan.id,
      status: "active",
      started_at: activeStarted,
      ended_at: null,
      police_share_token: `${SEED_TAG}-active-${randomUUID()}`,
      latitude: 22.331,
      longitude: 114.162,
    },
    {
      elder_id: elders.wong.id,
      status: "resolved",
      started_at: resolvedStarted,
      ended_at: resolvedEnded,
      police_share_token: `${SEED_TAG}-resolved-${randomUUID()}`,
      latitude: 22.312,
      longitude: 114.225,
    },
  ];

  const { data, error } = await supabase
    .from("emergencies")
    .insert(rows)
    .select("id, status, police_share_token, elder_id");
  if (error) throw new Error(`emergencies insert failed: ${error.message}`);

  const active = data.find((row) => row.status === "active");
  if (active) {
    const trail = [];
    const base = new Date(activeStarted).getTime();
    for (let i = 0; i < 6; i += 1) {
      trail.push({
        elder_id: elders.chan.id,
        emergency_id: active.id,
        help_request_id: null,
        latitude: 22.331 + i * 0.0003,
        longitude: 114.162 + i * 0.0002,
        accuracy_m: 12 + i,
        recorded_at: new Date(base + i * 90e3).toISOString(),
      });
    }
    const { error: locError } = await supabase.from("locations").insert(trail);
    if (locError) {
      throw new Error(`locations insert failed: ${locError.message}`);
    }
  }

  console.log(`Inserted ${data.length} emergencies (+ location trail)`);
  return data;
}

async function seedMonthOfLogs(elders, volunteers, helpMeta, emergencies) {
  const today = hkParts(new Date());
  const rows = [];
  const actions = [
    "elder.register",
    "elder.help_request.create",
    "elder.help_request.confirm",
    "elder.emergency.create",
    "elder.emergency.end",
    "elder.location.share",
    "volunteer.register",
    "volunteer.login",
    "volunteer.help_request.accept",
    "volunteer.help_request.complete",
    "volunteer.help_request.audio_play",
    "volunteer.leaderboard.view",
    "admin.login",
    "admin.volunteer.approve",
    "admin.emergency.resolve",
    "admin.help.cancel",
  ];

  // One structured day-by-day log for ~30 calendar days (including prior month tail).
  for (let dayOffset = 29; dayOffset >= 0; dayOffset -= 1) {
    const day = addDays(today, -dayOffset);
    const logsPerDay = dayOffset % 5 === 0 ? 4 : 2;
    for (let n = 0; n < logsPerDay; n += 1) {
      const i = rows.length;
      const action = actions[i % actions.length];
      const hour = 8 + ((i * 3) % 12);
      const minute = (i * 11) % 60;
      const createdAt = hkIso(
        day.year,
        day.month,
        day.day,
        hour,
        minute,
        (i * 7) % 60,
      );

      let actor_type = "system";
      let actor_id = null;
      let target_type = null;
      let target_id = null;

      if (action.startsWith("elder.")) {
        const elder =
          action.includes("emergency") && !action.includes("create")
            ? elders.wong
            : i % 3 === 0
              ? elders.lee
              : elders.chan;
        actor_type = "elder";
        actor_id = elder.id;
        target_type = action.includes("emergency") ? "emergency" : "help_request";
        target_id =
          action.includes("emergency") && emergencies[0]
            ? emergencies[0].id
            : helpMeta.helpRequests[i % helpMeta.helpRequests.length]?.id;
      } else if (action.startsWith("volunteer.")) {
        const vol = volunteers[i % Math.min(volunteers.length, 7)];
        actor_type = "volunteer";
        actor_id = vol.id;
        target_type = action.includes("help_request") ? "help_request" : "volunteer";
        target_id = action.includes("help_request")
          ? helpMeta.helpRequests[i % helpMeta.helpRequests.length]?.id
          : vol.id;
      } else if (action.startsWith("admin.")) {
        actor_type = "admin";
        actor_id = null;
        target_type = action.includes("volunteer")
          ? "volunteer"
          : action.includes("emergency")
            ? "emergency"
            : "help_request";
        target_id = action.includes("volunteer")
          ? volunteers[volunteers.length - 1].id
          : action.includes("emergency")
            ? emergencies[1]?.id
            : helpMeta.helpRequests[i % helpMeta.helpRequests.length]?.id;
      }

      rows.push({
        actor_type,
        actor_id,
        action,
        target_type,
        target_id,
        metadata: {
          seed: SEED_TAG,
          day: `${day.year}-${day.month}-${day.day}`,
          note: "defense demo log",
        },
        created_at: createdAt,
      });
    }
  }

  // Chunk inserts for safety.
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("activity_logs").insert(chunk);
    if (error) throw new Error(`activity_logs insert failed: ${error.message}`);
  }
  console.log(`Inserted ${rows.length} activity_logs across ~30 days`);
  return rows.length;
}

function printSummary(elders, volunteers, helpMeta, emergencies, logCount) {
  const pointsByVol = Object.fromEntries(
    volunteers.map((v) => [
      v.name,
      (v.pointPattern ?? []).reduce((a, b) => a + b, 0),
    ]),
  );

  console.log("\n========== Defense demo ready ==========");
  console.log(
    JSON.stringify(
      {
        elders: Object.values(elders).map((e) => ({
          name: e.name,
          monthEngagement: e.monthLevel,
        })),
        volunteers: volunteers.map((v) => ({
          name: v.name,
          email: v.email,
          password: DEMO_PASSWORD,
          status: v.approval_status,
          expectedPoints: pointsByVol[v.name],
          confirmedJobs: v.confirmedJobs,
        })),
        helpRequests: helpMeta.helpRequests.length,
        pointsRows: helpMeta.pointCount,
        emergencies: emergencies.map((e) => ({
          status: e.status,
          policeShareToken: e.police_share_token,
        })),
        activityLogs: logCount,
      },
      null,
      2,
    ),
  );
  console.log("\nVolunteer login password (all):", DEMO_PASSWORD);
  console.log("Suggested viva pages:");
  console.log("  Admin leaderboard : http://localhost:3003/zh-HK/leaderboard");
  console.log("  Admin activity    : http://localhost:3003/zh-HK/activity");
  console.log("  Admin logs        : http://localhost:3003/zh-HK/logs");
  console.log("  Admin emergencies : http://localhost:3003/zh-HK/emergencies");
  console.log("  Volunteer board   : http://localhost:3002/zh-HK/leaderboard");
  console.log("Script: docs/DEFENSE_DEMO_SCRIPT.md");
}

async function main() {
  if (CLEAN) {
    await cleanSeed();
    if (CLEAN_ONLY) return;
  }

  console.log("Seeding defense demo data…");
  const elders = await seedElders();
  const volunteers = await seedVolunteers();
  const helpMeta = await seedHelpRequestsAndPoints(elders, volunteers);
  const emergencies = await seedEmergencies(elders);
  const logCount = await seedMonthOfLogs(
    elders,
    volunteers,
    helpMeta,
    emergencies,
  );
  printSummary(elders, volunteers, helpMeta, emergencies, logCount);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
