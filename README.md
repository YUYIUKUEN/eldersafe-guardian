# ElderSafe Guardian

以長者為先的安全網頁應用（畢業專題）。

- 規格：[`PROJECT_SPEC.md`](./PROJECT_SPEC.md)
- 進度：[`PROGRESS.md`](./PROGRESS.md)

## 專案結構（pnpm monorepo）

```text
apps/elder        長者 Web App（本機 port 3000）
apps/volunteer    義工網站（本機 port 3001）
apps/admin        管理員網站（本機 port 3002）
packages/shared   共用型別、Supabase 連線、積分規則、語言檔、日誌工具
```

三個網站會各自部署成不同網址，但共用同一個 Supabase 後端。

## 環境需求

- Node.js 20+
- pnpm 10+

## 本機啟動

在專案根目錄：

```bash
pnpm install
```

分別啟動（可開三個終端機）：

```bash
pnpm dev:elder       # http://localhost:3000
pnpm dev:volunteer   # http://localhost:3001
pnpm dev:admin       # http://localhost:3002
```

## 環境變數

每個 app 都有 `.env.local.example`。複製成 `.env.local` 後再填入你自己的值：

```bash
cp apps/elder/.env.local.example apps/elder/.env.local
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
```

**不要 commit `.env.local` 或任何真實金鑰。**

## 語言

預設 `zh-HK`，另支援 `en`。文案放在 `packages/shared/messages/`，頁面右上角可切換語言。

## 長者 App 現況（階段 2）

`apps/elder` 已可用本機儲存示範完整流程：

1. 首次填寫基本資料（裝置密鑰識別，不用登入）
2. 紅色「緊急求助」：5 秒倒數／取消；測試模式撥 `NEXT_PUBLIC_EMERGENCY_TEST_PHONE`（不得撥 999）
3. 藍色「需要人陪伴／協助」：錄音後送出求助單（附位置）
4. 查看求助單狀態；完成後可「確認完成」
5. PWA manifest，可加入手機主畫面

注意：而家資料暫存瀏覽器本機 + 專案根目錄 `.data/store.json`（本機開發共用），真正雲端後端會在階段 5 接 Supabase。

## 義工網站（階段 3）

```bash
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
pnpm dev:volunteer   # http://localhost:3001
```

示範流程：

1. 長者 App（3000）送出錄音求助  
2. 義工註冊／登入（3001）  
3. 若未批核，按「（示範）模擬管理員批核」（`DEMO_MODE=true`）  
4. 接單 → 查看地圖 → 標記完成  
5. 回到長者 App 按「確認完成」→ 義工積分 +10  

## 管理員網站（階段 4）

```bash
cp apps/admin/.env.local.example apps/admin/.env.local
pnpm dev:admin   # http://localhost:3002
```

本機預設管理員：

- 電郵：`admin@eldersafe.local`
- 密碼：`admin123`

功能：用戶管理（審批／停用）、日誌篩選、配對總覽、活躍度、緊急事件地圖、排行榜、下載 Top 3 PDF 證書。
