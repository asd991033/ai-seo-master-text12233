import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";

/** 起始文章。只在該網址代稱還不存在時新增，之後在後台改過的內容不會被覆蓋 */
const POSTS: { slug: string; title: string; excerpt: string; coverUrl: string; coverAlt: string; content: string }[] = [
  {
    slug: "custom-gift-buying-guide",
    title: "客製化禮品怎麼挑？依場合、數量與預算的選品指南",
    excerpt: "企業贈品、活動紀念品、送客小禮各有不同的挑法。這篇用場合、數量、預算三個條件，幫你快速縮小範圍，並說明下單前該確認的事。",
    coverUrl: "/eg/hero-1.jpg",
    coverAlt: "桌面上排列的各式客製化禮品",
    content: `客製化禮品的選擇很多，最容易卡住的不是「有什麼可以做」，而是「哪一種適合這次的用途」。先回答下面三個問題，範圍就會小很多。

## 先確認三件事：場合、數量、預算

- **場合**：對象是客戶、員工，還是活動現場的來賓？對象決定了禮品要「實用」還是「有記憶點」。
- **數量**：數量會直接影響單價。本站所有商品都是一件起訂，數量越多單價越低，商品頁選好數量就會顯示當下的單價。
- **預算**：先抓每份禮品的預算上限，再回頭篩選品項，會比一開始就逛全部商品有效率。

## 依場合挑選

### 企業贈品與客戶禮
重點是「對方會留著用」。[環保杯、馬克杯與水壺](/products)、托特包、筆記用品這類每天用得到的品項，品牌露出的時間最長。

### 員工福利與團隊服裝
T 恤、帽 T、帽子適合做成團隊款。服裝類要留意尺寸，下單時可以在備註說明各尺寸的數量。

### 活動、展覽與快閃
需要一次發很多份時，選單價低、體積小、好攜帶的品項，例如鑰匙圈、徽章、杯墊、束口袋。

### 節慶與送禮
抱枕、毛毯、聖誕襪這類有節日感的品項，適合搭配專屬圖案做成限定款。

## 圖案放哪裡、放多大

每款商品可印的位置不一樣：有的只有正面一塊，有的整件都能印，也有前後片、袖子分開設計的。商品頁會列出可印的位置，進入線上排版後可以直接看到每個位置的印刷範圍。

> 小提醒：整面都印的商品，沒有放圖案的地方會是白色。想要整面有顏色，可以在排版時設定底色。

## 下單前的檢查清單

1. 圖案解析度夠不夠（排版時系統會提示）
2. 文字有沒有錯字、Logo 是不是最新版
3. 在效果圖上確認位置和大小
4. 數量與各尺寸是否正確
5. 需要的到貨日，是否留了生產與運送的時間

## 運費與到貨時間

每張訂單運費 NT$160，商品金額滿 NT$2,000 免運。生產天數標示在各商品頁，出貨後運送約 3–5 個工作天。有固定活動日期的話，建議至少提早兩週下單。`,
  },
  {
    slug: "print-file-preparation",
    title: "印刷檔案怎麼準備？解析度、去背與尺寸一次看懂",
    excerpt: "圖案印出來模糊、有白邊、位置跑掉，多半是檔案準備的問題。這篇整理解析度、去背、尺寸與顏色四個重點，照著做就能避開常見的失誤。",
    coverUrl: "/eg/method-uv.jpg",
    coverAlt: "印有品牌標誌的黑色行動電源",
    content: `同一張圖，在螢幕上看起來很清楚，印到商品上卻可能模糊或有白邊。原因幾乎都出在檔案本身。準備檔案時把握下面四件事就夠了。

## 解析度：以印刷尺寸來看

螢幕上清楚不代表印出來清楚，要看「圖片像素」和「實際印刷尺寸」的比例。

- 建議 **300 dpi**，最低不要低於 150 dpi。
- 每款商品的印刷區都有固定的像素尺寸，進入線上排版時會顯示在印刷區的左上角。
- 把圖片放大超過原始大小時，排版器會提示解析度不足，這時請換一張更大的原圖。

從社群軟體下載或截圖來的圖片通常被壓縮過，盡量使用設計師給的原始檔。

## 去背：Logo 請用透明背景

Logo 如果帶著白色底，印在有顏色的商品上就會出現一塊白色方框。

- 使用 **去背的 PNG**，或 AI、SVG、PDF 這類向量檔。
- JPG 不支援透明背景，不適合拿來當 Logo。

## 尺寸與位置：在排版器裡確認

上傳圖片後可以直接拖曳、縮放、旋轉。幾個實用的功能：

- **等比放入**：整張圖完整放進印刷範圍。
- **鋪滿印刷範圍**：讓圖填滿整個印刷區，適合滿版圖案。
- **水平置中、垂直置中**：快速對齊。

重要的文字和 Logo 不要貼著印刷範圍的邊緣，留一點距離比較保險。

## 顏色：螢幕和實品會有差異

螢幕是發光的，印刷品是反光的，同一個顏色看起來不會完全一樣；不同材質（陶瓷、布料、金屬）的呈色也不同。品牌色要求嚴格的話，下單時請在備註寫上色號，我們審稿時會留意。

## 效果圖怎麼看

排版時右側會即時顯示商品效果圖，可以切換不同角度。效果圖用來確認「位置、比例、整體感覺」；實際顏色與細節仍以審稿確認為準。

## 常見問題

### 可以先下單、之後再補檔案嗎？
可以。結帳時可以選擇稍後提供稿件，我們確認檔案後才會開始生產。

### 一件商品可以印好幾個位置嗎？
可以，只要該商品有多個可印位置。在商品頁勾選要印的位置，排版時每個位置分開設計。`,
  },
  {
    slug: "mug-tumbler-bottle-guide",
    title: "馬克杯、保溫杯、環保杯怎麼選？客製杯款比較與挑選重點",
    excerpt: "同樣是杯子，材質、保溫效果、可印範圍差很多。這篇比較馬克杯、保溫杯、吸管杯與水壺的差異，並說明各自適合的送禮場合。",
    coverUrl: "/eg/cat-drinkware.jpg",
    coverAlt: "各種款式的客製化杯子與水壺",
    content: `杯子是最常被選為客製禮品的品項之一，因為每天用得到、放在桌上看得到。不過「杯子」其實包含很多種，選錯類型，收到的人可能用不上。

## 四種常見杯款

### 陶瓷馬克杯
最經典的選擇。適合放在辦公桌或家裡使用，表面平整，圖案的色彩表現好。有些款式可以整圈印滿，也有內層或杯緣有顏色的雙色款，以及遇熱才顯示圖案的變色杯。

### 保溫杯與保溫瓶
不鏽鋼材質，能維持飲品的溫度，適合通勤、外出。杯身多半是圓柱形，圖案可以環繞一整圈。

### 吸管杯與冰霸杯
容量大，適合喝冷飲。通常附吸管與杯蓋，放在車上或桌上都方便。

### 運動水壺
輕、好攜帶，適合運動、戶外活動與團隊使用。

## 怎麼依用途挑選

- **送客戶、放辦公室**：陶瓷馬克杯，或質感較好的保溫杯。
- **員工福利、通勤族**：保溫杯、吸管杯。
- **運動社團、戶外活動**：運動水壺。
- **節日禮盒**：有禮盒包裝的馬克杯款式，收到就能直接送人。

## 設計杯子圖案的三個重點

1. **留意握把的位置**：有握把的杯子，圖案通常分成握把兩側，或是繞一圈但在握把處接合。排版時效果圖會顯示實際的樣子。
2. **整圈圖案要注意接縫**：環繞一圈的設計，頭尾會在某處相接，盡量讓背景是可以自然銜接的圖樣或純色。
3. **文字不要太小**：杯身是曲面，太小的字不容易閱讀，重要資訊放在正面。

## 訂購數量與價格

所有杯款都是一件起訂，適合先做一個確認效果，再追加數量；數量越多單價越低，商品頁選好數量就能看到單價。每張訂單運費 NT$160，滿 NT$2,000 免運。

想看有哪些款式，可以到[全部商品](/products)的「環保杯/馬克杯/水壺」分類瀏覽。`,
  },
];

