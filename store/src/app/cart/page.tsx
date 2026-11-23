import type { Metadata } from "next";
import { initMarket } from "@/market/server";
import { t } from "@/i18n";
import { CartView } from "@/components/CartView";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.cart.title };
}

export default async function CartPage() {
  await initMarket();
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-3xl font-bold">{t.cart.title}</h1>
      <CartView />
    </div>
  );
}
