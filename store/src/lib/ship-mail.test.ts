import { test } from "node:test";
import assert from "node:assert/strict";
import { shipMail, trackingUrl } from "./ship-mail";

test("追蹤連結：依語系切換，單號會編碼", () => {
  assert.equal(trackingUrl(" YT123 456 ", "en"), "https://t.17track.net/en#nums=YT123%20456");
  assert.equal(trackingUrl("EE123TW", "zh-TW"), "https://t.17track.net/zh-hant#nums=EE123TW");
});

test("出貨通知信：台灣站中文、海外站英文，內容帶單號、物流商與訂單連結", () => {
  const base = { orderNo: "K1001", accessKey: "abc", contactName: "王小明", trackingNo: "YT999", trackingCarrier: "雲途 <A01>" };
  const items = [{ name: "帆布袋", qty: 2, colorName: "黑", sizeName: null }];
  const tw = shipMail({ ...base, market: "tw" }, items, "https://shop.test", "Kindmark");
  assert.match(tw.subject, /已出貨/);
  assert.equal(tw.orderUrl, "https://shop.test/orders/K1001?key=abc");
  assert.ok(tw.html.includes("YT999") && tw.html.includes("雲途 &lt;A01&gt;") && tw.html.includes("t.17track.net/zh-hant#nums=YT999"));
  assert.ok(tw.text.includes("帆布袋 × 2"));
  const sg = shipMail({ ...base, market: "sg", trackingCarrier: null }, items, "https://shop.test", "Kindmark");
  assert.match(sg.subject, /has shipped/);
  assert.equal(sg.orderUrl, "https://shop.test/sg/orders/K1001?key=abc");
  assert.ok(sg.html.includes("t.17track.net/en#nums=YT999") && !sg.html.includes("Carrier"));
});