/** 讀取 catalog/posts/<國家>/*.md（開頭是 key: value 的檔頭，--- 之後是 Markdown 內文） */
function filePosts() {
  const root = path.join(process.cwd(), "catalog", "posts");
  const out: ((typeof POSTS)[number] & { market: string; seoTitle: string | null; seoDescription: string | null })[] = [];
  if (!existsSync(root)) return out;
  for (const market of readdirSync(root)) {
    const dir = path.join(root, market);
    if (!/^[a-z]{2}$/.test(market) || !statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
      const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(readFileSync(path.join(dir, f), "utf8").replace(/\r/g, ""));
      if (!m) continue;
      const head: Record<string, string> = {};
      for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) head[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ""); }
      if (!head.slug || !head.title) continue;
      out.push({ market, slug: head.slug, title: head.title, excerpt: head.excerpt ?? "", coverUrl: head.coverUrl ?? "/eg/hero-1.jpg", coverAlt: head.coverAlt ?? head.title, seoTitle: head.seoTitle || null, seoDescription: head.seoDescription || null, content: m[2].trim() });
    }
  }
  return out;
}

/**
 * 2026-11 海外站調整運費後，把已經發布的各國文章裡提到的舊運費與免運門檻換成新的數字（只做一次）。
 * 文章只在第一次建立時寫入資料庫，之後改檔案不會同步，所以要直接更新資料庫裡的內容。
 */
