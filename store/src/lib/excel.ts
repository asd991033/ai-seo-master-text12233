import ExcelJS from "exceljs";
import type { ImportData } from "./importer";

type Col = { header: string; key: string; type: "s" | "n" | "b"; sample: (string | number)[] };
type SheetDef = { name: string; target: keyof ImportData; cols: Col[] };

const c = (header: string, key: string, type: Col["type"], ...sample: (string | number)[]): Col => ({ header, key, type, sample });

/** Excel 匯入格式定義（範本下載與解析共用同一份定義） */
export const SHEETS: SheetDef[] = [
  {
    name: "產品", target: "products",
    cols: [
      c("SKU", "sku", "s", "BAG-DEMO-01"), c("品名", "name", "s", "示範帆布袋"), c("分類", "category", "s", "袋類"), c("簡述", "summary", "s", "一句話賣點"),
      c("說明", "description", "s", "詳細說明，可換行"), c("材質", "material", "s", "12oz 帆布"), c("尺寸", "size", "s", "38 × 42 cm"),
      c("顏色", "colors", "s", "米白:#EFE7D8|黑:#111111"), c("最低訂購量", "moq", "n", 50), c("生產天數", "leadDays", "n", 12), c("單件重量(g)", "unitWeightG", "n", 180),
      c("每箱數量", "cartonQty", "n", 100), c("外箱長(cm)", "cartonLengthCm", "n", 45), c("外箱寬(cm)", "cartonWidthCm", "n", 40), c("外箱高(cm)", "cartonHeightCm", "n", 35),
      c("整箱毛重(kg)", "cartonWeightKg", "n", 19), c("精選(Y/N)", "featured", "b", "N"), c("上架(Y/N)", "active", "b", "Y"), c("圖片網址", "images", "s", ""),
    ],
  },
  {
    name: "區間價格", target: "tiers",
    cols: [c("SKU", "sku", "s", "BAG-DEMO-01", "BAG-DEMO-01", "BAG-DEMO-01"), c("起始數量", "minQty", "n", 50, 100, 500), c("成本價", "unitCost", "n", 35, 30, 24), c("單價(留空則依毛利率換算)", "unitPrice", "n")],
  },
  {
    name: "印刷區域", target: "areas",
    cols: [
      c("SKU", "sku", "s", "BAG-DEMO-01", "BAG-DEMO-01"), c("位置代碼", "positionCode", "s", "front", "front"), c("位置名稱", "positionName", "s", "正面", "正面"),
      c("刀模寬(mm)", "dielineWidthMm", "n", 380, 380), c("刀模高(mm)", "dielineHeightMm", "n", 420, 420),
      c("示意圖X(0-1)", "mockupX", "n", 0.26, 0.26), c("示意圖Y(0-1)", "mockupY", "n", 0.31, 0.31), c("示意圖寬(0-1)", "mockupW", "n", 0.475, 0.475), c("示意圖高(0-1)", "mockupH", "n", 0.525, 0.525),
      c("面積代碼", "areaCode", "s", "s", "l"), c("面積名稱", "areaName", "s", "小 10 × 10 cm", "滿版 28 × 30 cm"),
      c("印刷範圍X(mm)", "xMm", "n", 140, 50), c("印刷範圍Y(mm)", "yMm", "n", 150, 70), c("印刷範圍寬(mm)", "widthMm", "n", 100, 280), c("印刷範圍高(mm)", "heightMm", "n", 100, 300),
    ],
  },
  {
    name: "印刷報價", target: "printPrices",
    cols: [
      c("SKU", "sku", "s", "BAG-DEMO-01", "BAG-DEMO-01", "BAG-DEMO-01"), c("位置代碼", "positionCode", "s", "front", "front", "front"), c("面積代碼", "areaCode", "s", "s", "s", "l"),
      c("印刷方式代碼", "methodCode", "s", "screen", "screen", "dtf"), c("起始數量", "minQty", "n", 50, 500, 50), c("單價", "unitPrice", "n", 9, 6, 62), c("版費", "setupFee", "n", 600, 600, 0),
    ],
  },
];

