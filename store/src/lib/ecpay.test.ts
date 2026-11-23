import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMac, orderNoOf, tradeDate, tradeNo, verifyMac } from "./ecpay";

test("檢查碼與綠界文件的範例一致", () => {
  // 綠界技術文件「檢查碼機制」的範例
  const p = {
    TradeDesc: "促銷方案", PaymentType: "aio", MerchantTradeDate: "2013/03/12 15:30:23", MerchantTradeNo: "ecpay20130312153023", MerchantID: "2000132",
    ReturnURL: "https://www.ecpay.com.tw/receive.php", ItemName: "Apple iphone 7 手機殼", TotalAmount: 1000, ChoosePayment: "ALL", EncryptType: 1,
  };
  assert.equal(checkMac(p, "5294y06JbISpM5x9", "v77hoKGq4kWxNNIS"), "CFA9BDE377361FBDD8F160274930E815D1A8A2E3E80CE7D404C45FC9A0A1E407");
});

test("驗證回傳：正確的檢查碼通過，金額被改就不通過", () => {
  const p: Record<string, string> = { MerchantID: "1", MerchantTradeNo: "G20261123000001ABCDE", RtnCode: "1", TradeAmt: "543" };
  p.CheckMacValue = checkMac(p, "k", "v");
  assert.equal(verifyMac(p, "k", "v"), true);
  assert.equal(verifyMac({ ...p, TradeAmt: "1" }, "k", "v"), false);
});

test("交易編號每次不同、最多 20 碼，且能對回訂單編號", () => {
  const a = tradeNo("G20261123000001", 1_795_000_000_000), b = tradeNo("G20261123000001", 1_795_000_060_000);
  assert.notEqual(a, b);
  assert.ok(a.length <= 20 && /^[0-9A-Z]+$/.test(a));
  assert.equal(orderNoOf(a), "G20261123000001");
});

test("交易時間是台北時間", () => {
  assert.equal(tradeDate(new Date("2026-11-23T16:05:09Z")), "2026/11/24 00:05:09");
});
