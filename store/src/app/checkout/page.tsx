import type { Metadata } from "next";
import { ecpayEnabled } from "@/lib/ecpay";
import { stripeEnabled } from "@/lib/stripe";
import { t } from "@/i18n";
import { initMarket } from "@/market/server";
import { requireUser } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/oauth";
import { CheckoutForm } from "@/components/CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  await initMarket();
  const m = await initMarket();
  const user = await requireUser("/checkout");
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-3xl font-bold">{t.checkout.title}</h1>
      <CheckoutForm online={m.payment === "stripe" ? stripeEnabled() : ecpayEnabled()} defaults={{ name: user.name, phone: user.phone ?? "", email: isPlaceholderEmail(user.email) ? "" : user.email, company: user.company ?? "", taxId: user.taxId ?? "" }} />
    </div>
  );
}
