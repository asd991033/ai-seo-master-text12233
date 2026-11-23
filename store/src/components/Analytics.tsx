import Script from "next/script";

/**
 * Google 追蹤碼（GA4 與 Google Ads 共用一支 gtag）。
 * 代碼放在環境變數：GA_ID（G-XXXX）、GADS_ID（AW-XXXX）。兩個都沒設就不載入任何東西。
 */
export function Analytics() {
  const ga = process.env.GA_ID?.trim(), ads = process.env.GADS_ID?.trim();
  const ids = [ga, ads].filter((x): x is string => !!x && /^[A-Z]{1,3}-[A-Z0-9-]+$/i.test(x));
  if (!ids.length) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${ids.map((id) => `gtag('config','${id}');`).join("")}`}
      </Script>
    </>
  );
}
