# Env、Supabase 連線與權限保護

## A. 在 Supabase 後台找 Project URL / anon key

1. 打開 [Supabase Dashboard](https://supabase.com/dashboard) → 選專案  
2. 左側最下方 **Project Settings**（齒輪）  
3. 點 **API**  
4. 複製：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys** → `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY`（只放 server，勿 commit、勿給前端）

## B. 建立各 app 的 `.env.local`

在專案根目錄分別複製 example：

```bash
cp apps/elder/.env.local.example apps/elder/.env.local
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
```

編輯三份 `.env.local`，貼上同一個 Supabase 專案的 URL / keys。

`apps/elder/.env.local` 還需要：

```bash
TEST_MODE=true
TEST_EMERGENCY_NUMBER=+85290000000
```

- `TEST_MODE` 預設為測試模式（未設定或非 `false` 都是測試）。只有明確設 `TEST_MODE=false` 才會撥 `999`。
- 測試模式下撥打 `TEST_EMERGENCY_NUMBER`（不可設成 999）。

改完 env 後重啟 `pnpm dev`。

## C. 連線工具位置

| 用途 | 位置 |
| --- | --- |
| 共用 factory | `packages/shared/src/supabase/*` |
| 瀏覽器端 | 各 app `src/lib/supabase/browser.ts` |
| 伺服器端（cookie session） | 各 app `src/lib/supabase/server.ts` |
| Service role | `createSupabaseServiceClient()`（health / 長者後端） |
| 權限判斷 | `packages/shared/src/auth/*` |

Next.js 16 用 `src/proxy.ts`（舊稱 middleware）做路由保護。

## D. `/health` 測試頁

啟動後開啟：

- Elder：http://localhost:3001/health  
- Volunteer：http://localhost:3002/health  
- Admin：http://localhost:3003/health  

成功應顯示：**已連線資料庫**

## E. 權限規則（目前）

- **elder**：不登入、不做 Auth 保護  
- **volunteer**：
  - 公開：`/login`、`/register`、`/forgot-password`、`/reset-password`、`/health`
  - `pending`：只能進入 `/pending`（等待審批；Realtime 批准後自動跳主頁）
  - `rejected` / `disabled`：只能進入 `/account-status`
  - `approved`：可進入 `/`、`/profile` 等受保護頁（求助列表資料受 RLS 限制，只有 approved 可讀）
  - 否則導向 `/login`
- **admin**：除 `/login`、`/health` 外，需登入且 `profiles.role = admin`；否則導向 `/login`

義工註冊／登入已接上 Supabase Auth（電郵＋密碼）。註冊會建立 `profiles`（`role=volunteer`）與 `volunteers`（`approval_status=pending`），並寫入 `activity_logs`。  
請同時套用：
- `003_volunteer_approval_rls.sql`（`rejected`、approved-only 求助 RLS、`volunteers` Realtime）
- `004_volunteer_help_feed.sql`（`list_volunteer_help_feed()`、接單前遮罩住址／電話、收緊 locations／錄音讀取）
- `005_volunteer_help_feed_transcript.sql`（列表可選 `transcript`）
- `006_volunteer_accept_release.sql`（接單／放棄條件更新 RPC）
- `007_volunteer_complete_records.sql`（服務完成、逾 24h 管理員 helper）

錄音播放：伺服器簽 5 分鐘私有 Storage 連結；首次真正播放會寫 `activity_logs`（`volunteer.help_request.audio_play`）。  
接單：`accept_help_request` 只在仍是 `pending` 時成功；失敗回「已被其他義工接單」。放棄需原因並寫 `volunteer.help_request.release`。  
服務完成：寫 `completed_at`（狀態仍為 `accepted`＝等待長者確認）；長者確認後才 `completed` 並走積分 stub。逾 24 小時可用 `admin_list_overdue_elder_confirmations`／`admin_force_confirm_help_request`。

## F. 驗收清單（schema + 連線 + 權限）

| # | 項目 | 怎麼驗 | 預期 |
| --- | --- | --- | --- |
| 1 | Supabase 資料表 | Dashboard → **Table Editor** | 有 `elders`、`profiles`、`volunteers`、`help_requests`、`emergencies`、`locations`、`activity_logs`、`points`、`certificates` |
| 2 | `/health` 已連線 | 開 http://localhost:3001/health（以及 3002、3003） | 顯示「已連線資料庫」 |
| 3 | Admin 未登入被導走 | 無痕開 http://localhost:3003/（admin app，不是 `/admin` 路徑） | **307/導向** `/login` |

本機需在 `cursor/supabase-schema-design-2430` 分支，且三個 app 都有 `.env.local`。

## G. 三個手動測試情境

### 情境 1 — 未登入進義工首頁會被擋

1. 開無痕視窗  
2. 開 http://localhost:3002/  
3. **預期**：導向 http://localhost:3002/login  
4. 開 http://localhost:3002/health  
5. **預期**：可進入，顯示「已連線資料庫」（不需登入）

### 情境 2 — 審批狀態頁（pending / approved / disabled）

1. 註冊新義工 → **預期**：`/pending`（等待審批、聯絡電郵、登出；開 `/` 會被導回）  
2. 在 Table Editor 把 `approval_status` 改成 `approved`（保持 pending 頁開啟）→ **預期**：Realtime 自動跳到空白求助列表佔位頁  
3. 再改成 `disabled` → **預期**：自動／重新整理後到 `/account-status`（停用提示），開 `/` 或 `/profile` 都會被擋

### 情境 3 — 非 admin 進管理員站會被擋

1. 開無痕視窗 → http://localhost:3003/  
2. **預期**：導向 http://localhost:3003/login  
3. 用情境 2 的 volunteer session（若已登入）開 admin `/`  
4. **預期**：仍導向 `/login`（角色不是 admin）  
5. 僅當 `profiles.role = 'admin'` 的帳號才能進受保護頁
