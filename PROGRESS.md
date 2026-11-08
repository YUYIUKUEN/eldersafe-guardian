# ElderSafe Guardian 開發進度

> 本檔案追蹤畢業專題各階段完成情況。  
> 標記說明：`[x]` = 已完成　`[ ]` = 未開始／進行中

**目前進度：階段 1 完成（Monorepo 骨架與共用語言套件）**

---

## 階段 0：專案規格與文件起步

- [x] 建立 `PROJECT_SPEC.md`（完整產品規格：三獨立網站 monorepo）
- [x] 建立 `PROGRESS.md`（階段 0 至階段 6 進度清單）
- [x] 確認技術棧與環境需求（Node.js、pnpm、Supabase、Vercel）
- [ ] 準備各 app 的 `.env.local.example`（不含真實金鑰）— 待後續接上後端時再加

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

- [ ] PWA、首次資料、裝置密鑰、兩大按鈕、緊急倒數、錄音求助、確認完成、雙語

---

## 階段 3：義工網站（`apps/volunteer`）

- [ ] 註冊／登入、審批門檻、求助列表、接單、地圖、標記完成、積分／紀錄／排行榜

---

## 階段 4：管理員網站（`apps/admin`）

- [ ] 管理員登入（只限管理員）
- [ ] 用戶管理（長者、義工：查看完整資料、停用、審批）
- [ ] 日誌（誰在何時做了什麼，可篩選）
- [ ] 配對總覽（長者與義工所有求助單及詳情）
- [ ] 活躍度列表（義工和長者）
- [ ] 緊急事件列表與即時地圖
- [ ] 排行榜管理
- [ ] Top 3 證書產生（PDF）
- [ ] 所有文案放入 en / zh-HK 語言檔

---

## 階段 5：獎勵系統、共用後端與即時功能

- [x] 設計並建立共用 Supabase schema（`supabase/migrations/001_init.sql`）
- [ ] Backend facade／本機 fallback
- [ ] 每月排行榜（長者確認後計分）
- [ ] Top 3 義工 PDF 證書
- [ ] Realtime：義工求助列表、admin 緊急事件自動刷新
- [ ] Storage：錄音上傳
- [ ] 共用日誌工具
- [ ] 各 app `.env.local.example` 與設定說明

---

## 階段 6：測試、各自部署與畢業專題收尾

- [ ] 長者介面規則檢查（大字、大掣、少文字、無英文縮寫）
- [ ] 確認無寫死文字（UI 文案走 en / zh-HK）
- [ ] HTTPS／localhost 錄音與定位說明
- [ ] 確認金鑰未進入 git（只追蹤 `.env*.example`）
- [ ] 三個網站各自部署到 Vercel
- [ ] 撰寫／整理專題文件與示範流程
- [ ] 最終驗收對照 `PROJECT_SPEC.md`

---

## 進度摘要

| 階段 | 名稱 | 狀態 |
|------|------|------|
| 0 | 專案規格與文件起步 | 大致完成（env example 待後端階段） |
| 1 | Monorepo 骨架與共用套件 | 已完成 |
| 2 | 長者 Web App | 未開始 |
| 3 | 義工網站 | 未開始 |
| 4 | 管理員網站 | 未開始 |
| 5 | 獎勵系統、共用後端與即時功能 | 未開始 |
| 6 | 測試、各自部署與畢業專題收尾 | 未開始 |
