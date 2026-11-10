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

### 手機用 ngrok 測試（尤其長者 app `:3001`）

Next.js 16 預設會攔截來自 tunnel 網域對 `/_next` 開發資源嘅請求。三個 app 嘅 `next.config.ts` 已加入：

```ts
allowedDevOrigins: [
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.app",
  "*.ngrok.io",
  "*.trycloudflare.com",
],
```

改完 config 後一定要重啟 `next dev`。若你嘅 ngrok 網域唔喺以上列表，把完整 hostname 加進去再重啟。

管理員 4.9 驗收／假資料（需 `apps/admin/.env.local`）：

```bash
pnpm seed:admin-demo          # ≥1000 筆 help_requests 等
pnpm acceptance:admin-4.9     # 靜態 + 未登入擋頁／API；有金鑰再驗批准／RLS／日誌
```

Live DB 若 RLS／append-only／approve 相關檢查失敗，確認遠端已套用：

- `supabase/migrations/003_volunteer_approval_rls.sql`
- `supabase/migrations/004_activity_logs_append_only.sql`
- `supabase/migrations/005_volunteer_status_allow_service_role.sql`

在 Supabase SQL Editor 跑完，或設定 Cloud Agent secret `SUPABASE_DB_PASSWORD` 後執行 `pnpm apply:supabase-migrations`，再重跑 acceptance。

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
- **admin**：
  - 公開：`/login`、`/health`（不開放註冊）
  - 已登入但非 admin：導向 `/unauthorized`（顯示沒有權限，可登出）
  - `profiles.role = admin`：可進入儀表板與左側導覽各頁

義工註冊／登入已接上 Supabase Auth（電郵＋密碼）。註冊會建立 `profiles`（`role=volunteer`）與 `volunteers`（`approval_status=pending`），並寫入 `activity_logs`。  
請同時套用 migration `003_volunteer_approval_rls.sql`（`rejected` 狀態、approved-only 求助 RLS、`volunteers` Realtime）。

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
3. 用義工帳號在 admin `/login` 登入  
4. **預期**：導向 `/unauthorized`，顯示「沒有權限」  
5. 僅當 `profiles.role = 'admin'` 的帳號才能進儀表板與側欄各頁
