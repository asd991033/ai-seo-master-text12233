import test from "node:test";
import assert from "node:assert/strict";
import { averageRating, canReviewOrder, cleanReview, parseRating, parseReviewDate } from "./review-rules";

test("parseRating 只接受 1–5 的整數", () => {
  assert.equal(parseRating("5"), 5);
  assert.equal(parseRating(1), 1);
  for (const bad of ["0", "6", "4.5", "", "abc", null]) assert.equal(parseRating(bad), null);
});

test("parseReviewDate 解析日期並擋掉不存在的日期", () => {
  assert.equal(parseReviewDate(""), undefined);
  assert.equal(parseReviewDate("2026-02-30"), null);
  assert.equal(parseReviewDate("yesterday"), null);
  assert.equal(new Date(parseReviewDate("2026/3/5")! * 1000).toISOString().slice(0, 10), "2026-03-05");
  assert.equal(new Date(parseReviewDate("2026-03-05T00:00:00.000Z")! * 1000).toISOString().slice(0, 10), "2026-03-05");
});

test("cleanReview 檢查必填與長度", () => {
  assert.deepEqual(cleanReview({ authorName: " Amy ", rating: "4", title: "", body: " Good\r\nprint " }), { ok: true, value: { authorName: "Amy", rating: 4, title: "", body: "Good\nprint" } });
  assert.equal(cleanReview({ authorName: "", rating: 5, body: "x" }).ok, false);
  assert.equal(cleanReview({ authorName: "A", rating: 7, body: "x" }).ok, false);
  assert.equal(cleanReview({ authorName: "A", rating: 5, body: "" }).ok, false);
  assert.equal(cleanReview({ authorName: "A", rating: 5, body: "x".repeat(2001) }).ok, false);
});

test("canReviewOrder 只有已付款且已出貨／完成的訂單可以評價", () => {
  assert.equal(canReviewOrder({ paid: true, status: "shipped" }), true);
  assert.equal(canReviewOrder({ paid: true, status: "completed" }), true);
  assert.equal(canReviewOrder({ paid: true, status: "in_production" }), false);
  assert.equal(canReviewOrder({ paid: false, status: "completed" }), false);
});

test("averageRating", () => {
  assert.equal(averageRating(0, 0), 0);
  assert.equal(averageRating(14, 3), 4.7);
});
