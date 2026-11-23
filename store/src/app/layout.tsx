import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { alts, baseUrl, organizationLd, websiteLd } from "@/lib/seo";
import { currentPath, initMarket } from "@/market/server";
import { MarketProvider } from "@/market/client";
import "./globals.css";
import { site } from "@/config/site";
import { t } from "@/i18n";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";

export async function generateMetadata(): Promise<Metadata> {
  const m = await initMarket();
  return {
    title: { default: `${site.brand}｜${t.home.eyebrow}`, template: `%s｜${site.brand}` },
    description: t.home.lead,
    metadataBase: new URL(baseUrl()),
    alternates: alts(currentPath()),
    openGraph: { siteName: site.brand, locale: m.lang.replace("-", "_"), type: "website", images: ["/eg/hero-2.jpg"] },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
    // Google Search Console 的網站驗證碼
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const m = await initMarket();
  return (
    <html lang={m.lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@500;700&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <MarketProvider code={m.code}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </MarketProvider>
        <Analytics />
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
      </body>
    </html>
  );
}
