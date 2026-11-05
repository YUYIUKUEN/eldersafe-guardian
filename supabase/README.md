# Supabase setup (Stage 5)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `migrations/001_init.sql`.
3. Copy project URL, anon key, and service role key into each app’s `.env.local`:
   - `apps/elder/.env.local`
   - `apps/volunteer/.env.local`
   - `apps/admin/.env.local`
4. Restart `pnpm dev:elder`, `pnpm dev:volunteer`, `pnpm dev:admin`.

If env keys are still placeholders, the apps automatically fall back to the local `.data/store.json` file store.

## What the migration creates

- Tables: elders, volunteers, admins, help_requests, emergencies, activity_logs
- Storage bucket: `recordings`
- Realtime on `help_requests` and `emergencies`
- Default admin: `admin@eldersafe.local` / `admin123`
