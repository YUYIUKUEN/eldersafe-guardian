# ElderSafe Guardian 開發進度

> 本檔案追蹤畢業專題各階段完成情況。  
> 標記說明：`[x]` = 已完成　`[ ]` = 未開始／進行中

**目前進度：階段 1–5 核心流程已接上（含義工求助列表／接單／完成）；階段 2 缺 PWA；階段 6 未開始。**  
**2026-11-10 全流程修復**：已併入義工求助列表／接單／地圖／完成／紀錄（migrations `008`–`011`）；修 PDF barrel 全站 500、`NEXT_PUBLIC_*` 登入、錄音 `audio_path` 桶前綴、長者語言切換 session gate、義工 login Suspense。E2E：建立求助 → 接單 → 完成 → 確認加分 → 管理員 OK。  
**2026-11-10 義工地圖**：修復接單／地圖頁 `Can't resolve 'leaflet'`（確認 `leaflet` 依賴、client-only 載入地圖、README 重裝說明）。  
**2026-11-10 Admin 排行榜**：修復「排行榜與證書」未能載入（`get_monthly_leaderboard` 被 service_role 叫時 FORBIDDEN；改用 admin session 讀取 + migration `013` 允許 service_role）。

---

## 階段 0：專案規格與文件起步

- [x] 建立 `PROJECT_SPEC.md`（完整產品規格：三獨立網站 monorepo）
- [x] 建立 `PROGRESS.md`（階段 0 至階段 6 進度清單）
- [x] 確認技術棧與環境需求（Node.js、pnpm、Supabase、Vercel）
- [x] 建立永遠套用的 Cursor 規則 `.cursor/rules/project.mdc`
- [x] 確認 Git 已初始化、根目錄 `.gitignore` 排除 `.env.local` 等密鑰檔
- [x] 準備各 app 的 `.env.local.example`（不含真實金鑰）

---

## 階段 1：Monorepo 骨架與共用套件

- [x] 初始化 pnpm workspace monorepo
- [x] 建立三個獨立 Next.js 專案：`apps/elder`、`apps/volunteer`、`apps/admin`（TypeScript、Tailwind CSS、App Router、ESLint、`src/`）
- [x] 建立 `packages/shared`（共用語言檔與 locale 設定）
- [x] 設定 next-intl（en / zh-HK，預設 zh-HK；頁面右上角語言切換）
- [x] 各 app 空白首頁顯示雙語標題；長者 app 採手機直向外觀
- [x] 三個 app 可分別／同時啟動（ports：3001 / 3002 / 3003；根目錄 `pnpm dev`）
- [x] 本階段不含資料庫或登入功能

---

## 階段 2：長者 Web App（`apps/elder`）

- [x] 長者專用設計系統（手機直向）：`BigButton`、`BigText`、`Page`、大按鈕語言切換、頂部大返回
- [x] 緊急紅／一般藍高對比色票（白字與深色字均達 WCAG AA）
- [x] `/design-test` 元件展示頁（無功能／無資料庫連接）
- [x] 首次分步資料輸入（一題一頁）+ 確認頁知情同意勾選
- [x] 伺服器 API 建立 `elders`、裝置密鑰雜湊、原始密鑰只存 localStorage
- [x] 有效密鑰直接進首頁；`/profile` 修改我的資料
- [x] 驗證錯誤用大字紅色語言說明；行為寫入 `activity_logs`（無 Supabase 時用記憶體 fallback）
- [x] 首頁兩大按鈕（緊急紅／陪伴藍）+「我的求助紀錄」；點擊暫導空白頁
- [x] 藍色按鈕全螢幕錄音（MediaRecorder、iOS/Android 格式偵測、最長 60 秒）
- [x] 錄音上傳 `voice-recordings`、建立 `help_requests`（待接單）+ 位置 + `activity_logs`（裝置密鑰 API）
- [x] 送出後大字提示並導向求助狀態頁
- [x] 求助進行中持續分享位置（`watchPosition`、10 秒節流寫入 `locations`、可停止；結束自動停）
- [x] `locations` 已在 Realtime publication（義工／管理員接收端之後階段接）
- [x] 紅色緊急按鈕：首頁按一下再確認（避免 iPhone 長按預覽）；全紅 5 秒倒數（震動 + speechSynthesis）；取消；建立 `emergencies` + 警方 `/track/{token}`；`tel:` 撥號（`TEST_MODE` 預設測試號）；「請按通話鍵」+ 位置分享 +「我已安全／結束」
- [x] 我的求助紀錄：超大狀態卡（待接單／義工已接單／已完成）、可取消未接單、義工完成後「確認完成，多謝義工」、列表自動更新（輪詢 + Realtime）
- [x] 求助確認完成：1–5 星評分（可略過）+ 伺服器交易標記完成／加分／寫日誌（同一單不重複加分）
- [x] PWA（`manifest.webmanifest` + icons；可加主畫面）

