import "server-only";
import { currentMarket } from "@/market/server";
import { dictFor, type Dict } from "./dicts";

/**
 * 伺服器端用的字典：每次取值時依「目前請求的市場」回傳對應語系。
 * 瀏覽器端元件請改用 @/market/client 的 useT()。
 */
export const t: Dict = new Proxy({} as Dict, {
  get: (_, key) => (dictFor(currentMarket()) as Record<string | symbol, unknown>)[key],
  has: (_, key) => key in dictFor(currentMarket()),
  ownKeys: () => Reflect.ownKeys(dictFor(currentMarket())),
  getOwnPropertyDescriptor: (_, key) => Reflect.getOwnPropertyDescriptor(dictFor(currentMarket()), key),
});
export { dictFor };
export type { Dict };
