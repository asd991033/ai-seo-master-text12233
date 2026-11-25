import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { originalOption } from "@/lib/localize";
import { localPhone } from "@/config/markets";
import { HC_STATUS, HicustomError, createOrder, getOrder, hcDesignOf, hicustomConfig, parseTwAddress, productTypeInfo, readSiteFile, shrinkPrintFile, synthesizeProduct, uploadGallery, type SynthCfg } from "@/lib/hicustom";

const now = () => Math.floor(Date.now() / 1000);
const note = (id: number, text: string) => db.update(schema.orders).set({ supplierNote: text.slice(0, 1000), supplierSyncedAt: now() }).where(eq(schema.orders.id, id));

/** 把一張訂單送到 HiCustom：上傳印刷圖 → 合成定製產品 → 建立訂單。失敗時把原因記在訂單上 */
const CLAIM = "送單處理中…";
export async function sendOrderToSupplier(id: number, opts: { postcode?: string; logistics?: string; manual?: boolean } = {}) {
  // 先標記「處理中」再開始：綠界可能重複通知，避免同一張訂單被送兩次。後台手動送單不受這個標記限制
  if (!opts.manual) {
    const claimed = await db.update(schema.orders).set({ supplierNote: CLAIM, supplierSyncedAt: now() })
      .where(and(eq(schema.orders.id, id), isNull(schema.orders.supplierOrderId), isNull(schema.orders.supplierNote))).returning({ id: schema.orders.id });
    if (!claimed.length) return;
  }
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) return;
  const done = () => undefined;
  if (opts.manual && order.supplierNote === CLAIM && now() - (order.supplierSyncedAt ?? 0) < 10 * 60) return;
  // 手動送單也先標記處理中，畫面上看得到進度，也避免和定時工作同時送
  if (opts.manual && !order.supplierOrderId) await note(id, CLAIM);
  const cfg = hicustomConfig();
  if (!cfg?.storeId) { await note(id, "尚未設定 HiCustom 憑證或店鋪編號"); return done(); }
  if (order.supplierOrderId) { await note(id, "這張訂單已經送過了，請用「同步狀態」更新"); return done(); }
  const postcode = order.country !== "TW" ? (opts.postcode ?? "").trim().slice(0, 12) : (opts.postcode ?? "").replace(/\D/g, "").slice(0, 6);
  const overseas = order.country !== "TW";
  const addr = overseas ? { region: order.region || order.city || "", city: order.city || "", street: order.address, postcode: order.postcode ?? "" } : parseTwAddress(order.address);
  if (!addr) { await note(id, "無法從收件地址判斷縣市與鄉鎮市區，請確認地址格式（例：台北市信義區市府路1號）"); return done(); }
  const zip = postcode || order.postcode || addr.postcode;
  if (!zip) { await note(id, "請填寫郵遞區號再送出"); return done(); }
  if (postcode && postcode !== order.postcode) await db.update(schema.orders).set({ postcode }).where(eq(schema.orders.id, id));

  try {
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
    const lines: Record<string, unknown>[] = [];
    for (const it of items) {
      let code = it.supplierProductCode, stockId = it.supplierStockId;
      if (!code || !stockId) {
        const [product] = await db.select().from(schema.products).where(eq(schema.products.id, it.productId));
        const typeId = Number(/\/item\/(\d+)/.exec(product?.sourceUrl ?? "")?.[1]);
        if (!product || !typeId) throw new HicustomError(`「${it.name}」不是 HiCustom 的商品，無法自動送單`);
        const [design] = it.designId ? await db.select().from(schema.designs).where(eq(schema.designs.id, it.designId)) : [];
        if (!design) throw new HicustomError(`「${it.name}」沒有線上排版的設計檔（客戶選擇稍後提供稿件或自行上傳），請到 HiCustom 後台手動處理`);
        const [hc, info, positions] = await Promise.all([
          hcDesignOf(product.sku), productTypeInfo(typeId),
          db.select().from(schema.printPositions).where(eq(schema.printPositions.productId, product.id)).orderBy(asc(schema.printPositions.sort), asc(schema.printPositions.id)),
        ]);
        if (!hc) throw new HicustomError(`「${it.name}」缺少供應商的排版資料`);
        // 顏色：先比色碼，再比順序；尺寸：比順序
        const colors = (product.colors ?? []) as { name: string; hex: string }[], sizes = (product.sizes ?? []) as string[];
        const ci = originalOption(colors.map((c) => c.name), it.colorName), hex = (colors[ci]?.hex ?? "").replace("#", "").toLowerCase();
        const colorId = (hc.colors.find((c) => c.hex && c.hex.toLowerCase() === hex) ?? hc.colors[ci] ?? hc.colors[0])?.id ?? info.colors[0]?.id;
        const si = originalOption(sizes, it.sizeName), sizeId = (info.sizes[si] ?? info.sizes[0])?.id;
        const stock = info.stock_info.find((s) => s.color_id === colorId && s.size_id === sizeId) ?? (info.stock_info.length === 1 ? info.stock_info[0] : undefined);
        if (!stock) throw new HicustomError(`「${it.name}」找不到對應的款式（${it.colorName ?? ""} ${it.sizeName ?? ""}）`);
        const cfgs: SynthCfg[] = [];
        for (const [posCode, d] of Object.entries(design.data)) {
          const idx = positions.findIndex((p) => p.code === posCode), view = hc.views[idx];
          if (!view || !d.printUrl) continue;
          const file = await readSiteFile(d.printUrl);
          if (!file) throw new HicustomError(`「${it.name}」的印刷檔讀取失敗（${posCode}）`);
          const area = info.product_description?.print_areas?.find((a) => a.id === view.id);
          const small = await shrinkPrintFile(file);
          const gallery = await uploadGallery(small.data, `${order.orderNo}-${it.id}-${posCode}.${small.ext}`, `${order.orderNo}-${it.id}-${posCode}`, small.type);
          // 印刷檔與供應商的印刷區同比例：放在原點、寬高等於印刷區，就會剛好填滿
          cfgs.push({ view_id: view.id, gallery_code: gallery, width: area?.width ?? Math.ceil(view.pa.pxW), height: area?.height ?? Math.ceil(view.pa.pxH), top_x: 0, top_y: 0 });
        }
        if (!cfgs.length) throw new HicustomError(`「${it.name}」沒有可用的印刷檔`);
        code = await synthesizeProduct(typeId, colorId ?? null, cfgs, `${order.orderNo}-${it.id}`);
        stockId = stock.id;
        await db.update(schema.orderItems).set({ supplierProductCode: code, supplierStockId: stockId }).where(eq(schema.orderItems.id, it.id));
      }
      lines.push({ product_code: code, stock_item_id: stockId, qty: it.qty, out_item_id: `${order.orderNo}-${it.id}`, ...(overseas ? {} : { price: it.unitPrice, total: it.lineTotal }), product_name: it.name });
    }
    const fmt = (ts: number) => new Date((ts + 8 * 3600) * 1000).toISOString().slice(0, 19).replace("T", " ");
    // 物流方式：有指定就用指定的名稱，否則由 HiCustom 依帳號的預設規則配對
    // 海外訂單不套用台灣的預設物流（E特快），可用 HICUSTOM_LOGISTICS_SG 這類變數指定各國的物流名稱
    const logistics = (opts.logistics ?? "").trim().slice(0, 60) || (overseas ? process.env[`HICUSTOM_LOGISTICS_${order.country}`]?.trim() : process.env.HICUSTOM_LOGISTICS?.trim()) || "";
    const res = await createOrder({
      ...(logistics ? { logistics_company_name: logistics } : {}),
      order_items: lines, out_order_id: order.orderNo, store_id: cfg.storeId, ...(overseas ? {} : { currency_code: 11 }), remark: (order.note ?? "").slice(0, 200),
      order_time: fmt(order.createdAt), payment_time: fmt(order.createdAt), ...(overseas ? {} : { subtotal: order.goodsTotal + order.printTotal, shipping_amount: order.shippingFee, grand_total: order.total }),
      address: { country: order.country, region: addr.region, city: addr.city, area: "", street: addr.street, postcode: zip, mobile_phone: overseas ? order.contactPhone.replace(/\s/g, "") : localPhone(order.contactPhone, "+886"), firstname: order.contactName, lastname: "", email: order.contactEmail },
    });
    await db.update(schema.orders).set({
      supplierOrderId: res.order_id, supplierStatus: res.status, supplierSyncedAt: now(),
      supplierCost: res.platform_grand_total ? `¥${res.platform_grand_total}（貨款 ¥${res.platform_subtotal}＋運費 ¥${res.platform_shipping_amount}）` : null,
      supplierNote: (res.error_msg || "").replace(/<br\s*\/?>/g, "；") || "已建立，請到 HiCustom 後台完成付款後才會開始生產",
    }).where(eq(schema.orders.id, id));
  } catch (e) {
    await note(id, e instanceof HicustomError ? e.message : `送單失敗：${(e as Error).message}`);
  }
  done();
}

