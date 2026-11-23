/** 台灣縣市 → HiCustom 使用的地區代碼（ISO 3166-2:TW） */
const TW_REGION: Record<string, string> = {
  台北市: "TPE", 新北市: "NWT", 桃園市: "TAO", 台中市: "TXG", 台南市: "TNN", 高雄市: "KHH", 基隆市: "KEE", 新竹市: "HSZ", 新竹縣: "HSQ", 苗栗縣: "MIA", 彰化縣: "CHA",
  南投縣: "NAN", 雲林縣: "YUN", 嘉義市: "CYI", 嘉義縣: "CYQ", 屏東縣: "PIF", 宜蘭縣: "ILA", 花蓮縣: "HUA", 台東縣: "TTT", 澎湖縣: "PEN", 金門縣: "KIN", 連江縣: "LIE",
};
/** 把台灣地址拆成 HiCustom 需要的欄位。拆不出縣市或鄉鎮市區時回傳 null */
export function parseTwAddress(raw: string): { postcode: string; region: string; city: string; street: string } | null {
  const s = raw.replace(/\s+/g, "").replace(/臺/g, "台");
  const m = /^(\d{3,6})?(?:台灣)?(.{2}[縣市])(.{1,4}?[鄉鎮市區])(.+)$/.exec(s);
  if (!m || !TW_REGION[m[2]]) return null;
  return { postcode: m[1] ?? "", region: TW_REGION[m[2]], city: m[3], street: m[4] };
}

