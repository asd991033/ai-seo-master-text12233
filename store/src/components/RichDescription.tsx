/**
 * 把商品說明整理成好讀的版面：
 * 「【標題】內容」變成條列，「【尺碼表…】」後面以 ｜ 分隔的列變成表格。
 */
export function RichDescription({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-8">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const tableRows = lines.filter((l) => l.includes("｜"));
        if (tableRows.length >= 2) {
          const title = lines.find((l) => /^【.+】$/.test(l))?.replace(/[【】]/g, "");
          const notes = lines.filter((l) => !l.includes("｜") && !/^【.+】$/.test(l));
          const [head, ...rows] = tableRows.map((r) => r.split("｜"));
          return (
            <div key={bi}>
              {title && <h3 className="mb-3 font-bold">{title}</h3>}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-sand text-left text-xs text-mute"><tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-line bg-white">
                    {rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${ci === 0 ? "font-medium" : ""}`}>{c}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
              {notes.map((n) => <p key={n} className="mt-2 text-xs text-mute">{n}</p>)}
            </div>
          );
        }
        return (
          <dl key={bi} className="space-y-4">
            {lines.map((l, li) => {
              const m = /^【(.+?)】(.*)$/.exec(l);
              return m ? (
                <div key={li} className="grid gap-1 sm:grid-cols-[96px_1fr] sm:gap-4">
                  <dt className="text-sm font-medium text-forest">{m[1]}</dt>
                  <dd className="text-sm leading-relaxed text-mute">{m[2]}</dd>
                </div>
              ) : (
                <p key={li} className="text-sm leading-relaxed text-mute">{l}</p>
              );
            })}
          </dl>
        );
      })}
    </div>
  );
}