---

## 階段 3：義工網站（`apps/volunteer`）

- [x] 註冊（Supabase Auth 電郵＋密碼；姓名／電話／電郵／密碼強度／年齡／可服務地區／簡介／同意條款）
- [x] 註冊後建立 `profiles`（role=volunteer）+ `volunteers`（approval_status=pending）並寫入 `activity_logs`
- [x] 登入、登出、忘記密碼／重設密碼；雙語表單驗證錯誤
- [x] 待審批義工登入後只見「等待管理員審批」頁，不能看求助列表
- [x] 審批狀態流程：pending／approved／rejected／disabled；伺服器 proxy + 頁面 guard + RLS（非 approved 不可讀求助資料）
- [x] Supabase Realtime：審批狀態變更後等待頁自動跳轉（無需手動重新整理）
- [x] 個人資料頁：顯示／修改姓名、電話、年齡、可服務地區、簡介；電郵只讀；更改密碼；寫入 activity_logs
- [x] 排行榜頁（本月／全部時間、金銀銅、底部自己名次、本月倒數、匿名姓氏、Realtime／每分鐘更新）
- [x] 我的證書頁（下載已結算 Top 3 PDF）
- [x] 求助列表、接單、地圖、標記完成、我的紀錄（Realtime／距離／錄音詳情頁）

---

## 階段 4：管理員網站（`apps/admin`）

- [x] 管理員登入（Supabase Auth；只限 `role=admin`；非管理員顯示沒有權限；不開放註冊）
- [x] 左側導覽骨架（儀表板、長者／義工管理、配對總覽、緊急事件、日誌、活躍度、排行榜與證書）
- [x] 儀表板統計（長者總數、已批准／待審批義工、今日新求助、待接單、進行中緊急、本月已完成）+ 近 7 天求助折線圖
- [x] 儀表板「有新緊急事件」Realtime 紅色提示
- [x] 用戶管理（長者、義工：列表搜尋篩選分頁、詳情頁、批准／拒絕／停用／重新啟用、編輯寫日誌、匯出 CSV）
- [x] 日誌（activity_logs 篩選／匯出 CSV；DB append-only 禁止改刪）
- [x] 配對總覽（求助單列表篩選、詳情含錄音／軌跡／時間線、取消／重新指派寫原因與日誌）
- [x] 活躍度列表（義工／長者指標、高中低分級、排序、近 30 天趨勢）
- [x] 緊急事件列表與即時地圖（進行中置頂、Realtime 位置、警方連結、標記已處理＋備註）
- [x] 排行榜管理（選月份、Top 10、結算鎖定、同分裁決）
- [x] Top 3 證書產生（PDF：`pdf-lib` + Noto Sans TC；預覽頁／重新產生／下載）
- [x] 本階段已加文案放入 en / zh-HK 語言檔（後續功能繼續沿用）
- [x] 4.9 驗收（腳本 `pnpm acceptance:admin-4.9` + `pnpm seed:admin-demo`）
  - [x] 非管理員／未登入無法打開 `/admin` 頁面；未登入 API 被擋（proxy → `/login`；API `requireAdminApi` → 401／403／503）
  - [x] 靜態確認：批准義工 API 寫入 `activity_logs`；RLS 僅 `approved` 可讀求助（需 Supabase 金鑰才跑 live）
  - [x] 所有管理 mutation API 均寫入 `activity_logs`；DB append-only migration 004
  - [x] 列表皆分頁（20–30／頁）；假資料腳本可種 ≥1000 筆 `help_requests`（`scripts/seed-admin-demo.mjs`）
  - [x] Live DB：已套用 `003`／`004`／`005`（`pnpm apply:supabase-migrations`）；`seed:admin-demo -- --clean`（200/80/1000）；`acceptance:admin-4.9` **33/33**

