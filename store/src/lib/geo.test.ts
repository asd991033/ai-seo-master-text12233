import { test } from "node:test";
import assert from "node:assert/strict";
import { countryOfIp, geoTarget } from "./geo";

const base = { path: "/", isRootMarket: true, method: "GET", accept: "text/html,application/xhtml+xml", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", done: false };

test("IP 查國家：IPv4 查得到，IPv6 與亂碼回傳 null", () => {
  assert.equal(countryOfIp("8.8.8.8"), "US");
  assert.equal(countryOfIp("168.95.1.1"), "TW");
  assert.equal(countryOfIp("::ffff:203.116.1.1"), "SG");
  assert.equal(countryOfIp("2001:4860:4860::8888"), null);
  assert.equal(countryOfIp("garbage"), null);
});

test("第一次進站依 IP 帶到該國家站；台灣與沒有站台的國家不跳", () => {
  assert.equal(geoTarget({ ...base, ip: "8.8.8.8" }), "us");
  assert.equal(geoTarget({ ...base, ip: "203.116.1.1" }), "sg");
  assert.equal(geoTarget({ ...base, ip: "175.139.142.25" }), "my");
  assert.equal(geoTarget({ ...base, ip: "1.128.0.1" }), "au");
  assert.equal(geoTarget({ ...base, ip: "81.2.69.142" }), "uk");
  assert.equal(geoTarget({ ...base, ip: "168.95.1.1" }), null);
  assert.equal(geoTarget({ ...base, ip: "5.62.60.1" }), null); // 捷克：沒有站台
  assert.equal(geoTarget({ ...base, ip: "8.8.8.8", path: "/products/hc-ri94io" }), "us");
});

test("不跳轉的情況：已經處理過、已在國家站、機器人、非瀏覽頁、非網頁請求", () => {
  const us = { ...base, ip: "8.8.8.8" };
  assert.equal(geoTarget({ ...us, done: true }), null);
  assert.equal(geoTarget({ ...us, isRootMarket: false }), null);
  assert.equal(geoTarget({ ...us, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }), null);
  assert.equal(geoTarget({ ...us, userAgent: "facebookexternalhit/1.1" }), null);
  assert.equal(geoTarget({ ...us, userAgent: "" }), null);
  for (const path of ["/orders/G123", "/checkout", "/cart", "/design/hc-x", "/blog/some-post", "/account", "/login"]) assert.equal(geoTarget({ ...us, path }), null, path);
  assert.equal(geoTarget({ ...us, method: "POST" }), null);
  assert.equal(geoTarget({ ...us, accept: "application/json" }), null);
});
