import { site } from "@/config/site";

/** 網站對外的網址（結尾不含斜線） */
export function baseUrl() {
  return (process.env.SITE_URL ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
}
export const abs = (path: string) => (/^https?:/.test(path) ? path : `${baseUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

const ctx = "https://schema.org";

export const organizationLd = () => ({
  "@context": ctx, "@type": "Organization", "@id": `${baseUrl()}/#org`, name: site.brand, url: baseUrl(), logo: abs("/icon.svg"),
  contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: site.contactEmail, availableLanguage: ["zh-TW"] },
});

export const websiteLd = () => ({
  "@context": ctx, "@type": "WebSite", "@id": `${baseUrl()}/#website`, name: site.brand, url: baseUrl(), inLanguage: "zh-TW", publisher: { "@id": `${baseUrl()}/#org` },
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${baseUrl()}/products?q={search_term_string}` }, "query-input": "required name=search_term_string" },
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
  "@context": ctx, "@type": "BlogPosting", headline: p.title, description: p.excerpt, inLanguage: "zh-TW",
  mainEntityOfPage: abs(`/blog/${p.slug}`), url: abs(`/blog/${p.slug}`), ...(p.coverUrl ? { image: [abs(p.coverUrl)] } : {}),
  datePublished: new Date(p.publishedAt * 1000).toISOString(), dateModified: new Date(p.updatedAt * 1000).toISOString(),
  author: { "@type": "Organization", name: site.brand, url: baseUrl() }, publisher: { "@id": `${baseUrl()}/#org` },
});

/** 運送與退貨資訊（商品結構化資料用） */
export const shippingLd = () => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: Math.max(0, site.flatShipping.fee), currency: site.currency },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "TW" },
  deliveryTime: { "@type": "ShippingDeliveryTime", transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" } },
});