const NOTES = [
  "【填寫說明】",
  "1. 所有工作表都以 SKU 對應產品。某 SKU 只要出現在某張工作表，該 SKU 在那張表的舊資料會整批被新資料取代。",
  "2. 「區間價格」：每一列是一個數量級距。填「成本價」時，售價會依後台「定價設定」的毛利率自動換算（售價 = 成本 ÷ (1 − 毛利率)），成本價不會顯示給客戶；",
  "   若不想用毛利率換算，成本價留空、直接填「單價」。",
  "   若進貨價已含印刷費，「印刷報價」的單價與版費填 0，前台會顯示「已含」。",
  "3. 「印刷區域」：一列代表某「位置」(如正面) 裡的一種「印刷面積」。同一位置的多種面積請寫多列，位置欄位重複填寫即可。",
  "   印刷範圍 X/Y 是以刀模左上角為原點的毫米座標；示意圖 X/Y/寬/高 是刀模整面在示意圖底圖上的位置比例 (0~1)，沒有示意圖可留空。",
  "4. 「印刷報價」：位置 × 面積 × 印刷方式 × 數量級距的每件印刷費與版費。網版等「依色數計價」的方式，單價與版費填「每一色」的金額。",
  "5. 印刷方式代碼請到後台「印刷方式」查看或新增。",
  "6. 刀模與圖片請在後台「批量匯入 → 上傳檔案」上傳，檔名規則：",
  "   刀模：{SKU}_{位置代碼}.svg　　示意圖：{SKU}_{位置代碼}_mockup.png　　商品圖：{SKU}_1.jpg、{SKU}_2.jpg …",
  "7. 刀模 SVG 請以毫米為單位、只留線條不要填色；建議裁切線用洋紅實線、摺線用青色虛線。",
  "8. 範本中的示範列匯入前請刪除。",
];

export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const def of SHEETS) {
    const ws = wb.addWorksheet(def.name);
    ws.columns = def.cols.map((col) => ({ header: col.header, key: col.key, width: Math.max(12, col.header.length * 2 + 4) }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1ECE3" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    const n = Math.max(...def.cols.map((col) => col.sample.length));
    for (let i = 0; i < n; i++) ws.addRow(Object.fromEntries(def.cols.map((col) => [col.key, col.sample[i] ?? ""])));
  }
  const notes = wb.addWorksheet("說明");
  notes.getColumn(1).width = 120;
  NOTES.forEach((line) => notes.addRow([line]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
}

export async function parseWorkbook(data: Buffer | ArrayBuffer): Promise<{ data: ImportData; errors: string[] }> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(data as any);
  const out: ImportData = { products: [], tiers: [], areas: [], printPrices: [] };
  const errors: string[] = [];
  for (const def of SHEETS) {
    const ws = wb.getWorksheet(def.name);
    if (!ws) continue;
    const headers = new Map<number, Col>();
    ws.getRow(1).eachCell((cell, col) => {
      const def2 = def.cols.find((x) => x.header === cellText(cell.value).trim());
      if (def2) headers.set(col, def2);
    });
    const missing = def.cols.filter((x) => x.key === "sku" && ![...headers.values()].includes(x));
    if (missing.length) {
      errors.push(`「${def.name}」找不到 SKU 欄位，請使用範本的標題列`);
      continue;
    }
    ws.eachRow((row, rowNo) => {
      if (rowNo === 1) return;
      const rec: Record<string, unknown> = {};
      let any = false;
      for (const [col, cd] of headers) {
        const text = cellText(row.getCell(col).value).trim();
        if (!text) continue;
        any = true;
        if (cd.type === "n") {
          const n = Number(text.replace(/,/g, ""));
          if (Number.isNaN(n)) errors.push(`「${def.name}」第 ${rowNo} 列「${cd.header}」不是數字：${text}`);
          else rec[cd.key] = n;
        } else if (cd.type === "b") rec[cd.key] = /^(y|yes|true|1|是)$/i.test(text);
        else rec[cd.key] = text;
      }
      if (any) (out[def.target] as unknown[]).push(rec);
    });
  }
  if (!out.products.length && !out.tiers.length && !out.areas.length && !out.printPrices.length && !errors.length) {
    errors.push("檔案中沒有可匯入的資料（請確認工作表名稱：產品 / 區間價格 / 印刷區域 / 印刷報價）");
  }
  return { data: out, errors };
}
