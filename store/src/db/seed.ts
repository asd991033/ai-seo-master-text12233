/**
 * 建立示範資料：分類、印刷方式、運費表、6 個示範商品（含刀模與示意圖）、管理員帳號。
 * 可重複執行（以代碼 upsert）。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { importCatalog, type ImportData } from "../lib/importer";
import { sampleAssets } from "./sample-assets";

const STORAGE = path.resolve(process.env.STORAGE_DIR ?? "./data/files");

async function asset(name: string, content: string) {
  const dir = path.join(STORAGE, "catalog");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), content);
  return `/files/catalog/${name}`;
}

const QTYS = [50, 100, 300, 500, 1000];
const FACTOR = [1, 0.86, 0.72, 0.62, 0.54];
const ladder = (base: number, qtys = QTYS) => qtys.map((q, i) => ({ minQty: q, unitPrice: Math.round(base * FACTOR[i] * 10) / 10 }));

async function main() {
  const demo = process.env.SEED_DEMO === "1" || (process.env.NODE_ENV !== "production" && process.env.SEED_DEMO !== "0");
  // ---- 分類（示範） ----
  const cats = demo ? [
    ["bags", "袋類"], ["drinkware", "杯瓶"], ["stationery", "文具"], ["apparel", "服飾"], ["packaging", "包裝禮盒"],
  ] as const : [];
  for (const [i, [slug, name]] of cats.entries()) {
    await db.insert(schema.categories).values({ slug, name, sort: i }).onConflictDoUpdate({ target: schema.categories.slug, set: { name, sort: i } });
  }

  // ---- 印刷方式 ----
  const methods = [
    { code: "screen", name: "網版印刷", description: "單色或少色 Logo 最划算，顏色飽和耐洗；每一色需開一版。", perColor: true, maxColors: 4 },
    { code: "dtf", name: "數位熱轉印（全彩）", description: "全彩、漸層、照片皆可，不限色數，小量也適合。", perColor: false, maxColors: 1 },
    { code: "uv", name: "UV 彩印", description: "直接噴印於硬質表面，全彩且帶微浮雕觸感。", perColor: false, maxColors: 1 },
    { code: "laser", name: "雷射雕刻", description: "金屬、木質、皮革表面永久雕刻，質感內斂不掉色。", perColor: false, maxColors: 1 },
    { code: "hotstamp", name: "燙金 / 燙銀", description: "金屬箔熱壓，精品感首選，適合 Logo 與線條。", perColor: false, maxColors: 1 },
    { code: "sublimation", name: "熱昇華", description: "滿版全彩、色彩滲入塗層，適合馬克杯等專用素材。", perColor: false, maxColors: 1 },
    { code: "transfer", name: "全彩轉印", description: "全彩滿版轉印，照片、漸層、滿版圖案都能完整呈現，一件起訂。", perColor: false, maxColors: 1 },
    { code: "heat", name: "燙畫", description: "圖案燙印於布料表面，色彩鮮明、手感平滑。", perColor: false, maxColors: 1 },
    { code: "dtg", name: "數位直噴", description: "直接噴印於布料纖維，透氣柔軟，適合棉質服飾。", perColor: false, maxColors: 1 },
  ];
  for (const [i, m] of methods.entries()) {
    await db.insert(schema.printMethods).values({ ...m, sort: i }).onConflictDoUpdate({ target: schema.printMethods.code, set: { ...m, sort: i } });
  }

  // ---- 運送區域與運費（示範費率，請到後台改成實際報價） ----
  const zones: [string, string, number, number, [number, number], [number, number]][] = [
    // code, name, 空運每公斤基準, 海運每 CBM 基準, 空運天數, 海運天數
    ["TW", "台灣", 95, 3200, [3, 5], [10, 14]],
    ["HKMO", "香港・澳門", 85, 2800, [2, 4], [7, 10]],
    ["JPKR", "日本・韓國", 130, 4200, [3, 6], [12, 18]],
    ["SEA", "東南亞", 120, 3800, [3, 6], [12, 20]],
    ["NA", "美國・加拿大", 230, 6500, [5, 8], [28, 40]],
    ["EU", "歐洲", 250, 7200, [6, 9], [35, 45]],
    ["AU", "澳洲・紐西蘭", 220, 6800, [5, 8], [25, 35]],
  ];
  for (const [i, [code, name, air, sea, airDays, seaDays]] of zones.entries()) {
    const [z] = await db.insert(schema.shippingZones).values({ code, name, sort: i })
      .onConflictDoUpdate({ target: schema.shippingZones.code, set: { name, sort: i } }).returning();
    await db.delete(schema.shippingRates).where(eq(schema.shippingRates.zoneId, z.id));
    const airTiers = [[0, 1], [21, 0.92], [45, 0.84], [100, 0.76], [300, 0.7]];
    const seaTiers = [[0, 1], [1, 0.9], [5, 0.8]];
    await db.insert(schema.shippingRates).values([
      ...airTiers.map(([minUnits, f]) => ({ zoneId: z.id, mode: "air" as const, minUnits, rate: Math.round(air * f), baseFee: 300, minCharge: 800, daysMin: airDays[0], daysMax: airDays[1] })),
      ...seaTiers.map(([minUnits, f]) => ({ zoneId: z.id, mode: "sea" as const, minUnits, rate: Math.round(sea * f), baseFee: 1500, minCharge: 3000, daysMin: seaDays[0], daysMax: seaDays[1] })),
    ]);
  }

  if (!demo) return seedAdmin();

  // ---- 示範商品 ----
  const data: ImportData = { products: [], tiers: [], areas: [], printPrices: [] };

  type Def = {
    key: keyof typeof sampleAssets; sku: string; name: string; category: string; summary: string; description: string; material: string; size: string;
    colors: string; moq: number; lead: number; weight: number; carton: [number, number, number, number, number]; base: number; featured?: boolean; qtys?: number[];
    positions: { code: string; name: string; w: number; h: number; areas: { code: string; name: string; rect: [number, number, number, number]; methods: Record<string, [number, number]> }[] }[];
  };

  const defs: Def[] = [
    {
      key: "tote", sku: "BAG-TOTE-12OZ", name: "12oz 厚磅帆布托特袋", category: "袋類", featured: true,
      summary: "活動贈品與品牌周邊的經典款，厚磅挺版、耐用可水洗。",
      description: "採用 12oz 純棉帆布，車線平整、提把加強車縫。\n正反兩面皆可印刷，支援單色網印到全彩熱轉印。",
      material: "12oz 純棉帆布", size: "38 × 42 cm，提把 60 cm", colors: "米白:#EFE7D8|經典黑:#1F1F1F|海軍藍:#22304F",
      moq: 50, lead: 12, weight: 180, carton: [100, 45, 40, 35, 19], base: 88,
      positions: ["front:正面", "back:背面"].map((s) => {
        const [code, name] = s.split(":");
        return {
          code, name, w: 380, h: 420,
          areas: [
            { code: "s", name: "小 10 × 10 cm", rect: [140, 150, 100, 100], methods: { screen: [9, 600], dtf: [22, 0] } },
            { code: "m", name: "中 20 × 20 cm", rect: [90, 110, 200, 200], methods: { screen: [14, 800], dtf: [38, 0] } },
            { code: "l", name: "滿版 28 × 30 cm", rect: [50, 70, 280, 300], methods: { screen: [20, 1200], dtf: [62, 0] } },
          ],
        };
      }),
    },
    {
      key: "mug", sku: "CUP-MUG-11OZ", name: "11oz 經典陶瓷馬克杯", category: "杯瓶", featured: true,
      summary: "企業贈禮常勝軍，熱昇華滿版全彩或網印單色 Logo。",
      description: "AAA 級白瓷塗層杯，可微波與洗碗機清洗。\n每個附獨立白盒，可加購客製彩盒。",
      material: "陶瓷（熱昇華塗層）", size: "口徑 8.2 cm × 高 9.5 cm，330 ml", colors: "亮面白:#FFFFFF",
      moq: 36, lead: 10, weight: 340, carton: [36, 42, 32, 24, 14.5], base: 96, qtys: [36, 108, 288, 504, 1008],
      positions: [{
        code: "front", name: "杯身正面", w: 90, h: 95,
        areas: [
          { code: "logo", name: "Logo 5 × 5 cm", rect: [20, 22.5, 50, 50], methods: { screen: [10, 700], sublimation: [18, 0] } },
          { code: "full", name: "滿版 8 × 8.5 cm", rect: [5, 5, 80, 85], methods: { sublimation: [26, 0] } },
        ],
      }],
    },
    {
      key: "bottle", sku: "CUP-FLASK-500", name: "500ml 不鏽鋼真空保溫瓶", category: "杯瓶", featured: true,
      summary: "316 不鏽鋼內膽，保冷保溫 12 小時；雷雕 Logo 永不脫落。",
      description: "雙層真空斷熱、防漏旋蓋。瓶身粉體烤漆，雷射雕刻後露出金屬底色，質感俐落。",
      material: "316 不鏽鋼內膽 / 304 外層", size: "直徑 7 cm × 高 22 cm", colors: "霧銀:#DCDFE2|石墨黑:#2B2B2B|森林綠:#2F4A3F",
      moq: 50, lead: 15, weight: 290, carton: [50, 42, 42, 26, 16.5], base: 265,
      positions: [{
        code: "body", name: "瓶身", w: 70, h: 180,
        areas: [
          { code: "s", name: "小 3 × 6 cm", rect: [20, 60, 30, 60], methods: { laser: [18, 300], uv: [28, 0] } },
          { code: "l", name: "大 4.5 × 11 cm", rect: [12.5, 35, 45, 110], methods: { laser: [30, 300], uv: [45, 0] } },
        ],
      }],
    },
    {
      key: "notebook", sku: "STA-NOTE-A5", name: "A5 精裝布面筆記本", category: "文具",
      summary: "布面硬殼精裝，燙金 Logo 低調有份量，會議與禮盒首選。",
      description: "內頁 100g 道林紙 96 張，附束帶與書籤帶。封面可燙金或 UV 滿版彩印。",
      material: "布面硬殼 / 100g 道林紙", size: "14.8 × 21 cm", colors: "墨綠:#2F4A3F|炭灰:#3A3A3A|酒紅:#6B2737",
      moq: 100, lead: 14, weight: 310, carton: [40, 46, 32, 22, 13.2], base: 150, qtys: [100, 200, 500, 1000, 2000],
      positions: [{
        code: "cover", name: "封面", w: 148, h: 210,
        areas: [
          { code: "logo", name: "Logo 6 × 4 cm", rect: [74, 155, 60, 40], methods: { hotstamp: [8, 900], uv: [16, 0] } },
          { code: "full", name: "滿版 13.8 × 20 cm", rect: [5, 5, 138, 200], methods: { uv: [42, 0] } },
        ],
      }],
    },
    {
      key: "tshirt", sku: "APP-TEE-200G", name: "200g 重磅純棉 T 恤", category: "服飾",
      summary: "精梳棉重磅版型，團體服與品牌周邊都挺。",
      description: "200g 精梳棉、雙針車縫、領口加厚不易變形。尺寸 S–2XL 可混搭（下單備註各尺寸數量）。",
      material: "100% 精梳棉 200g", size: "S / M / L / XL / 2XL", colors: "白:#FFFFFF|黑:#1A1A1A|霧灰:#9A9A9A|軍綠:#4A5240",
      moq: 30, lead: 12, weight: 230, carton: [60, 60, 40, 35, 14.8], base: 185, qtys: [30, 100, 300, 500, 1000],
      positions: ["front:正面", "back:背面"].map((s) => {
        const [code, name] = s.split(":");
        return {
          code, name, w: 600, h: 700,
          areas: [
            ...(code === "front" ? [{ code: "chest", name: "左胸 9 × 9 cm", rect: [340, 170, 90, 90] as [number, number, number, number], methods: { screen: [10, 600] as [number, number], dtf: [20, 0] as [number, number] } }] : []),
            { code: "a4", name: "A4 21 × 29.7 cm", rect: [195, 180, 210, 297], methods: { screen: [18, 900], dtf: [55, 0] } },
            { code: "a3", name: "A3 29.7 × 42 cm", rect: [151.5, 160, 297, 420], methods: { screen: [26, 1200], dtf: [85, 0] } },
          ],
        };
      }),
    },
    {
      key: "box", sku: "PKG-GIFTBOX-M", name: "牛皮紙天地蓋禮盒（中）", category: "包裝禮盒",
      summary: "為你的贈品加一層儀式感，上蓋可燙金或 UV 彩印。",
      description: "1200g 灰板裱牛皮紙，硬挺不塌。可搭配內襯與緞帶（請於備註說明）。\n排版時刀模會顯示展開圖：洋紅實線為裁切線、青色虛線為摺線。",
      material: "1200g 灰板 + 牛皮紙", size: "20 × 14 × 5 cm", colors: "原色牛皮:#C9A77A",
      moq: 100, lead: 18, weight: 210, carton: [50, 62, 44, 52, 12], base: 62, qtys: [100, 300, 500, 1000, 3000],
      positions: [{
        code: "lid", name: "上蓋展開圖", w: 460, h: 340,
        areas: [
          { code: "logo", name: "上蓋 Logo 10 × 6 cm", rect: [180, 140, 100, 60], methods: { hotstamp: [6, 900], uv: [12, 0] } },
          { code: "full", name: "上蓋滿版 19 × 13 cm", rect: [135, 105, 190, 130], methods: { uv: [24, 0] } },
        ],
      }],
    },
  ];

  for (const d of defs) {
    const a = sampleAssets[d.key];
    const mockupUrl = a.mockup ? await asset(`${d.sku}_mockup.svg`, a.mockup) : undefined;
    const dielineUrl = await asset(`${d.sku}_dieline.svg`, a.dieline);
    data.products.push({
      sku: d.sku, name: d.name, category: d.category, summary: d.summary, description: d.description, material: d.material, size: d.size,
      colors: d.colors, moq: d.moq, leadDays: d.lead, unitWeightG: d.weight, cartonQty: d.carton[0], cartonLengthCm: d.carton[1],
      cartonWidthCm: d.carton[2], cartonHeightCm: d.carton[3], cartonWeightKg: d.carton[4], featured: !!d.featured, images: mockupUrl,
    });
    const qtys = d.qtys ?? QTYS;
    qtys[0] = d.moq;
    data.tiers.push(...ladder(d.base, qtys).map((t) => ({ sku: d.sku, ...t })));
    for (const p of d.positions) {
      for (const ar of p.areas) {
        data.areas.push({
          sku: d.sku, positionCode: p.code, positionName: p.name, dielineWidthMm: p.w, dielineHeightMm: p.h, dielineUrl,
          ...(a.rect && mockupUrl ? { mockupUrl, mockupX: a.rect[0], mockupY: a.rect[1], mockupW: a.rect[2], mockupH: a.rect[3] } : {}),
          areaCode: ar.code, areaName: ar.name, xMm: ar.rect[0], yMm: ar.rect[1], widthMm: ar.rect[2], heightMm: ar.rect[3],
        });
        for (const [methodCode, [unit, setup]] of Object.entries(ar.methods)) {
          data.printPrices.push(...ladder(unit, qtys).map((t) => ({ sku: d.sku, positionCode: p.code, areaCode: ar.code, methodCode, minQty: t.minQty, unitPrice: t.unitPrice, setupFee: setup })));
        }
      }
    }
  }

  const res = await importCatalog(data);
  if (!res.ok) throw new Error("seed import failed:\n" + res.errors.join("\n"));
  console.log("catalog:", res.counts);

  await seedAdmin();
}

async function seedAdmin() {
  // ---- 管理員 ----
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "change-me-please");
  if (!password) return console.warn("ADMIN_PASSWORD not set; admin account not created");
  const salt = randomBytes(16);
  const passwordHash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!existing.length) {
    await db.insert(schema.users).values({ email, passwordHash, name: "管理員", role: "admin" });
    console.log(`admin created: ${email}`);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
