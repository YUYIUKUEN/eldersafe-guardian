# ElderSafe Guardian

以長者為先的安全網頁應用（畢業專題）。介面支援 **English** 與 **繁體中文（zh-HK）**。

完整規格見 [`PROJECT_SPEC.md`](./PROJECT_SPEC.md)，開發進度見 [`PROGRESS.md`](./PROGRESS.md)。

## 三個入口

| 路徑 | 對象 |
|------|------|
| `/elder` | 長者 Web App（手機優先） |
| `/volunteer` | 義工網站 |
| `/admin` | 管理員網站 |

預設語言為 `zh-HK`（路徑無前綴，例如 `/elder`）。英文路徑為 `/en/elder` 等。

## 技術棧

- Next.js（App Router、TypeScript）
- Tailwind CSS
- next-intl（en / zh-HK）
- Supabase（稍後接上 PostgreSQL、Auth、Storage、Realtime）
- Leaflet + OpenStreetMap（稍後）
- Vercel 部署（稍後）

## 本機啟動

1. 安裝依賴：

```bash
npm install
```

2. 複製環境變數範本，並填入你自己的值（**不要 commit `.env.local`**）：

```bash
cp .env.local.example .env.local
```

3. 啟動開發伺服器（錄音／定位可用 `localhost`）：

```bash
npm run dev
```

然後打開 [http://localhost:3000](http://localhost:3000)。

## 重要規則（摘要）

- 所有畫面文字必須放在 `messages/en.json` 與 `messages/zh-HK.json`，不可寫死在頁面。
- 金鑰只放 `.env.local`，不可 commit。
- 緊急求助測試模式必須撥 `EMERGENCY_TEST_PHONE`，不得撥 999。
