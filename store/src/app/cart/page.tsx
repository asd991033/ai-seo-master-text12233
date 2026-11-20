import type { Metadata } from "next";
import { t } from "@/i18n";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: t.cart.title };

export default function CartPage() {
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-3xl font-bold">{t.cart.title}</h1>
      <CartView />
    </div>
  );
}
