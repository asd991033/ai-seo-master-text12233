import type { Metadata } from "next";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/oauth";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = { title: t.checkout.title };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-3xl font-bold">{t.checkout.title}</h1>
      <CheckoutForm defaults={{ name: user.name, phone: user.phone ?? "", email: isPlaceholderEmail(user.email) ? "" : user.email, company: user.company ?? "", taxId: user.taxId ?? "" }} />
    </div>
  );
}
