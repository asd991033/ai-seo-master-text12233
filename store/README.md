# Giftevo — 客製化禮品一站式電商

Next.js 15（App Router）＋ Drizzle ORM ＋ SQLite/libSQL ＋ Fabric.js。

## 快速開始

```bash
cd store
cp .env.example .env      # 修改 ADMIN_PASSWORD
npm install
npm run setup             # 建立資料表 + 示範資料 + 管理員帳號
npm run dev               # http://localhost:3000
```

後台：`/admin`（帳密為 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`）。
測試：`npm test`（報價與運費引擎）、`npm run typecheck`。

## 功能

| 需求 | 位置 |
| --- | --- |
| 區間價格、印刷方式 × 印刷面積 × 色數報價 | `src/lib/pricing.ts`，商品頁即時報價 `src/components/Configurator.tsx` |
| 線上排版（刀模疊圖、印刷範圍、安全線、成品示意圖） | `src/components/designer/Designer.tsx` |
| 空運 / 海運運費（實重、材積重、CBM、級距） | `src/lib/shipping.ts`，後台 `/admin/shipping` |
| 產品、刀模、圖片批量匯入 | 後台 `/admin/import`，`src/lib/importer.ts`、`src/lib/excel.ts` |
| 購物車、結帳、會員、訂單、後台訂單管理 | `src/app/*` |

下單時伺服器一律重新計價（`src/lib/checkout.ts`），不採信前端金額。

## 批量匯入

1. 後台「批量匯入」下載 Excel 範本，四張工作表：**產品、區間價格、印刷區域、印刷報價**（「說明」工作表有欄位解釋）。
2. 上傳 Excel（以 SKU upsert，可重複匯入）。
3. 上傳檔案，依檔名自動對應：
   - 刀模 `{SKU}_{位置代碼}.svg`
   - 示意圖 `{SKU}_{位置代碼}_mockup.png`
   - 商品圖 `{SKU}_1.jpg`、`{SKU}_2.jpg`…

刀模 SVG：以 mm 為單位、只留線條不填色；建議裁切線洋紅實線、摺線青色虛線。

## 排版輸出

客戶完成排版後，每個印刷位置會存：可再編輯的 JSON、300 dpi 印刷 PNG（裁切到印刷範圍）、向量 SVG、示意圖合成圖。後台訂單頁可下載。

## 多國站台

每個國家站各自部署，用環境變數切換（見 `src/config/site.ts`）：語系 `NEXT_PUBLIC_SITE_LOCALE`、幣別、稅率、預設運送區域。
新增語系：複製 `src/i18n/zh-TW.ts` 翻譯後在 `src/i18n/index.ts` 註冊。後台介面目前僅中文。

## 上線前待辦

- 金流：目前僅銀行轉帳（`BANK_INFO`），線上刷卡尚未串接。
- 檔案儲存：目前存本機磁碟 `STORAGE_DIR`；若部署在無狀態主機，改寫 `src/lib/storage.ts` 接 S3/R2。
- 資料庫：本機為 SQLite 檔；正式環境可把 `DATABASE_URL` 指向 Turso（libSQL）。
- 通知信（訂單成立、狀態變更）、忘記密碼、登入頻率限制尚未實作。
- 示範商品、運費費率、稅率 5% 皆為示意，請以實際資料取代。

## LINE / Google 登入

在 `.env` 填入 `GOOGLE_CLIENT_ID/SECRET`、`LINE_CHANNEL_ID/SECRET` 後，登入與註冊頁會自動出現對應按鈕（沒填就不顯示）。
各平台後台的回呼網址設為 `{SITE_URL}/api/auth/google/callback` 與 `{SITE_URL}/api/auth/line/callback`。
LINE 若未提供 Email，結帳時會請客戶自行填寫。
