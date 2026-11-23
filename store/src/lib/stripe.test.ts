import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sessionParams, toMinor, verifyWebhook } from "./stripe";

test("金額換成最小單位", () => {
  assert.equal(toMinor(19.99), 1999);
  assert.equal(toMinor(0.07 * 3), 21);
  assert.equal(toMinor(120), 12000);
});

test("Checkout Session 欄位", () => {
  const p = sessionParams({ orderNo: "G1", total: 45.5, currency: "SGD", email: "a@b.co", successUrl: "https://x/sg/orders/G1?paid=1", cancelUrl: "https://x/sg/orders/G1", description: "Mug x 2" });
  assert.equal(p.get("line_items[0][price_data][unit_amount]"), "4550");
  assert.equal(p.get("line_items[0][price_data][currency]"), "sgd");
  assert.equal(p.get("metadata[orderNo]"), "G1");
  assert.equal(p.get("customer_email"), "a@b.co");
});

test("Webhook 簽章驗證", () => {
  const secret = "whsec_test", body = '{"id":"evt_1"}', ts = 1_700_000_000;
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  assert.equal(verifyWebhook(body, `t=${ts},v1=${sig}`, secret, ts + 10), true);
  assert.equal(verifyWebhook(body + " ", `t=${ts},v1=${sig}`, secret, ts + 10), false, "內容被改過");
  assert.equal(verifyWebhook(body, `t=${ts},v1=${sig}`, "whsec_other", ts + 10), false, "密鑰不對");
  assert.equal(verifyWebhook(body, `t=${ts},v1=${sig}`, secret, ts + 3600), false, "過期");
  assert.equal(verifyWebhook(body, null, secret, ts), false);
});
