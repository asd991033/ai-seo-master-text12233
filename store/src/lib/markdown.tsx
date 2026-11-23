import type { ReactNode } from "react";

/**
 * 精簡的 Markdown 轉 React（文章用）。支援標題、段落、清單、引言、粗體、連結、圖片、分隔線。
 * 直接產生 React 節點，不經過 HTML 字串，所以文章內容不會被當成程式碼執行。
 */
const safeUrl = (u: string) => (/^(https?:\/\/|\/|#|mailto:)/i.test(u.trim()) ? u.trim() : "#");

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    // eslint-disable-next-line @next/next/no-img-element
    if (m[2]) out.push(<img key={k} src={safeUrl(m[2])} alt={m[1]} loading="lazy" className="my-6 w-full rounded-[14px]" />);
    else if (m[4]) out.push(<a key={k} href={safeUrl(m[4])} className="font-medium underline underline-offset-4 hover:opacity-70">{m[3]}</a>);
    else if (m[5]) out.push(<strong key={k}>{m[5]}</strong>);
    else if (m[6]) out.push(<code key={k} className="rounded bg-sand px-1.5 py-0.5 text-[0.9em]">{m[6]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const slugOf = (s: string) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

/** 文章裡的二級標題（做目錄用） */
export function headings(md: string) {
  return md.split("\n").filter((l) => /^##\s+/.test(l)).map((l) => { const text = l.replace(/^##\s+/, "").trim(); return { text, id: slugOf(text) }; });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let i = 0, n = 0;
  const key = () => `b${n++}`;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      const k = key(), text = h[2].trim();
      if (h[1].length === 2) out.push(<h2 key={k} id={slugOf(text)} className="mt-12 mb-4 scroll-mt-28 text-[24px] font-bold md:text-[28px]">{inline(text, k)}</h2>);
      else if (h[1].length === 3) out.push(<h3 key={k} className="mt-8 mb-3 text-[19px] font-bold">{inline(text, k)}</h3>);
      else out.push(<h4 key={k} className="mt-6 mb-2 font-bold">{inline(text, k)}</h4>);
      i++; continue;
    }
    if (/^---+$/.test(line.trim())) { out.push(<hr key={key()} className="my-10 border-line" />); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const k = key();
      out.push(<blockquote key={k} className="my-6 border-l-2 border-ink pl-5 text-[17px] leading-relaxed">{inline(buf.join(" "), k)}</blockquote>);
      continue;
    }
    const ul = /^[-*]\s+/, ol = /^\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line), re = ordered ? ol : ul, items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const k = key(), cls = `my-5 space-y-2 pl-6 leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`;
      const lis = items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>);
      out.push(ordered ? <ol key={k} className={cls}>{lis}</ol> : <ul key={k} className={cls}>{lis}</ul>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|>\s?|[-*]\s+|\d+[.)]\s+|---+$)/.test(lines[i])) buf.push(lines[i++]);
    const k = key();
    out.push(<p key={k} className="my-5 leading-[1.9]">{inline(buf.join(" "), k)}</p>);
  }
  return <>{out}</>;
}
