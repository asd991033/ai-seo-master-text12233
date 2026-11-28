"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { metaTrack } from "@/lib/track";

/** 站內換頁不會重新載入像素，所以路徑改變時補送一次 PageView（第一次載入由基礎程式碼送） */
export function MetaPageView() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    metaTrack("PageView");
  }, [path]);
  return null;
}

/** 進入某個頁面時送一次指定事件（商品頁的 ViewContent、排版頁的 CustomizeProduct） */
export function MetaEvent({ event, params }: { event: string; params: Record<string, unknown> }) {
  const key = JSON.stringify([event, params]);
  useEffect(() => {
    metaTrack(event, JSON.parse(key)[1]);
  }, [event, key]);
  return null;
}
