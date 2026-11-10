# ElderSafe Guardian — 完整手動測試指南

請先拉取最新分支，並套用資料庫 migration，再按本指南測試。

## 0. 一次性設定

```bash
pnpm install
cp apps/elder/.env.local.example apps/elder/.env.local
cp apps/volunteer/.env.local.example apps/volunteer/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# 每個檔案填入三個 Supabase 金鑰。
# 長者 app 另需：TEST_MODE=true 和 TEST_EMERGENCY_NUMBER=+85290000000
# 管理員 app 另需：SUPABASE_DB_PASSWORD（跑 migration）和 NEXT_PUBLIC_ELDER_APP_URL=http://localhost:3001
```

套用 migration（包含安全加固 `012`）：

```bash
pnpm apply:supabase-migrations
```

自動化檢查：

```bash
pnpm acceptance:security-012
pnpm acceptance:admin-4.9
# 可選：先開 admin 再跑 HTTP 可達性檢查
pnpm --filter @eldersafe/admin run dev   # port 3003
ADMIN_BASE_URL=http://127.0.0.1:3003 pnpm acceptance:admin-4.9
pnpm acceptance:points-certificates
# 若腳本未掛到 package.json，可改用：
node --env-file=apps/admin/.env.local ./scripts/acceptance-points-certificates.mjs
```

啟動三個網站：

```bash
pnpm --filter @eldersafe/elder run dev      # http://localhost:3001
pnpm --filter @eldersafe/volunteer run dev  # http://localhost:3002
pnpm --filter @eldersafe/admin run dev      # http://localhost:3003
```

---

## 1. 安全檢查（必須通過）

| # | 檢查項目 | 做法 |
|---|----------|------|
| C0 | 義工不能把自己升成 admin | `pnpm acceptance:security-012`（應見 PASS C0…） |
| C1 | 義工不能直接 `select` elders 表 | 同一個腳本 |
| C2 | 用義工 JWT 不能列出錄音檔 | 同一個腳本 |
| C3 | 義工不能讀 `emergencies`／警方 token | 同一個腳本 |
| H2 | 義工不能直接 UPDATE `help_requests` | 同一個腳本 |
| H4 | 義工不能偽造 `actor_type=admin` 日誌 | 同一個腳本 |
| 管理員 API | 未登入呼叫 `/api/elders` → 401 | `curl -i http://localhost:3003/api/elders` |

---

## 2. 長者 App（`http://localhost:3001/zh-HK`）

1. 用**手機闊度**視窗開啟（或同一區網／tunnel 的真實手機）。
2. 完成首次登記（姓名／年齡／電話／住址／緊急聯絡人／健康備註可選／同意條款）。
3. 首頁應有**兩個超大按鈕**（紅色緊急、藍色陪伴），另加「求助紀錄」文字連結。
4. **藍色陪伴**：錄音 ≤60 秒 → 停止 → 重聽 → 送出。應進入狀態頁「待接單」。
5. 允許定位；送出後，求助進行中可持續分享位置。
6. **紅色緊急**：確認 → 5 秒倒數（可取消）→ 撥打**測試號碼**（`TEST_MODE=true` 時不可撥 999）→ 產生追蹤連結。
7. 打開警方 `/track/{token}`：可見姓名／年齡／住址／地圖；**不應見到健康備註**。
8. 按「我已安全」結束緊急。
9. 義工標記完成後（見第 3 節），打開紀錄 → **確認完成**（星級可略過）。義工此時才加分。
10. 切換 EN／zh-HK；不應有缺漏文案鍵。
11. PWA：在 HTTPS／localhost，瀏覽器「加入主畫面／安裝」應出現 ElderSafe（已有 manifest）。

字體／按鈕抽查：正文 ≥20px、標題 ≥28px、主要按鈕高度 ≥72px。

---

## 3. 義工網站（`http://localhost:3002/zh-HK`）

1. 註冊新義工 → 進入**等待審批**頁。
2. 到管理員（第 4 節）批准該義工 → 等待頁應自動跳去首頁。
3. 首頁求助列表顯示待接單（Realtime／刷新）。接單前可見姓名＋年齡；住址／電話只在接單後可見。
4. 打開一單 → 播放錄音 → **接單** → 地圖顯示即時位置。
5. **標記完成** → 長者仍須確認，義工才得分。
6. 可選：完成前取消接單，並填原因（2–500 字）。
7. 檢查**我的紀錄**、**排行榜**、**我的證書**（證書在每月結算後才有）。
8. 登出；pending／rejected 帳號不可看到求助資料。

---

## 4. 管理員網站（`http://localhost:3003/zh-HK`）

1. 用管理員 Auth 帳號登入（`profiles.role=admin`）。非管理員 → 沒有權限。
2. 儀表板：統計數字＋近 7 天圖；製造緊急事件後應見 Realtime 紅色提示。
3. 用戶管理：搜尋長者／義工；批准／拒絕／停用；匯出 CSV。
4. 配對總覽：打開求助單（含錄音＋軌跡）；取消／重新指派並填原因（2–500 字）。
5. 緊急事件：打開地圖＋警方連結；標記已處理並填備註（2–500 字）。
6. 日誌／活躍度頁可載入並有分頁。
7. 排行榜：選月份 → 結算 Top 3 → 預覽／下載 PDF 證書。
8. 義工在「我的證書」可下載同一張證書。

---

## 5. 獎勵系統

1. 接單 → 義工標記完成 → 長者確認（有／無評分）。
2. 同一單再確認一次 → 第二次應失敗；`points` 只有一列。
3. 排行榜次序與積分一致；同一月份不可重複結算。

---

## 6. 本分支預期自動化結果

- `pnpm acceptance:security-012` → **9/9**
- `pnpm acceptance:admin-4.9`（admin 已啟動）→ **20/20**（未開 HTTP 時約 19/20）
- 積分／證書腳本 → 全部 ✓
- `pnpm --filter @eldersafe/elder|volunteer|admin run build` → 成功

---

## 疑難排解

- **503 supabase_not_configured**：`.env.local` 金鑰未填齊。
- **012 之後義工播不到錄音**：錄音 API 須用 service role 簽 URL（本分支已做）；請重啟／重新部署義工 app。
- **拉取後 RLS 異常**：再跑 `pnpm apply:supabase-migrations`。
- **緊急竟然撥 999**：設 `TEST_MODE=true`（只有明確設 `false` 才會撥 999）。
- **手機用 ngrok 開 3001 停喺「正在檢查此手機…」／白屏／Unauthorized**：
  1. 呢句係長者 app 自己嘅 loading 文案；若 JS（`/_next`）被擋，畫面會永遠停喺呢度。
  2. 確認已合併含 `allowedDevOrigins`（要包 `*.ngrok-free.dev`）嘅設定。
  3. **必須重啟** `pnpm --filter @eldersafe/elder run dev`（改 `next.config` 唔會熱更新）。
  4. 再開 `ngrok http 3001`，用新嘅 `https://….ngrok-free.dev` 連結。
  5. 若仍被擋，喺 `apps/elder/next.config.ts` 嘅 `allowedDevOrigins` 加上你個**完整 hostname**（唔好加 `https://`），例如 `'diver-thickness.ngrok-free.dev'`，再重啟。
  6. 免費 ngrok 首次開啟可能有警告頁，用手機瀏覽器撳 Visit Site。
  7. 修好之後若仍見「正在檢查…」，可撳「開始輸入我的資料」進入登記。
