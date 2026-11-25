import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(unixepoch())`;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  taxId: text("tax_id"),
  role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
  createdAt: integer("created_at").notNull().default(now),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256(token)
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

/** 第三方登入（Google / LINE）與本站帳號的對應 */
export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("oauth_accounts_uq").on(t.provider, t.providerUserId)],
);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** 上層分類；大分類是 null，子分類指向它的大分類 */
  parentId: integer("parent_id"),
  sort: integer("sort").notNull().default(0),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  summary: text("summary").notNull().default(""),
  description: text("description").notNull().default(""),
  material: text("material").notNull().default(""),
  sizeText: text("size_text").notNull().default(""),
  /** 圖片網址陣列 */
  images: text("images", { mode: "json" }).$type<string[]>().notNull().default([]),
  /** 可選顏色 */
  colors: text("colors", { mode: "json" }).$type<{ name: string; hex: string; image?: string; display?: string }[]>().notNull().default([]),
  /** 可選尺碼 */
  sizes: text("sizes", { mode: "json" }).$type<string[]>().notNull().default([]),
  /** 供應商商品頁（僅後台參考） */
  sourceUrl: text("source_url"),
  /** 印上範例圖案的成品圖（商品卡片滑過時顯示、Google 購物主圖） */
  sampleImage: text("sample_image"),
  moq: integer("moq").notNull().default(1),
  leadDays: integer("lead_days").notNull().default(14),
  /** 單件重量（克） */
  unitWeightG: real("unit_weight_g").notNull().default(0),
  /** 每箱數量與外箱尺寸（公分）、整箱毛重（公斤），用來算運費 */
  cartonQty: integer("carton_qty").notNull().default(0),
  cartonLengthCm: real("carton_length_cm").notNull().default(0),
  cartonWidthCm: real("carton_width_cm").notNull().default(0),
  cartonHeightCm: real("carton_height_cm").notNull().default(0),
  cartonWeightKg: real("carton_weight_kg").notNull().default(0),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  /** 依「顏色|尺碼」區分的成本級距 [[起始數量, 成本]...]；沒有價差的商品為空 */
  variantCosts: text("variant_costs", { mode: "json" }).$type<Record<string, [number, number][]>>(),
  /** 由成本換算出的各款式售價級距（同上結構） */
  variantPrices: text("variant_prices", { mode: "json" }).$type<Record<string, [number, number][]>>(),
  /** 每多印一個印刷面的加價：成本與換算後的售價（第一面已含在單價內） */
  extraFaceCost: real("extra_face_cost"),
  extraFacePrice: real("extra_face_price").notNull().default(0),
  costCurrency: text("cost_currency"),
  /** 熱銷排序（數字越大越熱門） */
  popularity: integer("popularity").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

/** 區間價格（素面商品單價） */
export const priceTiers = sqliteTable(
  "price_tiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    minQty: integer("min_qty").notNull(),
    unitPrice: real("unit_price").notNull(),
    /** 進貨成本（僅後台可見）。有成本價時，售價由毛利率自動換算 */
    unitCost: real("unit_cost"),
    /** 成本幣別（如 CNY）；空值代表與站台幣別相同 */
    costCurrency: text("cost_currency"),
  },
  (t) => [uniqueIndex("price_tiers_uq").on(t.productId, t.minQty)],
);

/** 印刷方式 */
export const printMethods = sqliteTable("print_methods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** true：單價與版費依「色數」倍增（如網版印刷） */
  perColor: integer("per_color", { mode: "boolean" }).notNull().default(false),
  maxColors: integer("max_colors").notNull().default(1),
  sort: integer("sort").notNull().default(0),
});

/** 印刷位置（產品的某一面），帶刀模與示意圖 */
export const printPositions = sqliteTable(
  "print_positions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** 刀模 SVG 網址與實際尺寸（mm） */
    dielineUrl: text("dieline_url"),
    widthMm: real("width_mm").notNull(),
    heightMm: real("height_mm").notNull(),
    /** 供應商要求的印刷檔像素尺寸（有填時依此輸出） */
    pxW: integer("px_w"),
    pxH: integer("px_h"),
    /** 示意圖底圖，以及刀模整面在底圖上的位置（0~1 比例） */
    mockupUrl: text("mockup_url"),
    mockupX: real("mockup_x").notNull().default(0),
    mockupY: real("mockup_y").notNull().default(0),
    mockupW: real("mockup_w").notNull().default(1),
    mockupH: real("mockup_h").notNull().default(1),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("print_positions_uq").on(t.productId, t.code)],
);

/** 印刷面積（某位置內可選的印刷範圍） */
export const printAreas = sqliteTable(
  "print_areas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    positionId: integer("position_id").notNull().references(() => printPositions.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    xMm: real("x_mm").notNull(),
    yMm: real("y_mm").notNull(),
    widthMm: real("width_mm").notNull(),
    heightMm: real("height_mm").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("print_areas_uq").on(t.positionId, t.code)],
);

/** 印刷報價：產品 × 印刷面積 × 印刷方式 × 數量級距 */
export const printPrices = sqliteTable(
  "print_prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    areaId: integer("area_id").notNull().references(() => printAreas.id, { onDelete: "cascade" }),
    methodId: integer("method_id").notNull().references(() => printMethods.id, { onDelete: "cascade" }),
    minQty: integer("min_qty").notNull(),
    unitPrice: real("unit_price").notNull(),
    setupFee: real("setup_fee").notNull().default(0),
  },
  (t) => [uniqueIndex("print_prices_uq").on(t.areaId, t.methodId, t.minQty), index("print_prices_product").on(t.productId)],
);

/** 全站設定（例如毛利率） */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const shippingZones = sqliteTable("shipping_zones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

/**
 * 運費級距。
 * air：以計費重（kg，實重與材積重取大）計，rate = 每公斤單價
 * sea：以計費體積（CBM，體積與 重量/1000 取大）計，rate = 每 CBM 單價
 */
export const shippingRates = sqliteTable(
  "shipping_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    zoneId: integer("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
    mode: text("mode", { enum: ["air", "sea"] }).notNull(),
    minUnits: real("min_units").notNull().default(0),
    rate: real("rate").notNull(),
    baseFee: real("base_fee").notNull().default(0),
    minCharge: real("min_charge").notNull().default(0),
    daysMin: integer("days_min").notNull().default(0),
    daysMax: integer("days_max").notNull().default(0),
  },
  (t) => [uniqueIndex("shipping_rates_uq").on(t.zoneId, t.mode, t.minUnits)],
);

/** 線上排版的設計稿 */
export const designs = sqliteTable("designs", {
  id: text("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  userId: integer("user_id").references(() => users.id),
  /** 每個位置的 fabric JSON 與輸出檔 */
  data: text("data", { mode: "json" })
    .$type<Record<string, { areaCode: string; json: unknown; printUrl: string | null; svgUrl: string | null; mockupUrl: string | null }>>()
    .notNull(),
  previewUrl: text("preview_url"),
  createdAt: integer("created_at").notNull().default(now),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNo: text("order_no").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", {
    enum: ["pending_payment", "reviewing", "in_production", "shipped", "completed", "cancelled"],
  }).notNull().default("pending_payment"),
  paymentMethod: text("payment_method").notNull().default("ecpay"),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  /** 金流的交易編號（例如綠界 TradeNo），對帳用 */
  paymentRef: text("payment_ref"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  company: text("company"),
  taxId: text("tax_id"),
  address: text("address").notNull(),
  zoneCode: text("zone_code").notNull(),
  zoneName: text("zone_name").notNull(),
  shippingMode: text("shipping_mode", { enum: ["air", "sea"] }).notNull(),
  note: text("note"),
  goodsTotal: real("goods_total").notNull(),
  printTotal: real("print_total").notNull(),
  setupTotal: real("setup_total").notNull(),
  shippingFee: real("shipping_fee").notNull(),
  tax: real("tax").notNull(),
  total: real("total").notNull(),
  totalWeightKg: real("total_weight_kg").notNull().default(0),
  totalCbm: real("total_cbm").notNull().default(0),
  trackingNo: text("tracking_no"),
  /** 郵遞區號（送單給供應商時必填） */
  postcode: text("postcode"),
  /** 訂單專屬連結的鑰匙：沒登入的訪客用「訂單網址 + key」查看與付款 */
  accessKey: text("access_key"),
  /** 未付款提醒信：已寄出幾封、上一封的時間。客戶按「不要再提醒」後 remindStopped 為 true */
  remindCount: integer("remind_count").notNull().default(0),
  remindAt: integer("remind_at"),
  remindStopped: integer("remind_stopped", { mode: "boolean" }).notNull().default(false),
  /** 付款成功的時間 */
  paidAt: integer("paid_at"),
  /** 下單時瀏覽器的 GA 用戶代碼、工作階段與廣告點擊代碼（伺服器補送轉換時用） */
  gaClientId: text("ga_client_id"),
  gaSessionId: text("ga_session_id"),
  gclid: text("gclid"),
  /** 「購買」轉換已送出的時間（瀏覽器送過或伺服器補送過），避免重複計算 */
  trackedAt: integer("tracked_at"),
  /** 下單的市場（tw / sg / my / au / ae / uk）與幣別；金額欄位都是這個幣別 */
  market: text("market").notNull().default("tw"),
  currency: text("currency").notNull().default("TWD"),
  city: text("city"),
  region: text("region"),
  country: text("country").notNull().default("TW"),
  /** 供應商（HiCustom）的訂單編號、狀態碼、訊息與最後同步時間 */
  supplierOrderId: text("supplier_order_id"),
  supplierStatus: integer("supplier_status"),
  supplierNote: text("supplier_note"),
  supplierCost: text("supplier_cost"),
  supplierSyncedAt: integer("supplier_synced_at"),
  createdAt: integer("created_at").notNull().default(now),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  colorName: text("color_name"),
  sizeName: text("size_name"),
  qty: integer("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
  /** 報價明細快照 */
  breakdown: text("breakdown", { mode: "json" }).$type<unknown>().notNull(),
  designId: text("design_id"),
  artworkUrl: text("artwork_url"),
  previewUrl: text("preview_url"),
  /** 供應商那邊合成好的定製產品編碼與款式 ID（重送時沿用，不重複建立） */
  supplierProductCode: text("supplier_product_code"),
  supplierStockId: integer("supplier_stock_id"),
});

/** 部落格文章 */
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  /** 這篇文章屬於哪個國家站（tw / us / sg / my / au / ae / uk） */
  market: text("market").notNull().default("tw"),
  title: text("title").notNull(),
  /** 摘要：列表頁與搜尋結果的說明文字 */
  excerpt: text("excerpt").notNull().default(""),
  /** 內文（Markdown） */
  content: text("content").notNull().default(""),
  coverUrl: text("cover_url"),
  coverAlt: text("cover_alt"),
  /** 搜尋結果標題／說明；留空就用文章標題與摘要 */
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  publishedAt: integer("published_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

/**
 * 商品評價。
 * verified：對得到本站一張已付款、已出貨的訂單，而且訂單裡有這件商品，前台才會標示「已驗證購買」。
 * source：customer＝買家在訂單頁自己寫的；import＝後台 Excel 批量匯入（每列都要有訂單編號）；admin＝後台單筆代登。
 */
/** 評價的 Excel 匯入紀錄：每上傳一個檔案一筆 */
export const reviewImports = sqliteTable("review_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("file_name").notNull().default(""),
  imported: integer("imported").notNull().default(0),
  createdAt: integer("created_at").notNull().default(now),
});

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    status: text("status", { enum: ["pending", "published", "hidden"] }).notNull().default("pending"),
    source: text("source", { enum: ["customer", "import", "admin"] }).notNull().default("customer"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    /** Excel 匯入的批次（reviewImports.id），用來整批刪除某次上傳的評價 */
    importId: integer("import_id"),
    /** 評價日期 */
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("reviews_order_product_uq").on(t.orderId, t.productId), index("reviews_product").on(t.productId, t.status)],
);
