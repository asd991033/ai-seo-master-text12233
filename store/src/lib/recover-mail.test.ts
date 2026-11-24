import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminder, recoverMail } from "./recover-mail";

const H = 3600, T0 = 1_700_000_000;
test("提醒時程：1、24、72 小時", () => {
  const o = (remindCount: number, remindAt: number | null) => ({ createdAt: T0, remindCount, remindAt });
  assert.equal(dueReminder(o(0, null), T0 + 0.5 * H), 0, "不到 1 小時不寄");
  assert.equal(dueReminder(o(0, null), T0 + 1.2 * H), 1);
  assert.equal(dueReminder(o(1, T0 + H), T0 + 5 * H), 0, "第二封要等到 24 小時");
  assert.equal(dueReminder(o(1, T0 + H), T0 + 25 * H), 2);
  assert.equal(dueReminder(o(2, T0 + 25 * H), T0 + 73 * H), 3);
  assert.equal(dueReminder(o(3, T0 + 73 * H), T0 + 100 * H), 0, "最多三封");
  assert.equal(dueReminder(o(0, null), T0 + 8 * 86400), 0, "超過七天不寄");
  assert.equal(dueReminder(o(1, T0 + 70 * H), T0 + 73 * H), 0, "兩封至少隔 12 小時");
});

test("提醒信內容依市場語系與幣別", () => {
  const items = [{ name: "Custom Tote <Bag>", qty: 2, lineTotal: 26.24, previewUrl: "/files/a.png", colorName: "Black", sizeName: null }];
  const en = recoverMail({ orderNo: "G1", accessKey: "k_1", market: "sg", currency: "SGD", contactName: "Amy", total: 41.24, shippingFee: 15 }, items, 1, "https://x.test", "Kindmark");
  assert.equal(en.payUrl, "https://x.test/sg/orders/G1?key=k_1");
  assert.equal(en.stopUrl, "https://x.test/api/recover/stop?orderNo=G1&key=k_1");
  assert.match(en.subject, /waiting for payment/);
  assert.match(en.html, /S\$41\.24/);
  assert.match(en.html, /Custom Tote &lt;Bag&gt;/, "品名要跳脫");
  assert.match(en.html, /https:\/\/x\.test\/files\/a\.png/);
  const zh = recoverMail({ orderNo: "G2", accessKey: null, market: "tw", currency: "TWD", contactName: "小明", total: 1049, shippingFee: 0 }, [], 3, "https://x.test", "Kindmark");
  assert.equal(zh.payUrl, "https://x.test/orders/G2");
  assert.match(zh.subject, /最後提醒/);
  assert.match(zh.html, /NT\$1,049/);
  assert.match(zh.text, /免運/);
});
