"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export function CartBadge({ label }: { label: string }) {
  const count = useCart((s) => s.items.length);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <Link href="/cart" className="relative rounded-full border border-line bg-white px-4 py-1.5 hover:border-ink">
      {label}
      {ready && count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-white">{count}</span>
      )}
    </Link>
  );
}
