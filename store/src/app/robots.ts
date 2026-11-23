import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";

const PRIVATE = ["/admin", "/api", "/cart", "/checkout", "/account", "/design", "/orders", "/d/", "/login", "/register"];
/** AI 搜尋與問答引擎的爬蟲：明確允許，讓它們能讀取並引用商品與文章內容 */
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }, { userAgent: AI_BOTS, allow: ["/", "/llms.txt"], disallow: PRIVATE }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
