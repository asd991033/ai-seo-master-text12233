import { NextResponse } from "next/server";
import { ecpayEnabled } from "@/lib/ecpay";
import { randomInt } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/auth";
import { trackingFromCookies } from "@/lib/ga-server";
import { metaFromRequest } from "@/lib/meta-track";
import { guestUserId, newAccessKey } from "@/lib/order-access";
import { priceCart, sanitizeLines } from "@/lib/checkout";
import { computeTotals } from "@/lib/pricing";
import { dictFor } from "@/i18n";
import { withMarket } from "@/market/server";
import { stripeEnabled } from "@/lib/stripe";
import { localize, type Market } from "@/config/markets";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
/** 只接受本站 /files/ 下的檔案路徑 */
const fileUrl = (v: unknown) => (typeof v === "string" && /^\/files\/[\w\-./%]+$/.test(v) && !v.includes("..") ? v : null);

function orderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `G${ymd}${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return withMarket(typeof body?.market === "string" ? body.market : null, (m) => placeOrder(body, m, { ...trackingFromCookies(req.headers.get("cookie")), ...metaFromRequest(req.headers) }));
}

async function placeOrder(body: Record<string, unknown> | null, m: Market, tracking: ReturnType<typeof trackingFromCookies> & ReturnType<typeof metaFromRequest>) {
  const E = dictFor(m).errors;
  // 沒登入也能下單（訪客結帳），訂單用專屬連結查看
  const user = await getUser();
  const userId = user?.id ?? (await guestUserId()), accessKey = newAccessKey();
  const lines = sanitizeLines(body?.items);
  if (!body || !lines?.length) return NextResponse.json({ error: E.emptyCart }, { status: 400 });

  const contact = {
    contactName: clip(body.contactName, 80), contactPhone: clip(body.contactPhone, 40), contactEmail: clip(body.contactEmail, 120),
    address: clip(body.address, 300), postcode: (m.code === "tw" ? clip(body.postcode, 10).replace(/\D/g, "") : clip(body.postcode, 12).toUpperCase()) || null,
    city: clip(body.city, 80) || null, region: clip(body.region, 80) || null, country: m.country, company: clip(body.company, 120) || null, taxId: clip(body.taxId, 20) || null, note: clip(body.note, 2000) || null,
  };
  if (!contact.contactName || !contact.contactPhone || !contact.address || (m.code !== "tw" && (!contact.city || !contact.postcode)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.contactEmail)) {
    return NextResponse.json({ error: E.incomplete }, { status: 400 });
  }
  const mode = body.mode === "sea" ? "sea" : "air";

  // 一律以伺服器重算的金額為準
  const priced = await priceCart(lines, clip(body.zoneCode, 20));
  const bad = priced.lines.find((l) => !l.ok);
  if (bad && !bad.ok) return NextResponse.json({ error: bad.error }, { status: 400 });
  const ship = priced.shipping.find((s) => s.mode === mode) ?? priced.shipping.find((s) => s.flat);
  const zone = priced.zones.find((z) => z.code === priced.zoneCode);
  if (!ship || !zone) return NextResponse.json({ error: E.noShip }, { status: 400 });
  const ok = priced.lines.flatMap((l) => (l.ok ? [l] : []));
  const totals = computeTotals(ok.map((l) => l.quote), ship.fee, 0);

  const raw = body.items as Record<string, unknown>[];
  const designIds = raw.map((r) => (typeof r.designId === "string" ? r.designId : null));
  const wanted = designIds.filter((x): x is string => !!x);
  const designs = wanted.length ? await db.select().from(schema.designs).where(inArray(schema.designs.id, wanted)) : [];

  const no = orderNo();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(schema.orders)
      .values({
        orderNo: no, userId, accessKey, ...tracking, ...contact, zoneCode: zone.code, zoneName: zone.name, shippingMode: mode, paymentMethod: m.payment, market: m.code, currency: m.currency, ...totals,
        totalWeightKg: priced.pack.weightKg, totalCbm: priced.pack.cbm,
      })
      .returning();
    await tx.insert(schema.orderItems).values(
      ok.map((l, i) => {
        const design = designs.find((d) => d.id === designIds[i] && d.productId === l.product.id);
        return {
          orderId: order.id, productId: l.product.id, sku: l.product.sku, name: l.product.name, colorName: clip(raw[i].colorName, 40) || null, sizeName: clip(raw[i].sizeName, 40) || null,
          qty: l.quote.qty, unitPrice: l.quote.unitAllIn, lineTotal: l.quote.total, breakdown: { quote: l.quote, labels: l.labels },
          designId: design?.id ?? null, previewUrl: design?.previewUrl ?? l.product.images[0] ?? null, artworkUrl: fileUrl(raw[i].artworkUrl),
        };
      }),
    );
  });
  // 有設定線上金流就直接帶去付款
  const payUrl = m.payment === "stripe" ? (stripeEnabled() ? `/api/stripe/pay?orderNo=${no}&key=${accessKey}` : null) : ecpayEnabled() ? `/api/ecpay/pay?orderNo=${no}&key=${accessKey}` : null;
  return NextResponse.json({ orderNo: no, payUrl, orderUrl: localize(`/orders/${no}?new=1&key=${accessKey}`, m) });
}
