import zhTW, { type Dict } from "./zh-TW";
import { site } from "@/config/site";

/** 每個國家站各自部署，用 NEXT_PUBLIC_SITE_LOCALE 決定語系。新增語系在這裡註冊。 */
const dicts: Record<string, Dict> = { "zh-TW": zhTW };

export const t: Dict = dicts[site.locale] ?? zhTW;
