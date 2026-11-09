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
- **volunteer**：除 `/login`、`/register`、`/health` 外，需登入且 `profiles.role = volunteer` 且 `volunteers.approval_status = approved`；否則導向 `/login`  
- **admin**：除 `/login`、`/health` 外，需登入且 `profiles.role = admin`；否則導向 `/login`  

登入畫面尚未實作（只有 stub 頁）。

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

### 情境 2 — 未批准義工不能進受保護頁

1. 在 Supabase Auth 建立一個 user  
2. 插入：

```sql
insert into public.profiles (id, role, display_name)
values ('<user-uuid>', 'volunteer', 'Test Volunteer');

insert into public.volunteers (id, name, phone, age, approval_status)
values ('<user-uuid>', 'Test Volunteer', '90000000', 30, 'pending');
```

3. （之後有登入 UI 時）用此帳登入後開 `/`  
4. **預期**：因 `pending`，proxy 導向 `/login`  
5. 把狀態改成 `approved` 後再進 `/` → **預期**：可進入

### 情境 3 — 非 admin 進管理員站會被擋

1. 開無痕視窗 → http://localhost:3003/  
2. **預期**：導向 http://localhost:3003/login  
3. 用情境 2 的 volunteer session（若已登入）開 admin `/`  
4. **預期**：仍導向 `/login`（角色不是 admin）  
5. 僅當 `profiles.role = 'admin'` 的帳號才能進受保護頁
