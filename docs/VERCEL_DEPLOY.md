# 把三個網站分別部署到 Vercel

同一個 GitHub 儲存庫 `eldersafe-guardian`，建立**三個** Vercel 專案，各自指定 Root Directory，得到三個正式網址。三站共用同一個 Supabase 專案。

| Vercel 專案建議名稱 | Root Directory | 用途 |
| --- | --- | --- |
| `eldersafe-elder` | `apps/elder` | 長者 Web App |
| `eldersafe-volunteer` | `apps/volunteer` | 義工網站 |
| `eldersafe-admin` | `apps/admin` | 管理員網站 |

**重要安全：** 部署時 `TEST_MODE` **必須維持 `true`**。只有你明確說要示範（真的撥 999）時才改成 `false`。平常示範與手機測試都用測試號碼。

---

## 事前檢查

1. 程式已推到 GitHub（例如 `main`）：https://github.com/YUYIUKUEN/eldersafe-guardian  
2. Supabase 專案已建好，migration 已套用（見 `supabase/README.md`）  
3. 準備好這三個值（Supabase → **Project Settings** → **API**）：
   - Project URL  
   - `anon` `public` key  
   - `service_role` `secret` key（**絕不可**貼到前端或公開地方）

---

## 步驟 1：連接 GitHub 並建立第一個專案（長者）

