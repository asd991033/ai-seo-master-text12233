import Script from "next/script";
import { metaPixelId } from "@/lib/meta-server";
import { MetaPageView } from "./MetaPageView";

/** Meta 像素基礎程式碼。沒有像素編號就不載入任何東西 */
export function MetaPixel() {
  const id = metaPixelId();
  if (!/^\d{6,20}$/.test(id)) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`}
      </Script>
      <MetaPageView />
    </>
  );
}
