"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PrintSelection } from "./pricing";

export type CartItem = {
  id: string;
  productId: number;
  slug: string;
  sku: string;
  name: string;
  image: string | null;
  colorName: string | null;
  sizeName?: string | null;
  qty: number;
  prints: PrintSelection[];
  designId?: string;
  previewUrl?: string;
  artworkUrl?: string;
  artworkName?: string;
};

/** 各國站的購物車分開存（品名、顏色名稱與幣別都不同） */
const marketSuffix = () => { const m = typeof window === "undefined" ? null : /^\/(us|sg|my|au|ae|uk)(\/|$)/.exec(window.location.pathname); return m ? `-${m[1]}` : ""; };

type CartState = {
  items: CartItem[];
  zoneCode: string | null;
  mode: "air" | "sea";
  add: (item: Omit<CartItem, "id">) => void;
  setQty: (id: string, qty: number) => void;
  replace: (id: string, patch: Partial<CartItem>) => void;
  remove: (id: string) => void;
  setShipping: (zoneCode: string, mode: "air" | "sea") => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      zoneCode: null,
      mode: "air",
      add: (item) => set((s) => ({ items: [...s.items, { ...item, id: crypto.randomUUID() }] })),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty } : i)) })),
      replace: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setShipping: (zoneCode, mode) => set({ zoneCode, mode }),
      clear: () => set({ items: [] }),
    }),
    { name: `cart-v1${marketSuffix()}` },
  ),
);

/** 商品頁 → 線上排版 之間暫存的設定 */
export type Draft = { slug: string; qty: number; colorName: string | null; sizeName?: string | null; prints: PrintSelection[] };
const draftKey = () => `design-draft${marketSuffix()}`;
export const saveDraft = (d: Draft) => sessionStorage.setItem(draftKey(), JSON.stringify(d));
export const loadDraft = (slug: string): Draft | null => {
  try {
    const d = JSON.parse(sessionStorage.getItem(draftKey()) ?? "null") as Draft | null;
    return d && d.slug === slug ? d : null;
  } catch {
    return null;
  }
};