1. 打開 [Vercel](https://vercel.com) → 登入（建議用 **Continue with GitHub**）。  
2. 若尚未授權：允許 Vercel 存取你的 GitHub 帳號／選擇 `YUYIUKUEN/eldersafe-guardian`。  
3. **Add New…** → **Project** → 選 `eldersafe-guardian` → **Import**。  
4. 專案設定：
   - **Project Name**：`eldersafe-elder`（可自訂）  
   - **Framework Preset**：Next.js（通常會自動偵測）  
   - **Root Directory**：撳 **Edit** → 選 `apps/elder` → **Continue**  
   - **Node.js Version**：20.x（Project Settings → General，若預設不是 20 請改）  
5. **Build & Development Settings**（需要 Override 時再開）：

| 欄位 | 建議值 |
| --- | --- |
| Install Command | `cd ../.. && pnpm install` |
| Build Command | `pnpm build`（或留空用預設 `next build`） |
| Output Directory | 留空（Next.js 預設即可） |

> 為何 Install 要 `cd ../.. && pnpm install`？  
> Root Directory 是 `apps/elder`，但 `@eldersafe/shared` 在 monorepo 根目錄的 `packages/shared`。必須在**倉庫根目錄**跑 `pnpm install` 才裝得到 workspace 套件。

6. **先唔好撳 Deploy**——下一步先填環境變數（或 Deploy 後立刻在 Settings 補齊再 Redeploy）。建議**先填環境變數再第一次 Deploy**。

---

## 步驟 2：環境變數（公開 vs 私密）

在該 Vercel 專案 → **Settings** → **Environment Variables**。  
每個變數都勾選 **Production**（示範／作業用通常也勾 Preview）。

### 怎樣分「公開」同「私密」？

| 類型 | 前綴／例子 | 會唔會出現喺瀏覽器？ | Vercel 點處理 |
| --- | --- | --- | --- |
| **公開** | `NEXT_PUBLIC_*` | **會**（打進前端 JS） | 正常新增即可；唔好放秘密 |
| **私密（Server only）** | 無 `NEXT_PUBLIC_` 前綴 | **唔會**（只喺 Vercel／Next server） | 正常新增；**千萬唔好**改名加 `NEXT_PUBLIC_` |

`anon` key 雖然叫 public，但仍然只應放喺環境變數，唔好 commit 入 git。真正危險嘅係 `service_role`：有佢可以繞過 RLS。

---

### A. 長者專案 `eldersafe-elder`（Root: `apps/elder`）

| 變數名 | 值（例子） | 公開／私密 | 說明 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | **公開** | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`（anon） | **公開** | 瀏覽器／Auth 用；受 RLS 限制 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`（service_role） | **私密** | 長者裝置密鑰 API、上傳等；**禁止**加 `NEXT_PUBLIC_` |
| `TEST_MODE` | `true` | **私密** | **必須 `true`**；只有你明確要求示範時先改 `false` |
| `TEST_EMERGENCY_NUMBER` | `+85290000000`（你部手機或測試號） | **私密** | 測試模式撥號；**不可**設成 `999` |

---

### B. 義工專案 `eldersafe-volunteer`（Root: `apps/volunteer`）

| 變數名 | 公開／私密 | 說明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **公開** | 同一個 Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **公開** | 同一個 anon |
| `SUPABASE_SERVICE_ROLE_KEY` | **私密** | 錄音 signed URL 等 server 用途 |

義工站**唔需要** `TEST_MODE`／`TEST_EMERGENCY_NUMBER`。

---

### C. 管理員專案 `eldersafe-admin`（Root: `apps/admin`）

| 變數名 | 公開／私密 | 說明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **公開** | 同一個 Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **公開** | 同一個 anon |
| `SUPABASE_SERVICE_ROLE_KEY` | **私密** | 管理 API／證書等 |
| `NEXT_PUBLIC_ELDER_APP_URL` | **公開** | 長者**正式**網址，例如 `https://eldersafe-elder.vercel.app`（唔好留 `localhost`） |
| `CERTIFICATE_ORG_NAME` | **私密**（可選） | 證書上機構名，例如 `ElderSafe Guardian` |

> `NEXT_PUBLIC_ELDER_APP_URL`：第一次 deploy 長者站後先有正式網址。可先填預估名，Deploy 完確認實際網址後改準再 Redeploy admin。

---

## 步驟 3：建立第二、第三個 Vercel 專案

重複「Import 同一個 repo」，但改設定：

### 義工

1. **Add New…** → **Project** → 再 Import **同一個** `eldersafe-guardian`  
2. Project Name：`eldersafe-volunteer`  
3. Root Directory：`apps/volunteer`  
4. Install：`cd ../.. && pnpm install`  
5. 填上表 B 的環境變數 → **Deploy**

### 管理員

1. 再 Import 一次同一個 repo  
2. Project Name：`eldersafe-admin`  
3. Root Directory：`apps/admin`  
4. Install：`cd ../.. && pnpm install`  
5. 填上表 C 的環境變數（`NEXT_PUBLIC_ELDER_APP_URL` 用長者正式網址）→ **Deploy**

完成後你會有三個網址，例如：

```text
https://eldersafe-elder.vercel.app
https://eldersafe-volunteer.vercel.app
https://eldersafe-admin.vercel.app
```

（實際 subdomain 以 Vercel 顯示為準；亦可之後綁自己的 domain。）

---

## 步驟 4：在 Supabase 設定三個正式網址嘅允許網域

錄音、定位、登入、重設密碼都依賴正確嘅網域白名單。

1. 打開 [Supabase Dashboard](https://supabase.com/dashboard) → 你嘅專案  
2. **Authentication** → **URL Configuration**  
3. **Site URL**（建議用義工站正式網址，因為主要 Auth 流程喺度）：  
   `https://eldersafe-volunteer.vercel.app`  
4. **Redirect URLs** 加入（每行一個；用你實際三個網址）：

```text
https://eldersafe-elder.vercel.app/**
https://eldersafe-volunteer.vercel.app/**
https://eldersafe-volunteer.vercel.app/**/reset-password
https://eldersafe-admin.vercel.app/**
```

若 Vercel 有 Preview 部署（`*.vercel.app` 其他 subdomain），可額外加：

```text
https://*-eldersafe-volunteer.vercel.app/**
```

（Supabase 對 wildcard 支援以 Dashboard 提示為準；唔支援就逐個 Preview 網址加。）

5. **Save**  
6. （可選）**Authentication** → **Providers** → Email 已啟用；確認無需額外改動。  
7. 改完 Redirect URLs 後，若 Auth 仍轉錯網址，喺義工／admin 站 **Redeploy** 一次（通常唔使）。

### 部署後快速驗連線

用手機或電腦打開：

- `https://<elder>/health`  
- `https://<volunteer>/health`  
- `https://<admin>/health`  

預期顯示已連線資料庫（文案視語言檔）。若 503／未設定：檢查該 Vercel 專案環境變數有冇齊、改完有冇 **Redeploy**。

---

## 步驟 5：Deploy 成功後檢查清單

| # | 檢查 | 預期 |
| --- | --- | --- |
| 1 | 三個 Vercel 專案 Build 都係綠色 | 成功 |
| 2 | `/health` × 3 | 已連線 |
| 3 | 長者首頁 | 兩大掣（緊急紅／陪伴藍） |
| 4 | 義工 `/login` | 可開；未登入開 `/` 會去 login |
| 5 | 管理員 `/login` | 可開；非 admin 登入會「沒有權限」 |
| 6 | Admin 緊急／警方連結 | 指向長者正式網域的 `/track/...`（唔係 localhost） |
| 7 | 長者緊急撥號 | 撥 **測試號碼**，**唔係 999**（`TEST_MODE=true`） |

---

## 步驟 6：用手機測試錄音同定位（HTTPS 正式網）

Vercel 網址已係 **HTTPS**，符合瀏覽器對麥克風／定位嘅要求（本機要用 localhost 或 tunnel）。

### 準備

1. 手機同電腦連網正常（唔使同一 Wi‑Fi，正式網公開可達即可）。  
2. **iPhone**：用 **Safari**（系統對麥克風／定位較穩定）。  
3. **Android**：用 **Chrome**。  
4. 確認 Vercel 長者專案 `TEST_MODE=true`。  
5. 建議先用電腦開一次長者頁，確認 `/health` 正常，再換手機。

### A. 錄音（藍色「需要人陪伴／協助」）

1. 手機瀏覽器打開：`https://<你的-elder網址>/zh-HK`  
2. 若首次使用：完成基本資料登記。  
3. 撳藍色大掣 → 進入錄音介面。  
4. 瀏覽器會問「允許使用麥克風」→ 撳 **允許**。  
5. 撳開始錄音 → 講幾句（≤60 秒）→ 停止 → 可重聽 → 送出。  
6. 預期：出現「待接單」狀態；之後用已批准義工帳號喺義工站應見到該單並可播放錄音。

**若無麥克風權限：**

- iOS：設定 → Safari → 麥克風 → 允許；或重新載入頁面再授權。  
- Android：網站權限 → 麥克風 → 允許。  
- 唔好用純 HTTP 或內嵌 WebView（例如某些訊息 App 內置瀏覽器可能唔穩）；用系統 Safari／Chrome 開連結。

### B. 定位（送出求助／緊急後持續分享）

1. 同一長者頁，送出藍色求助（或走緊急流程但**唔好**喺測試時設 `TEST_MODE=false`）。  
2. 瀏覽器問定位 → **允許**（iOS 可選「允許一次」或「使用 App 期間」）。  
3. 預期：求助進行中會持續更新位置；義工接單後地圖可見；緊急則警方 `/track/{token}` 可見地圖。  
4. 可喺戶外或窗邊測，室內 GPS 可能較慢或不準。

**若無定位：**

- iOS：設定 → 私隱與保安 → 定位服務 → 開；Safari 網站要允許。  
- Android：位置資訊開啟；Chrome 網站權限允許位置。  
- 確認用嘅係 `https://` 嘅 Vercel 網址，唔係 `http://` IP。

### C. 建議一次過嘅短流程（手機）

1. 手機開長者站 → 藍色掣錄音＋允許定位 → 送出。  
2. 另一部手機或電腦開義工站 → 登入已批准帳號 → 見新單 → 播錄音 → 接單 → 睇地圖。  
3. 管理員站確認配對總覽／日誌有紀錄。  
4. （可選）長者紅掣：確認倒數會撥**測試號**；取消倒數確保安全。

---

## 改環境變數之後

喺 Vercel **Settings → Environment Variables** 改完值（例如更正 `NEXT_PUBLIC_ELDER_APP_URL`）後，必須：

**Deployments** → 最新一次右邊 ⋯ → **Redeploy**

只改變數而唔 Redeploy，線上程式仍用舊值。

---

## `TEST_MODE` 規則（請遵守）

| 情況 | `TEST_MODE` | 撥號 |
| --- | --- | --- |
| 日常開發、Vercel 作業、手機測試、課堂練習 | **`true`（必須）** | `TEST_EMERGENCY_NUMBER` |
| 你**明確**說要正式示範／真撥 999 | 先改 `false` → Redeploy | `999` |
| 示範完 | 立刻改回 `true` → Redeploy | 測試號 |

未設定或任何非 `false` 的值，程式都會當測試模式（安全預設）。

---

## 常見問題

| 問題 | 處理 |
| --- | --- |
| Build 失敗：`workspace:*` / 找不到 `@eldersafe/shared` | Install Command 改成 `cd ../.. && pnpm install`；確認 Root Directory 係 `apps/...` |
| Build 失敗：pnpm 版本 | 根目錄 `package.json` 已有 `"packageManager": "pnpm@10.33.4"`；Vercel 會跟住用 |
| `/health` 未連線 | 檢查該專案三個 Supabase 變數；改完要 Redeploy |
| 義工重設密碼跳錯網域 | Supabase Redirect URLs 加入義工正式網址 `/**/reset-password` |
| 管理員警方連結係 localhost | 設 `NEXT_PUBLIC_ELDER_APP_URL` 為長者正式 `https://...` 再 Redeploy |
| 緊急撥咗 999 | 立刻確認 `TEST_MODE=true` 並 Redeploy；唔好喺未講明示範時設 `false` |
| 手機無錄音／定位提示 | 用 Safari／Chrome 開 HTTPS；檢查系統權限；唔好用冇權限嘅 in-app 瀏覽器 |

更完整嘅功能手動測試見 [`MANUAL_TEST_GUIDE.md`](./MANUAL_TEST_GUIDE.md)。Env 本機說明見 [`AUTH_AND_ENV.md`](./AUTH_AND_ENV.md)。
