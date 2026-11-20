/**
 * 站點設定：品牌名、幣別、稅率等都集中在這裡。
 * 之後做其他國家版時，每個國家站各自部署並用環境變數覆寫即可。
 */
export const site = {
  brand: process.env.NEXT_PUBLIC_BRAND ?? "Giftevo",
  brandZh: process.env.NEXT_PUBLIC_BRAND_LOCAL ?? "",
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE ?? "zh-TW",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "TWD",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "NT$",
  /** 營業稅率，0 表示不另計稅 */
  taxRate: Number(process.env.NEXT_PUBLIC_TAX_RATE ?? "0.05"),
  /** 預設運送目的地區域代碼（對應 shipping_zones.code） */
  defaultZone: process.env.NEXT_PUBLIC_DEFAULT_ZONE ?? "TW",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "service@example.com",
  bankInfo:
    process.env.BANK_INFO ??
    "銀行：（請於 BANK_INFO 環境變數設定）\n戶名：—\n帳號：—",
} as const;
