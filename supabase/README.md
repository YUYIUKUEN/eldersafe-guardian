# Supabase setup

共用 PostgreSQL schema（長者 / 義工 / 管理員三站同一後端）。

## 套用 migration

1. 在 [supabase.com](https://supabase.com) 建立專案。
2. 打開 **SQL Editor**，執行最新的 `migrations/001_init.sql`（整份一次跑完）。
   - 若你曾跑過舊版 draft（`device_key` PK、`disabled`、`admins`、`password_hash`），這支腳本會先 drop 那些表／policy 再重建，不要再跑舊 SQL。
3. 在 **Authentication → Users** 建立管理員帳號，再執行：

```sql
insert into public.profiles (id, role, display_name)
values ('<auth-user-uuid>', 'admin', 'System Admin');
```

4. 之後各 app 的 `.env.local` 會需要：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（只放 server，長者裝置密鑰流程用）

## Schema 摘要

| 表 | 用途 |
| --- | --- |
| `elders` | 長者資料；`device_key_hash` 識別；同意條款與停用 |
| `profiles` | 對應 `auth.users`；角色 `volunteer` / `admin` |
| `volunteers` | 義工擴充資料與審批狀態 |
| `help_requests` | 錄音求助單與各階段時間 |
| `emergencies` | 緊急事件與警方分享 token |
| `locations` | 即時位置（關聯求助單或緊急事件） |
| `activity_logs` | 操作審計 |
| `points` | 積分明細（長者確認後一單一筆） |
| `certificates` | 每月 Top 3 證書 metadata |

Storage buckets：`voice-recordings`（長者錄音）、`recordings`（舊名保留）、`certificates`（非公開）。  
若專案已跑過 `001_init.sql`，請再執行：
- `002_voice_recordings_bucket.sql`
- `003_volunteer_approval_rls.sql`（`rejected` 狀態、非 approved 不可讀求助資料、`volunteers` Realtime）

Realtime：`help_requests`、`emergencies`、`locations`、`volunteers`。

長者寫入走 Next.js API + **service role**（繞過 RLS）。義工／管理員用 Auth session + RLS。

Env、`.env.local`、`/health` 與權限手動測試：見 [`docs/AUTH_AND_ENV.md`](../docs/AUTH_AND_ENV.md)。
