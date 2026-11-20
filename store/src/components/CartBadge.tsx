"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { IconBag } from "./Icons";

export function CartBadge({ label }: { label: string }) {
  const count = useCart((s) => s.items.length);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <Link href="/cart" className="relative p-2 hover:text-forest" aria-label={label} title={label}>
      <IconBag />
      {ready && count > 0 && (
        <span className="absolute top-0.5 right-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">{count}</span>
      )}
    </Link>
  );
}
