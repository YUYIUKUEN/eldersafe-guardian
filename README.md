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

一次啟動三個網站（請在專案根目錄執行，且必須寫 `pnpm`）：

```bash
pnpm install
pnpm dev
```

若 `pnpm dev` 仍失敗，可開三個終端機分別啟動：

```bash
pnpm dev:elder       # http://localhost:3001
pnpm dev:volunteer   # http://localhost:3002
pnpm dev:admin       # http://localhost:3003
```

Windows 注意：不要只打 `dev`，要打完整的 `pnpm dev`。

## 瀏覽器檢查

1. 打開 http://localhost:3001 → 應看到「長者 Web App」標題（手機寬度外觀），右上角可切換語言
2. 打開 http://localhost:3002 → 應看到「義工網站」標題，右上角可切換語言
3. 打開 http://localhost:3003 → 應看到「管理員網站」標題，右上角可切換語言

預設語言為 `zh-HK`；切到 `en` 後標題會變成英文。

## 語言

預設 `zh-HK`，另支援 `en`。文案放在 `packages/shared/messages/`，頁面右上角可切換語言。

## 目前階段

階段 1：Monorepo 骨架與空白首頁。尚未接入資料庫或登入。
