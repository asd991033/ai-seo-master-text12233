import { readStored } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const file = await readStored(path.map((p) => decodeURIComponent(p)));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // 使用者上傳的 SVG 可能含指令碼：直接開啟時以沙箱隔離
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
