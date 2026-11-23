import { NextResponse, type NextRequest } from "next/server";
import { splitPath } from "@/config/markets";

/** 子目錄市場：/sg/products 實際由 /products 處理，市場代碼放在 x-market 標頭給頁面讀取 */
export function middleware(req: NextRequest) {
  const { market, path } = splitPath(req.nextUrl.pathname);
  const headers = new Headers(req.headers);
  headers.set("x-market", market.code);
  headers.set("x-path", path);
  if (market.code === "tw") return NextResponse.next({ request: { headers } });
  // 後台不分市場
  if (/^\/admin(\/|$)/.test(path)) return NextResponse.redirect(new URL(path, req.url));
  const url = req.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ["/((?!_next/|files/|samples/|eg/|draco/|favicon|icon|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|js|css|wasm|glb|txt)$).*)"] };
