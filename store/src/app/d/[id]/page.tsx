import { notFound } from "next/navigation";
import { initMarket } from "@/market/server";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: "設計檔案", robots: { index: false, follow: false } };
}

/** 設計稿檔案頁：供店家從訂單上的連結下載印刷檔（網址含隨機編號，不公開列出） */
export default async function DesignFiles({ params }: { params: Promise<{ id: string }> }) {
  await initMarket();
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) notFound();
  const [d] = await db.select().from(schema.designs).where(eq(schema.designs.id, id));
  if (!d) notFound();
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, d.productId));
  const positions = await db.select().from(schema.printPositions).where(eq(schema.printPositions.productId, d.productId));
  const link = "rounded-full border border-line bg-white px-4 py-1.5 text-sm hover:border-ink";
  return (
    <div className="container-x max-w-3xl py-10">
      <div className="eyebrow">設計檔案</div>
      <h1 className="mt-2 text-2xl font-bold">{product?.name}</h1>
      <p className="mt-1 text-sm text-mute">設計編號 {d.id}・{product?.sku}・{fmtDate(d.createdAt)}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {d.previewUrl && <img src={d.previewUrl} alt="" className="mt-6 w-full max-w-md rounded-2xl border border-line" />}
      <div className="mt-8 space-y-4">
        {Object.entries(d.data).map(([code, f]) => (
          <div key={code} className="card flex flex-wrap items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.printUrl && <img src={f.printUrl} alt="" className="h-20 w-20 rounded-lg border border-line bg-white object-contain" />}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{positions.find((p) => p.code === code)?.name ?? code}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.printUrl && <a href={f.printUrl} download className={link}>印刷檔 PNG</a>}
                {f.svgUrl && <a href={f.svgUrl} download className={link}>向量 SVG</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
