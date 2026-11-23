import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";

const PRIVATE = ["/admin", "/api", "/cart", "/checkout", "/account", "/design", "/orders", "/d/", "/login", "/register"];
/** AI 搜尋與問答引擎的爬蟲：明確允許，讓它們能讀取並引用商品與文章內容 */
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"];

const ALL_PRIVATE = [...PRIVATE, ...["sg", "my", "au", "ae", "uk"].flatMap((c) => PRIVATE.filter((x) => !/^\/(admin|api|d\/)/.test(x)).map((x) => `/${c}${x}`))];

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ALL_PRIVATE }, { userAgent: AI_BOTS, allow: ["/", "/llms.txt"], disallow: ALL_PRIVATE }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
