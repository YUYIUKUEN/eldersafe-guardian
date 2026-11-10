# ElderSafe — Admin Site

管理員網站。本機預設 `http://localhost:3003`。

```bash
pnpm --filter @eldersafe/admin dev
```

## 4.9 驗收／假資料

先複製並填好 `.env.local`（見根目錄 `docs/AUTH_AND_ENV.md`），再：

```bash
# 種約 200 長者 + 80 義工 + 1000 求助 + 緊急／日誌
pnpm seed:admin-demo
# 清掉上次 seed 後再種
pnpm seed:admin-demo -- --clean

# 靜態 + 未登入擋頁／API；有金鑰時一併驗批准／日誌／RLS／列表效能
pnpm acceptance:admin-4.9
```