---

## 階段 5：獎勵系統、共用後端與即時功能

- [x] 設計並建立共用 Supabase schema（`supabase/migrations/001_init.sql`）
- [x] 共用 Supabase 連線工具（browser / server / proxy / service）與 `/health`
- [x] 共用登入權限基礎（volunteer 需批准、admin 需角色；elder 不登入）
- [ ] Backend facade／本機 fallback
- [x] 積分規則設定檔（`packages/shared/src/points/rules.ts`：基本 10、逾 30 分鐘 +5、評分 ≥4 +5）
- [x] 長者確認完成同一 DB 交易：標記完成 + `points` 寫入 + `activity_logs`（RPC `confirm_help_request_award_points`；`help_request_id` 唯一防重複）
- [x] SQL 視圖／函式：`volunteer_points_totals`、`volunteer_points_monthly`、`volunteer_total_points`、`volunteer_month_points`
- [x] 義工端每月／全部時間排行榜 UI（`get_volunteer_leaderboard` + Realtime／輪詢）
- [x] Top 3 義工 PDF 證書（admin 結算寫入 `certificates` + 私有 Storage；義工「我的證書」下載）
- [x] 積分／排行榜／證書驗收（腳本 `scripts/acceptance-points-certificates.mjs` + PDF 預覽）
  - [x] 重複確認完成只加一次分（RPC `HELP_REQUEST_NOT_CONFIRMABLE` + `points` 唯一）
  - [x] 5 位義工假資料：排序正確；同分（C/D）並列 rank=3 待管理員決定
  - [x] 證書 PDF 中文正常（Noto Sans TC TTF；無方塊字）
  - [x] 結算後該月不可再結算（`leaderboard_settlements` PK）
- [x] Realtime：義工求助列表自動刷新；admin 儀表板提示與緊急詳情即時地圖已接
- [x] Storage：錄音上傳（`voice-recordings` 私有；signed URL 經 service role）
- [ ] 共用日誌工具
- [x] 各 app `.env.local.example` 與設定說明（見 `docs/AUTH_AND_ENV.md`）
- [x] 安全加固 migration `012`（C0 role 鎖死、C1/C3 資料範圍、C2 storage、H2 禁直接 UPDATE、H4 activity_logs 身份校驗）
- [x] 驗收腳本 `pnpm acceptance:security-012`

---

## 階段 6：測試、各自部署與畢業專題收尾

- [x] 長者介面規則檢查（大字、大掣、少文字、無英文縮寫；首頁兩大掣＋紀錄文字連結）
- [x] 確認無寫死文字（UI 文案走 en / zh-HK；health／map aria 已收進語言檔）
- [x] HTTPS／localhost 錄音與定位說明（見 `docs/MANUAL_TEST_GUIDE.md`）
- [x] 確認金鑰未進入 git（只追蹤 `.env*.example`）
- [ ] 三個網站各自部署到 Vercel
- [x] 撰寫／整理專題文件與示範流程（`docs/MANUAL_TEST_GUIDE.md`）
- [x] 最終驗收對照 `PROJECT_SPEC.md`（整合檢查後已修 C0→其餘；自動化 33/33 + 9/9）

---

## 進度摘要

| 階段 | 名稱 | 狀態 |
|------|------|------|
| 0 | 專案規格與文件起步 | 已完成 |
| 1 | Monorepo 骨架與共用套件 | 已完成 |
| 2 | 長者 Web App | 已完成（含 PWA；部署前再驗實機） |
| 3 | 義工網站 | 已完成（接單／地圖／完成／紀錄／證書） |
| 4 | 管理員網站 | 已完成（含排行榜結算與 Top 3 證書） |
| 5 | 獎勵系統、共用後端與即時功能 | 進行中（缺共用日誌工具／backend facade） |
| 6 | 測試、各自部署與畢業專題收尾 | 進行中（本地驗收＋手動指南已備；欠 Vercel 部署） |
