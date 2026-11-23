import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { deletePost, savePost } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBlog({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const editId = Number((await searchParams).edit) || 0;
  const posts = await db.select().from(schema.posts).orderBy(desc(schema.posts.publishedAt));
  const cur = editId ? (await db.select().from(schema.posts).where(eq(schema.posts.id, editId)))[0] : undefined;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">部落格文章</h1>
          <Link href="/admin/blog" className="chip">＋ 新文章</Link>
        </div>
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id} className={`card flex items-center justify-between gap-3 p-3 text-sm ${p.id === editId ? "border-forest" : ""}`}>
              <div className="min-w-0">
                <div className="truncate font-medium">{p.title}</div>
                <div className="truncate text-xs text-mute">/blog/{p.slug}{!p.published && "・草稿"}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <Link href={`/blog/${p.slug}`} className="text-mute hover:text-ink" target="_blank">查看</Link>
                <Link href={`/admin/blog?edit=${p.id}`} className="font-medium hover:underline">編輯</Link>
              </div>
            </li>
          ))}
          {!posts.length && <li className="text-sm text-mute">還沒有文章。</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold">{cur ? "編輯文章" : "新增文章"}</h2>
        <form action={savePost} className="card space-y-4 p-5">
          {cur && <input type="hidden" name="id" value={cur.id} />}
          <label className="block"><span className="label">標題</span><input name="title" required defaultValue={cur?.title} className="input" /></label>
          <label className="block"><span className="label">網址代稱（英文、數字、連字號；留空自動產生）</span><input name="slug" defaultValue={cur?.slug} className="input" placeholder="custom-gift-guide" /></label>
          <label className="block"><span className="label">摘要（列表與搜尋結果會顯示，建議 60–120 字）</span><textarea name="excerpt" rows={3} defaultValue={cur?.excerpt} className="input" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">封面圖網址</span><input name="coverUrl" defaultValue={cur?.coverUrl ?? ""} className="input" placeholder="/eg/hero-1.jpg" /></label>
            <label className="block"><span className="label">封面圖說明（ALT）</span><input name="coverAlt" defaultValue={cur?.coverAlt ?? ""} className="input" /></label>
          </div>
          <label className="block">
            <span className="label">內文（Markdown：## 小標、- 清單、**粗體**、[文字](網址)、![圖片說明](圖片網址)）</span>
            <textarea name="content" rows={18} defaultValue={cur?.content} className="input font-mono text-[13px] leading-relaxed" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">SEO 標題（選填）</span><input name="seoTitle" defaultValue={cur?.seoTitle ?? ""} className="input" /></label>
            <label className="block"><span className="label">SEO 說明（選填）</span><input name="seoDescription" defaultValue={cur?.seoDescription ?? ""} className="input" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={cur ? cur.published : true} className="accent-[var(--color-forest)]" /> 公開發布</label>
          <div className="flex items-center gap-3">
            <button className="btn-primary px-6 py-3">儲存</button>
          </div>
        </form>
        {cur && (
          <form action={deletePost} className="mt-3 text-right">
            <input type="hidden" name="id" value={cur.id} />
            <button className="text-xs text-danger hover:underline">刪除這篇文章</button>
          </form>
        )}
      </section>
    </div>
  );
}
