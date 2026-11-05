# ElderSafe Guardian 開發進度

> 本檔案追蹤畢業專題各階段完成情況。  
> 標記說明：`[x]` = 已完成　`[ ]` = 未開始／進行中

**目前進度：階段 5（Supabase／Realtime／Storage／每月排行榜）已完成；未設定雲端金鑰時自動 fallback 本機 `.data/store.json`**

---

## 階段 0：專案規格與文件起步

- [x] 建立 `PROJECT_SPEC.md`（完整產品規格：三獨立網站 monorepo）
- [x] 建立 `PROGRESS.md`（階段 0 至階段 6 進度清單）
- [x] 確認技術棧與環境需求（Node.js、pnpm、Supabase、Vercel）
- [x] 準備各 app 的 `.env.local.example`（不含真實金鑰）

---

## 階段 1：Monorepo 骨架與共用套件

- [x] 初始化 pnpm workspace monorepo
- [x] 建立三個獨立 Next.js 專案：`apps/elder`、`apps/volunteer`、`apps/admin`
- [x] 建立 `packages/shared`
- [x] 設定 next-intl（en / zh-HK）
- [x] 確認三個 app 可分別 build（ports：3000 / 3001 / 3002）
- [x] 金鑰只放各 app 的 `.env.local`，不可 commit

---

## 階段 2：長者 Web App（`apps/elder`）

- [x] PWA、首次資料、裝置密鑰、兩大按鈕、緊急倒數、錄音求助、確認完成、雙語

---

## 階段 3：義工網站（`apps/volunteer`）

- [x] 註冊／登入、審批門檻、求助列表、接單、地圖、標記完成、積分／紀錄／排行榜

---

## 階段 4：管理員網站（`apps/admin`）

- [x] 管理員登入（只限管理員；本機預設 `admin@eldersafe.local` / `admin123`）
- [x] 用戶管理（長者、義工：查看完整資料、停用、審批、調整積分）
- [x] 日誌（誰在何時做了什麼，可篩選）
- [x] 配對總覽（長者與義工所有求助單及詳情）
- [x] 活躍度列表（義工和長者）
- [x] 緊急事件列表與即時地圖
- [x] 排行榜管理
- [x] Top 3 證書產生（PDF）
- [x] 所有文案放入 en / zh-HK 語言檔

---

## 階段 5：獎勵系統、共用後端與即時功能

- [x] 設計並建立共用 Supabase schema（`supabase/migrations/001_init.sql`）
- [x] Backend facade：有真實金鑰用 Supabase，否則 fallback 本機 file-store
- [x] 每月排行榜（依 `points_awarded_at`／長者確認後計分）
- [x] Top 3 義工 PDF 證書（admin 可下載；可切本月／全部時間）
- [x] Realtime：義工求助列表、admin 緊急事件自動刷新（有 Supabase 時）
- [x] Storage：錄音上傳至 `recordings` bucket（本機模式改存 data URL）
- [x] 共用日誌工具 `@eldersafe/shared` + activity_logs 表／本機 logs
- [x] 各 app `.env.local.example` 與 `supabase/README.md` 設定說明

---

## 階段 6：測試、各自部署與畢業專題收尾

- [ ] 長者介面規則檢查
- [ ] 確認無寫死文字
- [ ] HTTPS／localhost 錄音與定位測試
- [ ] 確認金鑰未進入 git
- [ ] 三個網站各自部署到 Vercel
- [ ] 撰寫／整理專題文件與示範流程
- [ ] 最終驗收對照 `PROJECT_SPEC.md`

---

## 進度摘要

| 階段 | 名稱 | 狀態 |
|------|------|------|
| 0 | 專案規格與文件起步 | 已完成 |
| 1 | Monorepo 骨架與共用套件 | 已完成 |
| 2 | 長者 Web App | 已完成 |
| 3 | 義工網站 | 已完成 |
| 4 | 管理員網站 | 已完成 |
| 5 | 獎勵系統、共用後端與即時功能 | 已完成 |
| 6 | 測試、各自部署與畢業專題收尾 | 未開始 |
