import Link from "@/components/Link";
import { initMarket } from "@/market/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { t } from "@/i18n";
import { fmtPostDate, getPost, otherPosts } from "@/lib/blog";
import { alts, articleLd, breadcrumbLd } from "@/lib/seo";
import { Markdown, headings } from "@/lib/markdown";
import { JsonLd } from "@/components/JsonLd";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await initMarket();
  const p = await getPost(decodeURIComponent((await params).slug));
  if (!p) return {};
  const title = p.seoTitle || p.title, description = p.seoDescription || p.excerpt;
  return {
    title, description, alternates: alts(`/blog/${p.slug}`, true),
    openGraph: { title, description, type: "article", publishedTime: new Date(p.publishedAt * 1000).toISOString(), modifiedTime: new Date(p.updatedAt * 1000).toISOString(), images: p.coverUrl ? [p.coverUrl] : undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const mkt = await initMarket();
  // 部落格目前只有中文版，海外站導回該國首頁
  if (mkt.locale === "en") redirect(mkt.prefix);
  const p = await getPost(decodeURIComponent((await params).slug));
  if (!p) notFound();
  const [more, toc] = [await otherPosts(p.id), headings(p.content)];
  return (
    <article className="container-x py-10 md:py-14">
      <JsonLd data={articleLd(p)} />
      <JsonLd data={breadcrumbLd([[t.blog.home, "/"], [t.blog.title, "/blog"], [p.title, `/blog/${p.slug}`]])} />
      <nav aria-label="breadcrumb" className="text-xs text-mute">
        <Link href="/" className="hover:text-ink">{t.blog.home}</Link> / <Link href="/blog" className="hover:text-ink">{t.blog.title}</Link>
      </nav>
      <header className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-[30px] leading-tight md:text-[42px]">{p.title}</h1>
        <div className="mt-4 text-sm text-mute">
          <time dateTime={new Date(p.publishedAt * 1000).toISOString()}>{fmtPostDate(p.publishedAt)}</time>
          {p.updatedAt - p.publishedAt > 86400 && <span>・{t.blog.updated} <time dateTime={new Date(p.updatedAt * 1000).toISOString()}>{fmtPostDate(p.updatedAt)}</time></span>}
        </div>
        {p.excerpt && <p className="mt-6 text-[17px] leading-relaxed text-mute">{p.excerpt}</p>}
      </header>
      {p.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.coverUrl} alt={p.coverAlt || p.title} className="mx-auto mt-8 aspect-[16/9] w-full max-w-4xl rounded-[14px] object-cover" />
      )}
      <div className="mx-auto mt-8 max-w-3xl text-[16px]">
        {toc.length >= 3 && (
          <nav aria-label={t.blog.toc} className="card mb-8 p-5 text-sm">
            <div className="font-bold">{t.blog.toc}</div>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-mute">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="hover:text-ink hover:underline">{h.text}</a></li>)}</ol>
          </nav>
        )}
        <Markdown source={p.content} />
        <div className="mt-12 rounded-[14px] bg-forest px-6 py-7 text-white">
          <div className="text-[20px] font-bold">{t.blog.ctaTitle}</div>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{t.blog.ctaText}</p>
          <Link href="/products" className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink hover:opacity-90">{t.blog.ctaButton}</Link>
        </div>
      </div>
      {more.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <h2 className="text-[24px] md:text-[28px]">{t.blog.more}</h2>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{more.map((x) => <PostCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </article>
  );
}
