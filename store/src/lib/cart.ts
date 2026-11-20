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
  qty: number;
  prints: PrintSelection[];
  designId?: string;
  previewUrl?: string;
  artworkUrl?: string;
  artworkName?: string;
};

type CartState = {
  items: CartItem[];
  zoneCode: string | null;
  mode: "air" | "sea";
  add: (item: Omit<CartItem, "id">) => void;
  setQty: (id: string, qty: number) => void;
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
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setShipping: (zoneCode, mode) => set({ zoneCode, mode }),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-v1" },
  ),
);

/** 商品頁 → 線上排版 之間暫存的設定 */
export type Draft = { slug: string; qty: number; colorName: string | null; prints: PrintSelection[] };
const DRAFT_KEY = "design-draft";
export const saveDraft = (d: Draft) => sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
export const loadDraft = (slug: string): Draft | null => {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
    return d && d.slug === slug ? d : null;
  } catch {
    return null;
  }
};
