import { notFound } from "next/navigation";
import { initMarket } from "@/market/server";
import type { Metadata } from "next";
import { t } from "@/i18n";
import { getProductBySlug } from "@/lib/catalog";
import { DesignerLoader } from "@/components/designer/DesignerLoader";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.designer.title };
}

export default async function DesignPage({ params }: { params: Promise<{ slug: string }> }) {
  await initMarket();
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  return (
    <DesignerLoader
      product={{
        id: p.id, slug: p.slug, sku: p.sku, name: p.name, image: p.colors[0]?.image ?? p.images[0] ?? null, colors: p.colors,
        // 從 Shopify 進來時沒有經過本站商品頁：每個印刷面預設帶入第一個面積與印刷方式
        defaultPrints: p.positions.flatMap((x) => {
          const area = x.areas[0];
          const row = area && p.pricing.printPrices.find((r) => r.positionCode === x.code && r.areaCode === area.code);
          return row ? [{ positionCode: x.code, areaCode: area.code, methodCode: row.methodCode, colors: 1 }] : [];
        }),
        shopifyDomains: (process.env.SHOPIFY_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean),
        methods: p.methods.map((m) => ({ code: m.code, name: m.name, perColor: m.perColor })),
        positions: p.positions.map((x) => ({
          code: x.code, name: x.name, dielineUrl: x.dielineUrl, widthMm: x.widthMm, heightMm: x.heightMm, pxW: x.pxW, pxH: x.pxH,
          mockupUrl: x.mockupUrl, mockupX: x.mockupX, mockupY: x.mockupY, mockupW: x.mockupW, mockupH: x.mockupH,
          areas: x.areas.map((a) => ({ code: a.code, name: a.name, xMm: a.xMm, yMm: a.yMm, widthMm: a.widthMm, heightMm: a.heightMm })),
        })),
      }}
    />
  );
}
