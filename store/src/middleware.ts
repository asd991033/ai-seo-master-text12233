import { NextResponse, type NextRequest } from "next/server";
import { markets, splitPath } from "@/config/markets";
import { geoTarget } from "@/lib/geo";

/** 記錄「已經判斷過國家」的 Cookie：只在第一次進站跳轉一次，之後客戶自己切換國家不會再被帶走 */
const GEO_COOKIE = "geo_done";
const geoOn = () => (process.env.GEO_REDIRECT ?? "on").toLowerCase() !== "off";

/** 子目錄市場：/sg/products 實際由 /products 處理，市場代碼放在 x-market 標頭給頁面讀取 */
export function middleware(req: NextRequest) {
  const { market, path } = splitPath(req.nextUrl.pathname);
  // 第一次進站：依訪客 IP 所在國家帶到該國家站（只跳一次；搜尋引擎不跳）
  const firstVisit = geoOn() && !req.cookies.has(GEO_COOKIE) && (req.headers.get("accept") ?? "").includes("text/html");
  const mark = <T extends NextResponse>(res: T): T => {
    if (firstVisit) res.cookies.set(GEO_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
    return res;
  };
  if (firstVisit) {
    const target = geoTarget({
      path, isRootMarket: market.code === "tw", method: req.method, accept: req.headers.get("accept") ?? "", userAgent: req.headers.get("user-agent") ?? "", done: false,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "",
    });
    if (target) {
      const url = req.nextUrl.clone();
      url.pathname = `${markets[target].prefix}${path === "/" ? "" : path}`;
      return mark(NextResponse.redirect(url, 307));
    }
  }
  const headers = new Headers(req.headers);
  headers.set("x-market", market.code);
  headers.set("x-path", path);
  if (market.code === "tw") return mark(NextResponse.next({ request: { headers } }));
  // 後台不分市場
  if (/^\/admin(\/|$)/.test(path)) return NextResponse.redirect(new URL(path, req.url));
  const url = req.nextUrl.clone();
  url.pathname = path;
  return mark(NextResponse.rewrite(url, { request: { headers } }));
}

// API 不經過這裡：middleware 會把請求內容限制在 10MB，大尺寸商品的印刷檔與稿件上傳會被截斷。
// API 需要的市場資訊由請求內容帶入（market 欄位），不靠這裡的標頭。
export const config = { matcher: ["/((?!api/|_next/|files/|samples/|eg/|draco/|favicon|icon|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|js|css|wasm|glb|txt)$).*)"] };