/** 向 HiCustom 查詢這張訂單的狀態與物流單號，並回寫到本站訂單 */
export async function syncOrderFromSupplier(id: number) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order?.supplierOrderId) return;
  try {
    const res = await getOrder(order.supplierOrderId);
    const track = res.logistic_info?.shipping_track_number || res.logistic_info?.channel_tracking_number || "";
    // 供應商確認生產／發貨後，同步推進本站的訂單狀態（不會往回退）
    let status = order.status;
    if (res.status === 9 && ["reviewing", "in_production", "pending_payment"].includes(status)) status = "shipped";
    else if ([5, 8].includes(res.status) && status === "reviewing") status = "in_production";
    await db.update(schema.orders).set({
      supplierStatus: res.status, supplierSyncedAt: now(), status, trackingNo: track || order.trackingNo, trackingCarrier: res.logistic_info?.logistics_company_name?.trim().slice(0, 80) || order.trackingCarrier,
      supplierCost: res.platform_grand_total ? `¥${res.platform_grand_total}（貨款 ¥${res.platform_subtotal}＋運費 ¥${res.platform_shipping_amount}）` : order.supplierCost,
      supplierNote: (res.error_msg || "").replace(/<br\s*\/?>/g, "；") || `${HC_STATUS[res.status] ?? res.status}${res.logistic_info?.logistics_company_name ? `・${res.logistic_info.logistics_company_name}` : ""}`,
    }).where(eq(schema.orders.id, id));
  } catch (e) {
    await note(id, `同步失敗：${(e as Error).message}`);
  }
}

/** 定時工作：同步所有已送單、還沒結束的訂單（物流單號、生產與出貨狀態） */
export async function syncAllFromSupplier() {
  if (!hicustomConfig()) return 0;
  const rows = await db.select({ id: schema.orders.id }).from(schema.orders)
    .where(and(isNotNull(schema.orders.supplierOrderId), inArray(schema.orders.status, ["pending_payment", "reviewing", "in_production", "shipped"])));
  for (const r of rows) { await syncOrderFromSupplier(r.id); await new Promise((res) => setTimeout(res, 400)); }
  return rows.length;
}

/** 定時工作的補救：客戶已付款、但自動送單當下沒送出去（例如服務剛好重啟）的訂單，再送一次。已記錄失敗原因的不重送，交給人工處理 */
export async function sendPendingToSupplier() {
  if (!hicustomConfig()?.storeId) return 0;
  const rows = await db.select({ id: schema.orders.id }).from(schema.orders)
    .where(and(eq(schema.orders.paid, true), isNull(schema.orders.supplierOrderId), isNull(schema.orders.supplierNote), eq(schema.orders.status, "reviewing")));
  for (const r of rows) await sendOrderToSupplier(r.id);
  return rows.length;
}
