import { test } from "node:test";
import assert from "node:assert/strict";
import { metaFromRequest, metaPurchaseEvent, normPhone, purchaseEventId, sha256 } from "./meta-track";

test("下單時從請求取出 _fbp、_fbc、IP 與瀏覽器字串；格式不對的不收", () => {
  const h = new Headers({ cookie: "_fbp=fb.1.1700000000000.1234567890; _fbc=fb.1.1700000000001.IwAR123abc; other=1", "x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "Mozilla/5.0 Test" });
  assert.deepEqual(metaFromRequest(h), { metaFbp: "fb.1.1700000000000.1234567890", metaFbc: "fb.1.1700000000001.IwAR123abc", clientIp: "203.0.113.9", clientUa: "Mozilla/5.0 Test" });
  assert.deepEqual(metaFromRequest(new Headers({ cookie: "_fbp=<script>" })), { metaFbp: null, metaFbc: null, clientIp: null, clientUa: null });
});

test("Purchase 事件：ID 與瀏覽器端相同、個資先雜湊、金額幣別與商品齊全", () => {
  const now = 1_800_000_000;
  const e = metaPurchaseEvent(
    { orderNo: "G1001", total: 2480, currency: "TWD", country: "TW", contactEmail: " Buyer@Example.com ", contactPhone: "+886 912-345-678", paidAt: now - 600, createdAt: now - 900, metaFbp: "fb.1.1.2", metaFbc: null, clientIp: "203.0.113.9", clientUa: "UA" },
    [{ sku: "HC-RQ6B4Q", qty: 2, unitPrice: 1160 }, { sku: "HC-RQ6B4Q", qty: 1 }], "https://shop.test/orders/G1001", now,
  );
  assert.equal(e.event_id, purchaseEventId("G1001"));
  assert.equal(e.event_id, "order_G1001");
  assert.equal(e.event_time, now - 600);
  assert.deepEqual(e.user_data.em, [sha256("buyer@example.com")]);
  assert.deepEqual(e.user_data.ph, [sha256("886912345678")]);
  assert.equal(e.user_data.fbp, "fb.1.1.2");
  assert.ok(!("fbc" in e.user_data));
  assert.deepEqual(e.custom_data, { value: 2480, currency: "TWD", order_id: "G1001", content_type: "product", content_ids: ["HC-RQ6B4Q"], contents: [{ id: "HC-RQ6B4Q", quantity: 2, item_price: 1160 }, { id: "HC-RQ6B4Q", quantity: 1 }], num_items: 3 });
  assert.ok(!JSON.stringify(e).includes("example.com"));
});

test("電話正規化；太舊的付款時間會被拉回 7 天內", () => {
  assert.equal(normPhone("0912-345-678"), "912345678");
  const now = 1_800_000_000;
  const e = metaPurchaseEvent({ orderNo: "A", total: 1, currency: "USD", country: "US", contactEmail: "a@b.co", contactPhone: "", paidAt: now - 30 * 86400, createdAt: 0, metaFbp: null, metaFbc: null, clientIp: null, clientUa: null }, [], "https://x", now);
  assert.ok(e.event_time > now - 7 * 86400 && e.event_time <= now);
  assert.ok(!("ph" in e.user_data));
});
