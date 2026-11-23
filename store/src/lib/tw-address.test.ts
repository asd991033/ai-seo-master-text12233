import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTwAddress } from "./tw-address";

test("拆解台灣地址", () => {
  assert.deepEqual(parseTwAddress("台中市西屯區台灣大道三段99號"), { postcode: "", region: "TXG", city: "西屯區", street: "台灣大道三段99號" });
  assert.deepEqual(parseTwAddress("221 新北市汐止區新台五路一段99號A棟10樓之9"), { postcode: "221", region: "NWT", city: "汐止區", street: "新台五路一段99號A棟10樓之9" });
  assert.deepEqual(parseTwAddress("臺北市信義區市府路1號"), { postcode: "", region: "TPE", city: "信義區", street: "市府路1號" });
  assert.equal(parseTwAddress("新竹縣竹北市光明六路10號")?.region, "HSQ");
  assert.equal(parseTwAddress("新竹縣竹北市光明六路10號")?.city, "竹北市");
  assert.equal(parseTwAddress("嘉義市東區中山路1號")?.city, "東區");
});

test("看不出縣市或鄉鎮市區時回傳 null", () => {
  assert.equal(parseTwAddress("市府路1號"), null);
  assert.equal(parseTwAddress("東京都新宿區1-1"), null);
});
