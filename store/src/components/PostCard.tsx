import Link from "next/link";
import { fmtPostDate, type Post } from "@/lib/blog";

export function PostCard({ p }: { p: Post }) {
  return (
    <article className="group">
      <Link href={`/blog/${p.slug}`} className="block">
        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.coverUrl && <img src={p.coverUrl} alt={p.coverAlt || p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
        </div>
        <time dateTime={new Date(p.publishedAt * 1000).toISOString()} className="mt-4 block text-xs text-mute">{fmtPostDate(p.publishedAt)}</time>
        <h3 className="mt-1.5 text-[18px] leading-snug font-bold group-hover:underline group-hover:underline-offset-4">{p.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mute">{p.excerpt}</p>
      </Link>
    </article>
  );
}
