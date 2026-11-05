# ElderSafe Guardian

以長者為先的安全網頁應用（畢業專題）。介面支援 **English** 與 **繁體中文（zh-HK）**。

完整規格見 [`PROJECT_SPEC.md`](./PROJECT_SPEC.md)，開發進度見 [`PROGRESS.md`](./PROGRESS.md)。

## 而家有咩

- Next.js（App Router、TypeScript、Tailwind CSS、ESLint、`src/`）
- next-intl：預設 `zh-HK`，另支援 `en`；右上角可切換語言
- 選擇頁 `/`，以及三個空白入口：`/elder`、`/volunteer`、`/admin`

（尚未接資料庫或登入。）

## 本機啟動

1. 進入專案資料夾，安裝依賴：

```bash
npm install
```

2. 啟動開發伺服器：

```bash
npm run dev
```

3. 用瀏覽器打開：[http://localhost:3000](http://localhost:3000)

## 檢查清單

- 主頁有三個入口連結
- 右上角可切換「繁體中文（香港）」／「English」
- `/elder`、`/volunteer`、`/admin` 各自顯示標題（會跟住語言改變）
