import { test } from "node:test";
import assert from "node:assert/strict";
import { purchasePayload, trackingFromCookies } from "./ga-track";

test("從 Cookie 取出 GA 與廣告點擊代碼", () => {
  const c = "foo=1; _ga=GA1.1.1234567890.1700000000; _ga_HCVD8K7Q07=GS2.1.s1763900000$o3$g1$t1763900500; _gcl_aw=GCL.1763900000.Cj0KCQ-abc_123";
  assert.deepEqual(trackingFromCookies(c, "G-HCVD8K7Q07"), { gaClientId: "1234567890.1700000000", gaSessionId: "1763900000", gclid: "Cj0KCQ-abc_123" });
  assert.equal(trackingFromCookies("_ga_HCVD8K7Q07=GS1.1.1700000123.2.1.1700000200.0.0.0", "G-HCVD8K7Q07").gaSessionId, "1700000123");
  assert.deepEqual(trackingFromCookies(null), { gaClientId: null, gaSessionId: null, gclid: null });
  assert.equal(trackingFromCookies("_ga=<script>").gaClientId, null);
});

test("purchase 事件內容", () => {
  const p = purchasePayload({ orderNo: "G1", total: 41.24, shippingFee: 15, currency: "SGD", gaClientId: "1.2", gaSessionId: "99", gclid: null }, [{ sku: "HC-AAA", name: "Tote", qty: 2, unitPrice: 13.12 }]);
  assert.equal(p.client_id, "1.2");
  const e = p.events[0];
  assert.equal(e.name, "purchase");
  assert.equal(e.params.transaction_id, "G1");
  assert.equal(e.params.currency, "SGD");
  assert.equal(e.params.session_id, "99");
  assert.deepEqual(e.params.items[0], { item_id: "HC-AAA", item_name: "Tote", quantity: 2, price: 13.12 });
  assert.equal(purchasePayload({ orderNo: "G2", total: 1, shippingFee: 0, currency: "TWD", gaClientId: null, gaSessionId: null, gclid: null }, []).client_id, "server.G2");
});
