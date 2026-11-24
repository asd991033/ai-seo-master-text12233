import type { Metadata } from "next";
import { ecpayEnabled } from "@/lib/ecpay";
import { stripeEnabled } from "@/lib/stripe";
import { t } from "@/i18n";
import { initMarket } from "@/market/server";
import { localize } from "@/config/markets";
import { getUser } from "@/lib/auth";
import Link from "@/components/Link";
import { isPlaceholderEmail } from "@/lib/oauth";
import { CheckoutForm } from "@/components/CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  await initMarket();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  await initMarket();
  const m = await initMarket();
  // 不用註冊也能結帳；已登入就帶入會員資料
  const user = await getUser();
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-3xl font-bold">{t.checkout.title}</h1>
      {!user && <p className="-mt-4 mb-6 text-sm text-mute" data-testid="guest-hint">{t.order.haveAccount} <Link href={`/login?next=${encodeURIComponent(localize("/checkout", m))}`} className="font-medium text-ink underline underline-offset-4">{t.order.signIn}</Link></p>}
      <CheckoutForm online={m.payment === "stripe" ? stripeEnabled() : ecpayEnabled()} defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", email: user && !isPlaceholderEmail(user.email) ? user.email : "", company: user?.company ?? "", taxId: user?.taxId ?? "" }} />
    </div>
  );
}
