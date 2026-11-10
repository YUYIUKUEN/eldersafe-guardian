# ElderSafe Guardian — Full Manual Test Guide

Run this after pulling the latest branch and applying DB migrations.

## 0. One-time setup

```bash
pnpm install
cp apps/elder/.env.local.example apps/elder/.env.local
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# Fill the three Supabase keys in each file.
# Elder also needs: TEST_MODE=true and TEST_EMERGENCY_NUMBER=+85290000000
# Admin also needs: SUPABASE_DB_PASSWORD (for migrations) and NEXT_PUBLIC_ELDER_APP_URL=http://localhost:3001
```

Apply migrations (includes security hardening `012`):

```bash
pnpm apply:supabase-migrations
```

Automated checks:

```bash
pnpm acceptance:security-012
pnpm acceptance:admin-4.9
# optional: start admin first for the HTTP reachability check
pnpm --filter @eldersafe/admin run dev   # port 3003
ADMIN_BASE_URL=http://127.0.0.1:3003 pnpm acceptance:admin-4.9
pnpm acceptance:points-certificates   # if script is wired; else:
node --env-file=apps/admin/.env.local ./scripts/acceptance-points-certificates.mjs
```

Start all apps:

```bash
pnpm --filter @eldersafe/elder run dev      # http://localhost:3001
pnpm --filter @eldersafe/volunteer run dev  # http://localhost:3002
pnpm --filter @eldersafe/admin run dev      # http://localhost:3003
```

---

## 1. Security (must pass)

| # | Check | How |
|---|--------|-----|
| C0 | Volunteer cannot become admin | `pnpm acceptance:security-012` (PASS C0…) |
| C1 | Volunteer cannot `select` elders table | same script |
| C2 | Recording files not listable with volunteer JWT | same script |
| C3 | Volunteer cannot read `emergencies` / police tokens | same script |
| H2 | Volunteer cannot direct-update `help_requests` | same script |
| H4 | Volunteer cannot forge `actor_type=admin` logs | same script |
| Admin API | Unauthenticated `/api/elders` → 401 | `curl -i http://localhost:3003/api/elders` |

---

## 2. Elder app (`http://localhost:3001/zh-HK`)

1. Open site on a **phone-width** window (or real phone on same LAN / tunnel).
2. Complete onboarding (name / age / phone / address / emergency contact / optional health notes / consent).
3. Home should show **two primary buttons** (red emergency, blue assist) plus a **text link** for records.
4. **Blue assist**: record ≤60s → stop → listen → send. Expect status page “待接單”.
5. Confirm location permission; after send, location sharing can run while request is open.
6. **Red emergency**: confirm → 5s countdown with cancel → dials **test number** (not 999 while `TEST_MODE=true`) → track link created.
7. Open police `/track/{token}`: see name / age / address / map; **no health notes**.
8. End emergency with “我已安全”.
9. After a volunteer marks complete (section 3), open records → **確認完成** (optional stars). Volunteer should gain points only then.
10. Switch language EN / zh-HK; no missing message keys.
11. PWA: on HTTPS/localhost, browser “Add to Home Screen” / install should offer ElderSafe (manifest present).

Font / button spot-checks: body ≥20px, titles ≥28px, primary buttons ≥72px tall.

---

## 3. Volunteer app (`http://localhost:3002/zh-HK`)

1. Register a new volunteer → lands on **pending**.
2. In admin (section 4), approve the volunteer → pending page auto-redirects home.
3. Home help list shows pending requests (Realtime / refresh). Name+age visible; address/phone only after accept.
4. Open a request → play audio → **接單** → map with live location.
5. **標記完成** → elder must still confirm before points.
6. Optional: release before complete with a reason (2–500 chars).
7. Check **我的紀錄**, **排行榜**, **我的證書** (certificates appear after monthly settlement).
8. Log out; pending/rejected accounts must not see help data.

---

## 4. Admin app (`http://localhost:3003/zh-HK`)

1. Login with an admin Auth user (`profiles.role=admin`). Non-admin → unauthorized.
2. Dashboard: counts + 7-day chart; trigger an emergency and confirm Realtime red banner.
3. Users: search elders/volunteers; approve / reject / disable; CSV export.
4. Matches: open a help request with audio + trail; cancel / reassign with reason (2–500 chars).
5. Emergencies: open map + police link; resolve with note (2–500 chars).
6. Logs / engagement pages load with pagination.
7. Leaderboard: pick a month → settle Top 3 → preview / download PDF certificates.
8. Volunteer downloads the same certificate from their certificates page.

---

## 5. Rewards

1. Accept → volunteer complete → elder confirm (with/without rating).
2. Confirm twice → second attempt fails; only one `points` row.
3. Leaderboard order matches totals; monthly settlement cannot run twice for the same month.

---

## 6. Expected automated results (this branch)

- `pnpm acceptance:security-012` → **9/9**
- `pnpm acceptance:admin-4.9` (with admin running) → **20/20** (19/20 without HTTP)
- Points/certificates script → all checks ✓
- `pnpm --filter @eldersafe/elder|volunteer|admin run build` → success

---

## Troubleshooting

- **503 supabase_not_configured**: missing `.env.local` keys.
- **Volunteer cannot play audio after 012**: audio API must sign with service role (already in this branch); re-deploy / restart volunteer app.
- **RLS failures after pull**: re-run `pnpm apply:supabase-migrations`.
- **Emergency dials 999**: set `TEST_MODE=true` (only `false` enables 999).
