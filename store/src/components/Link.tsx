"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localize } from "@/config/markets";
import { useMarket } from "@/market/client";

/** 會自動加上市場前綴（/sg、/uk…）的站內連結 */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const m = useMarket();
  return <NextLink href={typeof href === "string" ? localize(href, m) : href} {...rest} />;
}
