import { t } from "@/i18n";
import { currentMarket } from "@/market/server";
import { Stars } from "@/components/Stars";
import type { Review } from "@/lib/reviews";
import { submitReview } from "@/app/review-actions";

const day = (unix: number) => new Intl.DateTimeFormat(currentMarket().locale === "en" ? currentMarket().lang : "zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(new Date(unix * 1000));

function ReviewItem({ r }: { r: Review }) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} label={t.reviews.stars(r.rating)} />
        <span className="text-[13px] font-bold">{r.authorName}</span>
        {r.verified && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] text-forest">{t.reviews.verified}</span>}
        <time className="text-[12px] text-mute" dateTime={new Date(r.createdAt * 1000).toISOString().slice(0, 10)}>{day(r.createdAt)}</time>
      </div>
      {r.title && <div className="mt-2 text-[14px] font-bold tracking-tight">{r.title}</div>}
      <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line">{r.body}</p>
    </li>
  );
}

/** 商品頁的評價區塊；沒有任何公開評價時整段不顯示 */
export function ProductReviews({ data }: { data: { count: number; average: number; list: Review[] } }) {
  if (!data.count) return null;
  return (
    <section id="reviews" className="container-x py-16">
      <div className="eyebrow">{t.reviews.eyebrow}</div>
      <h2 className="mt-3 text-[26px] md:text-[32px]">{t.reviews.title}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-[26px] font-bold tabular-nums">{data.average.toFixed(1)}</span>
        <Stars value={data.average} label={t.reviews.stars(data.average)} className="text-[20px]" />
        <span className="text-[13px] text-mute">{t.reviews.count(data.count)}</span>
      </div>
      <ul className="mt-6 divide-y divide-line border-y border-line">{data.list.map((r) => <ReviewItem key={r.id} r={r} />)}</ul>
      {data.count > data.list.length && <p className="mt-4 text-[12px] text-mute">{t.reviews.more(data.list.length)}</p>}
    </section>
  );
}

/** 訂單頁：已出貨的訂單可以替每件商品寫一則評價 */
export function OrderReviews({ orderNo, accessKey, defaultName, flag, items }: { orderNo: string; accessKey: string | null; defaultName: string; flag?: string; items: { productId: number; name: string; review: Review | null }[] }) {
  if (!items.length) return null;
  const statusText = { pending: t.reviews.statusPending, published: t.reviews.statusPublished, hidden: t.reviews.statusHidden };
  return (
    <section id="reviews" className="mt-12">
      <h2 className="text-lg font-bold">{t.reviews.writeTitle}</h2>
      <p className="mt-1 text-sm text-mute">{t.reviews.writeLead}</p>
      {flag === "sent" && <p className="mt-4 rounded-2xl bg-forest px-5 py-4 text-sm text-white" role="status">{t.reviews.sent}</p>}
      {flag === "failed" && <p className="mt-4 rounded-2xl bg-danger/10 px-5 py-4 text-sm text-danger" role="alert">{t.reviews.failed}</p>}
      <ul className="mt-5 grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <li key={it.productId} className="card p-5 text-sm">
            <div className="font-bold">{it.name}</div>
            {it.review ? (
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-mute"><span>{t.reviews.yours}</span><Stars value={it.review.rating} label={t.reviews.stars(it.review.rating)} /><span>・{statusText[it.review.status]}</span></div>
                {it.review.title && <div className="mt-2 font-medium">{it.review.title}</div>}
                <p className="mt-1 leading-relaxed whitespace-pre-line">{it.review.body}</p>
              </div>
            ) : (
              <form action={submitReview} className="mt-3 space-y-3">
                <input type="hidden" name="orderNo" value={orderNo} /><input type="hidden" name="key" value={accessKey ?? ""} /><input type="hidden" name="productId" value={it.productId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className="label">{t.reviews.rating}</span>
                    <select name="rating" required defaultValue="" className="input"><option value="" disabled>—</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>)}</select>
                  </label>
                  <label><span className="label">{t.reviews.name}</span><input name="authorName" required maxLength={60} defaultValue={defaultName} className="input" /></label>
                </div>
                <label className="block"><span className="label">{t.reviews.headline}</span><input name="title" maxLength={120} className="input" /></label>
                <label className="block"><span className="label">{t.reviews.body}</span><textarea name="body" required maxLength={2000} rows={4} className="input" /></label>
                <button className="btn-primary">{t.reviews.submit}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
