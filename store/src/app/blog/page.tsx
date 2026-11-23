import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { initMarket } from "@/market/server";
import { t } from "@/i18n";
import { listPosts } from "@/lib/blog";
import { alts, breadcrumbLd, itemListLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.blog.title, description: t.blog.lead, alternates: alts("/blog", true), openGraph: { title: t.blog.title, description: t.blog.lead, type: "website" } };
}

export default async function BlogIndex() {
  const mkt = await initMarket();
  // 部落格目前只有中文版，海外站導回該國首頁
  if (mkt.locale === "en") redirect(mkt.prefix);
  const posts = await listPosts();
  return (
    <div className="container-x py-12 md:py-16">
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [t.blog.title, "/blog"]])} />
      <JsonLd data={itemListLd(t.blog.title, posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}`, image: p.coverUrl })))} />
      <div className="eyebrow">{t.blog.eyebrow}</div>
      <h1 className="mt-3 text-[34px] md:text-[44px]">{t.blog.title}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-mute">{t.blog.lead}</p>
      {posts.length ? (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="mt-10 text-mute">{t.blog.empty}</p>
      )}
    </div>
  );
}
