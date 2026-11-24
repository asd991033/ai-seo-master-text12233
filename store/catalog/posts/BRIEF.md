# Blog article brief — Kindmark (custom-printed gifts & merchandise, online store)

You write 5 blog articles for ONE country store. Output: 5 Markdown files in `catalog/posts/<market>/`, file name `<slug>.md`.

## File format (exactly)
```
---
slug: lowercase-hyphenated-english-slug        (unique, 3–7 words, include the main keyword; for country-specific topics include the country/city word)
title: Article title (H1), 50–65 characters for English / 20–32 字 for Chinese
excerpt: 1–2 sentence summary, 120–160 characters (Chinese: 60–100 字), states the answer the article gives
seoTitle: Search title, max 60 characters (Chinese max 30 字), main keyword first, no brand name
seoDescription: Meta description 140–155 characters (Chinese 70–80 字)
coverUrl: one of the allowed cover images below
coverAlt: plain description of what the cover photo shows, in the article language
---
Markdown body
```
Front-matter values are single-line plain text (no quotes needed, no line breaks).

## Body rules (SEO + GEO = being quoted by AI answer engines)
- 800–1,100 words (Chinese: 1,200–1,700 字). Body starts with a 2–3 sentence direct answer to the search intent — no "In today's world…" openers.
- Structure: `##` sections (5–7), `###` sub-points, bullet / numbered lists, short paragraphs. Do NOT write an H1 (`#`) — the title is rendered separately. No tables, no HTML, no images.
- Include one section that is a compact, self-contained definition or step list that an AI could quote verbatim.
- End with a section titled exactly `## FAQ` (Chinese: `## 常見問題`) containing 4–5 questions as `### Question?` followed by a 1–3 sentence answer paragraph. Questions must be ones real buyers in that country ask; answers must be consistent with the facts below.
- Internal links: 4–6 Markdown links using ROOT-RELATIVE paths WITHOUT any country prefix (the site adds /us, /sg … automatically). Allowed targets only:
  - `/products` (all products), `/guide` (how ordering works, print methods, artwork guidelines), `/returns` (returns policy), `/blog`
  - category pages `/products?category=<slug>` — slugs: Home & Living `c-229a0246` (blankets, cushions, tablecloths, towels, kitchen textiles; 370 products) · Bags `c-a56b2fcd` (totes, backpacks, pouches; 158) · Hats & Accessories `c-d78bfb69` (93) · Men's Clothing `c-9225cc69` (60) · Women's Clothing `c-6f9ad8f5` (42) · Kids' Clothing `c-3fb228fe` (38) · Sports & Leisure `c-4fb9201e` (46) · Car Accessories `c-9b15b479` (45) · Pet Supplies `c-092751bd` (43) · Holiday & Seasonal `c-eaba8078` (42) · Mugs, Tumblers & Bottles `c-51baa713` (33) · Tech Accessories `c-169b68e3` (mouse pads, desk mats, cases; 12)
  - search pages `/products?q=<one English word>` (e.g. `/products?q=tote`) — Chinese store: `/products?q=<中文詞>`
- No external links. Do not name competitors, marketplaces or other brands. Mention "Kindmark" at most 3 times.
- Write for humans first: concrete, practical, specific to the country (local occasions, seasons, working culture, spelling, units, currency). No keyword stuffing. No invented statistics, studies, awards, customer counts, testimonials or "X% of people". No claims about being the cheapest / fastest / best.
- Do NOT state legal, tax, customs-duty or VAT/GST thresholds or rules. If duties come up, say only: "import duties or taxes, if charged by local customs, are paid by the recipient".
- Do not promise delivery by a specific date; advise ordering early for dated events using the production + delivery times below.

## Facts you may state (and must not contradict)
- Online store for custom-printed products: about 990 products. Customers design online: upload a logo/image or add text, drag/scale/rotate, and see a live mockup preview of the product from several angles before ordering. Each print side can be designed separately.
- No minimum order: every product can be ordered from 1 piece. Unit price drops at higher quantities (price tiers shown on each product page, e.g. 1+, 5+, 15+, 50+, 100+, 300+). Printing is included in the unit price; no setup fee on these products.
- Most products are printed all-over / full-colour by transfer or dye-sublimation, so gradients and photos are fine and colour count does not change the price.
- Production time is shown on each product page (commonly around 5 working days), starting after payment.
- Artwork: 300 dpi recommended (150 dpi minimum), transparent PNG or vector for logos; the designer warns when resolution is low. Screen colours can differ slightly from the printed result.
- Returns: items are made to order, so no returns for change of mind; faulty, misprinted, wrong or transit-damaged items are remade or refunded free of charge if reported within 7 days of delivery with photos. Orders can be cancelled for a full refund before production starts.
- Things the store does NOT offer (never mention as available): embroidery, engraving on these products, physical pre-production samples other than ordering 1 piece, phone ordering, same-day/express delivery, gift wrapping, per-recipient addresses in one order, discount codes, B2B invoices on credit.
- Product reality check: stick to product types in the category list above. Do not describe specific products with invented specs, prices or materials. You may quote the delivery fee and threshold exactly; do not quote product prices.

## Allowed cover images
`/eg/hero-1.jpg` (assorted custom gifts on a desk) · `/eg/hero-2.jpg` (branded gift set) · `/eg/hero-3.jpg` (gifts for occasions) · `/eg/banner.jpg` (printing in progress) · `/eg/cat-all.jpg` (range of custom products) · `/eg/cat-bags.jpg` (bags) · `/eg/cat-bottles.jpg` (home goods) · `/eg/cat-drinkware.jpg` (mugs and bottles) · `/eg/cat-tech.jpg` (tech accessories) · `/eg/method-heat.jpg` (heat transfer printing) · `/eg/method-uv.jpg` (UV printing) · `/eg/step-2.jpg` (designing online) · `/eg/step-3.jpg` (checking a mockup) · `/eg/step-5.jpg` (delivery). Use a different cover for each of your 5 articles.

## Before you finish
Re-read each file: front matter complete, no `#` H1, FAQ section present with `###` questions, links only to allowed targets, no forbidden claims, word count in range. Final reply: list the 5 slugs and titles, nothing else.
