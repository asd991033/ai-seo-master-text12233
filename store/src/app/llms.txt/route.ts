import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { site } from "@/config/site";
import { marketList, markets } from "@/config/markets";
import { t } from "@/i18n";
import { baseUrl } from "@/lib/seo";
import { listPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

/** 給 AI 搜尋與問答引擎的網站摘要（llms.txt）：這個網站是什麼、關鍵事實、主要頁面 */
export async function GET() {
  const base = baseUrl();
  const [cats, posts, [{ n }]] = await Promise.all([
    db.select({ name: schema.categories.name, slug: schema.categories.slug, n: sql<number>`count(${schema.products.id})` })
      .from(schema.categories).leftJoin(schema.products, eq(schema.products.categoryId, schema.categories.id)).groupBy(schema.categories.id),
    listPosts(30, "tw"),
    db.select({ n: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.active, true)),
  ]);
  const fs = markets.tw.shipping, cur = markets.tw.symbol;
  const body = `# ${site.brand}

> ${site.brand} 是台灣的客製化禮品線上商店：挑選商品、在網頁上直接排版並即時看到效果圖，就能下單訂製。共 ${n} 款可客製化商品，一件起訂。

## 重點資訊
- 服務內容：客製化印刷的禮品與周邊商品（服飾、包袋、杯具、居家用品、配件等），適合企業贈品、活動紀念品、團隊服裝與個人送禮。
- 起訂量：所有商品 1 件起訂；數量越多單價越低，商品頁選擇數量即顯示當下單價。
- 價格：網站上的價格皆為新台幣（TWD）含稅價，印刷費已包含在單價內。
- 線上排版：上傳圖片或加入文字後可拖曳、縮放、旋轉，並即時顯示多角度的商品效果圖；一件商品有多個印刷位置時可分別設計。
- 運費：每張訂單 ${cur}${fs.fee}，商品金額滿 ${cur}${fs.freeOver.toLocaleString("en-US")} 免運。
- 到貨時間：生產天數標示於各商品頁；出貨後運送約 ${fs.days} 個工作天。
- 付款方式：線上付款（綠界 ECPay），可使用信用卡、ATM 轉帳或超商付款。
- 檔案建議：300 dpi；Logo 請使用去背 PNG 或向量檔。
- 退換貨：商品皆為客製化製作，不適用七天鑑賞期；有製造瑕疵、印製與確認稿不符、品項錯誤或運送損壞時，收到後 7 天內聯絡可免費重製或退款。尚未進入生產前可取消並全額退款。
- 聯絡方式：電話 ${site.contactPhone}，信箱 ${site.contactEmail}，地址 ${site.address.full}。
- 語言與地區：繁體中文，服務台灣；另有英文版的海外站（見下方 International stores）。

## 主要頁面
- [全部商品](${base}/products)：依分類瀏覽與搜尋
- [訂購流程與印刷說明](${base}/guide)：訂購步驟、印刷方式、檔案準備、運送與常見問題
- [部落格](${base}/blog)：選品與檔案準備的教學文章
- [退換貨政策](${base}/returns)：客製化商品的退換貨、瑕疵處理與退款說明

## International stores (English)
${site.brand} also sells to these countries in English, with prices in local currency, card payment via Stripe and flat-rate delivery:
${marketList.filter((x) => x.locale === "en").map((x) => `- [${x.countryName}](${base}${x.prefix}): prices in ${x.currency}; delivery ${x.symbol}${x.shipping.fee} per order, free over ${x.symbol}${x.shipping.freeOver}; about ${x.shipping.days} working days after dispatch`).join("\n")}

## 商品分類
${cats.filter((c) => c.n > 0).sort((a, b) => b.n - a.n).map((c) => `- [${c.name}](${base}/products?category=${encodeURIComponent(c.slug)})：${c.n} 款`).join("\n")}

## 文章
${posts.map((p) => `- [${p.title}](${base}/blog/${p.slug})：${p.excerpt}`).join("\n")}

## 常見問題
${t.home.faq.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
