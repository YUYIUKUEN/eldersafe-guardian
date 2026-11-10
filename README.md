# ElderSafe Guardian

以長者為先的安全網頁應用（畢業專題）。

- 規格：[`PROJECT_SPEC.md`](./PROJECT_SPEC.md)
- 進度：[`PROGRESS.md`](./PROGRESS.md)

## 專案結構（pnpm monorepo）

```text
apps/elder        長者 Web App（本機 port 3001，手機直向外觀）
apps/volunteer    義工網站（本機 port 3002）
apps/admin        管理員網站（本機 port 3003）
packages/shared   共用語言檔（en / zh-HK）與 locale 設定
```

三個網站互相獨立，各自啟動，沒有共用入口頁。之後會各自部署成不同網址，並共用同一個 Supabase 後端。

## 環境需求

- Node.js 20+
- pnpm 10+

## 本機啟動

在專案根目錄：

```bash
pnpm install
```

> 若義工網站按「接單」或開地圖時出現 `Module not found: Can't resolve 'leaflet'`，代表 `node_modules` 尚未裝好地圖依賴。請在**專案根目錄**再跑一次 `pnpm install`，然後刪除 `apps/volunteer/.next` 並重新 `pnpm dev:volunteer`。

一次啟動三個網站（請在專案根目錄執行）：

```bash
pnpm install
pnpm dev
```

`pnpm dev` 會用 `scripts/dev.mjs` 同時啟動三個 app（Windows / macOS / Linux 都可用）。

若仍失敗，先確認根目錄 `package.json` 裡有 `"dev": "node ./scripts/dev.mjs"`，然後開三個終端機分別啟動：

```bash
pnpm dev:elder       # http://localhost:3001
pnpm dev:volunteer   # http://localhost:3002
pnpm dev:admin       # http://localhost:3003
```

## 瀏覽器檢查

1. 打開 http://localhost:3001 → 應看到「長者 Web App」標題（手機寬度外觀），右上角可切換語言
2. 打開 http://localhost:3002 → 應看到「義工網站」標題，右上角可切換語言
3. 打開 http://localhost:3003 → 應看到「管理員網站」標題，右上角可切換語言

預設語言為 `zh-HK`；切到 `en` 後標題會變成英文。

## 語言

預設 `zh-HK`，另支援 `en`。文案放在 `packages/shared/messages/`，頁面右上角可切換語言。

## 目前階段

階段 1 完成；已接上 Supabase schema、連線工具與權限 proxy。  
Env／權限測試說明：[`docs/AUTH_AND_ENV.md`](./docs/AUTH_AND_ENV.md)
