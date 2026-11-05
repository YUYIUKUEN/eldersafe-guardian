# ElderSafe Guardian 示範流程（畢業專題）

本機一次示範三個網站。預設用 `.data/store.json`，唔使先開 Supabase。

## 啟動

```bash
pnpm install
cp apps/elder/.env.local.example apps/elder/.env.local
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local

pnpm dev:elder       # http://localhost:3000
pnpm dev:volunteer   # http://localhost:3001
pnpm dev:admin       # http://localhost:3002
```

長者 App 緊急測試模式已預設開啟：`NEXT_PUBLIC_EMERGENCY_TEST_MODE=true`，撥打 `NEXT_PUBLIC_EMERGENCY_TEST_PHONE`（唔會撥 999）。

## 示範劇本（約 5–8 分鐘）

### 1. 長者首次使用（3000）

1. 開啟手機瀏覽器或 DevTools 手機模式。
2. 填寫姓名、年齡、電話、住址、緊急聯絡人。
3. 首頁只見兩個大掣：紅色「緊急求助」、藍色「需要人陪伴／協助」。

### 2. 錄音求助（藍色）

1. 按藍色掣 → 開始錄音 → 停止 → 重聽 → 送出（需允許定位）。
2. 回到「我的求助」可見「待接單」。

### 3. 義工接單（3001）

1. 註冊一個義工帳號並登入。
2. 若未批核，按「（示範）模擬管理員批核」。
3. 在求助列表接單 → 聽錄音 → 開地圖 → 「標記完成」。

### 4. 長者確認 → 積分

1. 回長者 App「我的求助」→「確認完成」。
2. 義工積分 +10；排行榜顯示本月分數。

### 5. 緊急求助（紅色，測試模式）

1. 按紅色掣 → 5 秒倒數可取消。
2. 倒數完會開 `tel:` 測試號碼（唔係 999），並產生警方位置連結。
3. 管理員網站「緊急事件」可見該事件與地圖。

### 6. 管理員（3002）

- 登入：`admin@eldersafe.local` / `admin123`
- 示範：審批／停用義工、查看日誌與配對、下載 Top 3 PDF 證書。

## 接上真正 Supabase（可選）

見 [`supabase/README.md`](./supabase/README.md)。填入真實金鑰後重啟三個 app，錄音會上 Storage，求助／緊急事件會用 Realtime 自動刷新。

## 部署到 Vercel（三個獨立專案）

每個 app 各自建立一個 Vercel 專案，Root Directory 分別設為：

- `apps/elder`
- `apps/volunteer`
- `apps/admin`

並在各專案 Environment Variables 填入對應 `.env.local` 內容（同一組 Supabase 金鑰）。
