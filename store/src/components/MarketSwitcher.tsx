import { localize, marketList } from "@/config/markets";
import { currentMarket, currentPath } from "@/market/server";
import { t } from "@/i18n";

/** 頁首的國家切換：顯示目前國家，展開後列出其他國家站 */
export function MarketSwitcher() {
  const m = currentMarket(), path = currentPath();
  return (
    <details className="group relative hidden sm:block" data-testid="market-switch">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-[10px] px-2 py-1.5 text-xs font-medium hover:bg-sand [&::-webkit-details-marker]:hidden" aria-label={t.intl.switchTitle}>
        {m.country}<span className="text-mute">· {m.currency}</span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[14px] border border-line bg-white p-2 text-[13px] shadow-xl">
        {marketList.map((x) => (
          <a key={x.code} href={localize(path.startsWith("/blog/") && x.code !== m.code ? "/blog" : path, x) || "/"} hrefLang={x.lang} className={`flex items-center justify-between rounded-[10px] px-3 py-2 hover:bg-sand ${x.code === m.code ? "font-semibold" : ""}`}>
            <span>{x.countryName}</span><span className="text-xs text-mute">{x.currency}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
