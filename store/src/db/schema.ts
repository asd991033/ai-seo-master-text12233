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
  colors: text("colors", { mode: "json" }).$type<{ name: string; hex: string }[]>().notNull().default([]),
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
  paymentMethod: text("payment_method").notNull().default("bank_transfer"),
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
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
  createdAt: integer("created_at").notNull().default(now),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  colorName: text("color_name"),
  qty: integer("qty").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
  /** 報價明細快照 */
  breakdown: text("breakdown", { mode: "json" }).$type<unknown>().notNull(),
  designId: text("design_id"),
  artworkUrl: text("artwork_url"),
  previewUrl: text("preview_url"),
});