const SHIPPING_V2: Record<string, [RegExp, string][]> = {
  us: [[/\$150\b/g, "$75"], [/\$15\b/g, "$6.99"]],
  uk: [[/£120\b/g, "£50"], [/£12\b/g, "£4.99"]],
  au: [[/A\$200\b/g, "A$99"], [/A\$20\b/g, "A$9.99"]],
  sg: [[/S\$150\b/g, "S$80"], [/S\$15\b/g, "S$9.90"]],
  my: [[/RM400\b/g, "RM200"], [/RM39\b/g, "RM22"]],
  ae: [[/AED 550\b/g, "AED 300"], [/AED 55\b/g, "AED 32"]],
};
async function applyShippingV2() {
  const KEY = "posts_shipping_v2";
  const [done] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  if (done) return;
  let changed = 0;
  for (const [market, rules] of Object.entries(SHIPPING_V2)) {
    const fix = (t: string | null) => (t == null ? t : rules.reduce((x, [re, to]) => x.replace(re, () => to), t));
    for (const p of await db.select().from(schema.posts).where(eq(schema.posts.market, market))) {
      const next = { content: fix(p.content)!, excerpt: fix(p.excerpt)!, seoDescription: fix(p.seoDescription) };
      if (next.content === p.content && next.excerpt === p.excerpt && next.seoDescription === p.seoDescription) continue;
      await db.update(schema.posts).set(next).where(eq(schema.posts.id, p.id));
      changed++;
    }
  }
  await db.insert(schema.settings).values({ key: KEY, value: String(changed) }).onConflictDoNothing();
  if (changed) console.log(`[posts] updated shipping amounts in ${changed} post(s)`);
}

export async function seedPosts() {
  for (const p of POSTS) {
    const hit = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, p.slug));
    if (!hit.length) await db.insert(schema.posts).values(p);
  }
  // 各國文章：只新增還不存在的網址代稱，後台改過的內容不會被覆蓋。發布時間依序錯開，列表順序才固定
  const now = Math.floor(Date.now() / 1000);
  let n = 0;
  for (const p of filePosts()) {
    const hit = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, p.slug));
    if (!hit.length) { await db.insert(schema.posts).values({ ...p, publishedAt: now - n * 60, updatedAt: now - n * 60 }); n++; }
  }
  await applyShippingV2();
}
