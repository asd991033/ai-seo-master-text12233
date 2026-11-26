import { site } from "@/config/site";
import { localize, marketList, markets, type Market } from "@/config/markets";
import { currentMarket } from "@/market/server";

/** 網站對外的網址（結尾不含斜線） */
export function baseUrl() {
  return (process.env.SITE_URL ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
}
/** 絕對網址。頁面路徑會加上目前市場的前綴（/sg…），圖片等檔案不加 */
export const abs = (path: string, m: Market = currentMarket()) => {
  if (/^https?:/.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl()}${/\.[a-z0-9]{2,5}$/i.test(p.split("?")[0]) ? p : localize(p, m)}`;
};
/** 頁面的 canonical 與各國版本（hreflang）。selfOnly：只存在於目前這個國家站的頁面（各國文章內容不同） */
export function alts(path: string, selfOnly = false) {
  const m = currentMarket();
  if (selfOnly) return { canonical: abs(path, m) };
  return { canonical: abs(path, m), languages: { ...Object.fromEntries(marketList.map((x) => [x.lang, abs(path, x)])), "x-default": abs(path, markets.tw) } };
}
const lang = () => currentMarket().lang;

const ctx = "https://schema.org";
/** 台灣市話／手機轉成國際格式（02-8789-9996 → +886-2-8789-9996） */
export const telE164 = (tel: string) => (/^0\d/.test(tel) ? `+886-${tel.slice(1)}` : tel);

export const organizationLd = () => ({
  "@context": ctx, "@type": "Organization", "@id": `${baseUrl()}/#org`, name: site.brand, url: baseUrl(), logo: abs("/icon.svg"),
  email: site.contactEmail, ...(currentMarket().locale === "en" ? {} : { telephone: telE164(site.contactPhone) }),
  // 海外站不輸出台灣的電話與地址
  ...(currentMarket().locale === "en" ? {} : { address: { "@type": "PostalAddress", streetAddress: site.address.street, addressLocality: site.address.locality, addressRegion: site.address.region, postalCode: site.address.postalCode, addressCountry: site.address.country } }),
  contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: site.contactEmail, areaServed: marketList.map((x) => x.country), availableLanguage: ["zh-TW", "en"] },
});

export const websiteLd = () => ({
  "@context": ctx, "@type": "WebSite", "@id": `${abs("/")}#website`, name: site.brand, url: abs("/"), inLanguage: lang(), publisher: { "@id": `${baseUrl()}/#org` },
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${abs("/products")}?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});

/** 麵包屑：[名稱, 路徑]，最後一項是目前頁面 */
export const breadcrumbLd = (items: [string, string][]) => ({
  "@context": ctx, "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});

export const faqLd = (items: readonly { q: string; a: string }[]) => ({
  "@context": ctx, "@type": "FAQPage",
  mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
});

export const itemListLd = (name: string, items: { name: string; path: string; image?: string | null }[]) => ({
  "@context": ctx, "@type": "ItemList", name, numberOfItems: items.length,
  itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, url: abs(x.path), ...(x.image ? { image: abs(x.image) } : {}) })),
});

export const articleLd = (p: { slug: string; title: string; excerpt: string; coverUrl: string | null; publishedAt: number; updatedAt: number }) => ({
  "@context": ctx, "@type": "BlogPosting", headline: p.title, description: p.excerpt, inLanguage: lang(),
  mainEntityOfPage: abs(`/blog/${p.slug}`), url: abs(`/blog/${p.slug}`), ...(p.coverUrl ? { image: [abs(p.coverUrl)] } : {}),
  datePublished: new Date(p.publishedAt * 1000).toISOString(), dateModified: new Date(p.updatedAt * 1000).toISOString(),
  author: { "@type": "Organization", name: site.brand, url: baseUrl() }, publisher: { "@id": `${baseUrl()}/#org` },
});

/** 運送與退貨資訊（商品結構化資料用） */
export const shippingLd = () => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: Math.max(0, currentMarket().shipping.fee), currency: currentMarket().currency },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: currentMarket().country },
  deliveryTime: { "@type": "ShippingDeliveryTime", transitTime: { "@type": "QuantitativeValue", minValue: Number(currentMarket().shipping.days.split(/[–-]/)[0]) || 3, maxValue: Number(currentMarket().shipping.days.split(/[–-]/)[1]) || 5, unitCode: "DAY" } },
});
