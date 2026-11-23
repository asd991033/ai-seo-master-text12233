import { NextResponse } from "next/server";
import { priceCart, sanitizeLines } from "@/lib/checkout";
import { dictFor } from "@/i18n";
import { withMarket } from "@/market/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return withMarket(typeof body?.market === "string" ? body.market : null, async (m) => {
    const lines = sanitizeLines(body?.items);
    if (!lines) return NextResponse.json({ error: dictFor(m).errors.badFormat }, { status: 400 });
    const priced = await priceCart(lines, typeof body.zoneCode === "string" ? body.zoneCode : null);
    return NextResponse.json({
      ...priced,
      lines: priced.lines.map((l) => (l.ok ? { id: l.id, ok: true, quote: l.quote, labels: l.labels } : l)),
    });
  });
}
