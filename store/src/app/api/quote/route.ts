import { NextResponse } from "next/server";
import { priceCart, sanitizeLines } from "@/lib/checkout";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const lines = sanitizeLines(body?.items);
  if (!lines) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const priced = await priceCart(lines, typeof body.zoneCode === "string" ? body.zoneCode : null);
  return NextResponse.json({
    ...priced,
    lines: priced.lines.map((l) => (l.ok ? { id: l.id, ok: true, quote: l.quote, labels: l.labels } : l)),
  });
}
