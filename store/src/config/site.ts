/**
 * 站點設定：品牌名、幣別、稅率等都集中在這裡。
 * 之後做其他國家版時，每個國家站各自部署並用環境變數覆寫即可。
 */
export const site = {
  brand: process.env.NEXT_PUBLIC_BRAND ?? "Kindmark",
  brandZh: process.env.NEXT_PUBLIC_BRAND_LOCAL ?? "",
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE ?? "zh-TW",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "TWD",
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "NT$",
  /** 另外加收的營業稅率。台灣站的售價與運費都已含稅，所以是 0（不另計） */
  taxRate: Number(process.env.NEXT_PUBLIC_TAX_RATE ?? "0"),
  /** 預設運送目的地區域代碼（對應 shipping_zones.code） */
  defaultZone: process.env.NEXT_PUBLIC_DEFAULT_ZONE ?? "TW",
  /** 統一運費：每張訂單固定收 fee，商品金額（不含運費）滿 freeOver 免運。fee 設為負數則改用重量／材積計價 */
  flatShipping: { fee: Number(process.env.NEXT_PUBLIC_SHIP_FEE ?? "160"), freeOver: Number(process.env.NEXT_PUBLIC_SHIP_FREE_OVER ?? "2000"), days: process.env.NEXT_PUBLIC_SHIP_DAYS ?? "3–5" },
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "service@example.com",
} as const;
