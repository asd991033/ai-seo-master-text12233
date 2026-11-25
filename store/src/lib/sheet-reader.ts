/**
 * 寬鬆的試算表讀取：把 .xlsx / .csv 讀成「工作表 → 列 → 儲存格文字」。
 * ExcelJS 對部分軟體（WPS、Numbers、其他平台匯出工具）產生的檔案會直接丟錯，
 * 所以 ExcelJS 讀不了時改成自己拆 zip 讀 XML；副檔名是 .xlsx 但內容其實是 CSV 的也照樣讀。
 */
import ExcelJS from "exceljs";
import JSZip from "jszip";

export type SheetRow = { rowNo: number; cells: string[] };
export type Sheet = { name: string; rows: SheetRow[] };
export class SheetReadError extends Error {}

const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;
const isCfb = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

export async function readSheets(data: ArrayBuffer): Promise<Sheet[]> {
  const bytes = new Uint8Array(data);
  if (!bytes.length) throw new SheetReadError("檔案是空的");
  if (isCfb(bytes)) throw new SheetReadError("這個檔案是舊版 .xls 格式，或有設定密碼／機密標籤保護。請在 Excel 用「另存新檔」存成沒有密碼的 .xlsx 或 CSV 後再上傳");
  if (!isZip(bytes)) return [{ name: "CSV", rows: parseCsv(decodeText(bytes)) }];
  let viaExcelJs: Sheet[] | null = null;
  try {
    viaExcelJs = await readWithExcelJs(data);
  } catch (e) {
    console.error("[sheet-reader] ExcelJS 讀取失敗，改用備援讀法", e);
  }
  if (viaExcelJs?.some((s) => s.rows.length)) return viaExcelJs;
  try {
    return await readRawXlsx(data);
  } catch (e) {
    console.error("[sheet-reader] 備援讀法也失敗", e);
    if (e instanceof SheetReadError) throw e;
    throw new SheetReadError(`無法讀取這個 Excel 檔（${e instanceof Error ? e.message : String(e)}）。請在 Excel 用「另存新檔」重新存成 .xlsx 或 CSV 後再上傳`);
  }
}

/* ───────── ExcelJS ───────── */

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

async function readWithExcelJs(data: ArrayBuffer): Promise<Sheet[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(data as any);
  return wb.worksheets.map((ws) => {
    const rows: SheetRow[] = [];
    ws.eachRow((row, rowNo) => {
      const cells: string[] = [];
      row.eachCell((cell, col) => { cells[col - 1] = cellText(cell.value).trim(); });
      rows.push({ rowNo, cells: Array.from(cells, (c) => c ?? "") });
    });
    return { name: ws.name, rows };
  });
}

/* ───────── 直接拆 zip 讀 XML ───────── */

const unescapeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag)?.slice(1).find((x) => x != null);
/** 取出一段 XML 裡所有 <t> 的文字（忽略注音 rPh） */
const textRuns = (xml: string) => {
  let out = "";
  for (const m of xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, "").matchAll(/<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g)) out += unescapeXml(m[1] ?? "");
  return out;
};
const colIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.toUpperCase()) { if (ch < "A" || ch > "Z") break; n = n * 26 + (ch.charCodeAt(0) - 64); }
  return n - 1;
};

async function readRawXlsx(data: ArrayBuffer): Promise<Sheet[]> {
  const zip = await JSZip.loadAsync(data);
  const file = (p: string) => zip.file(p) ?? zip.file(new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"))[0] ?? null;
  const read = async (p: string) => (await file(p)?.async("string")) ?? null;
  const wbXml = await read("xl/workbook.xml");
  if (!wbXml) throw new SheetReadError("這個檔案不是 Excel 活頁簿（裡面沒有工作表）。請確認上傳的是 .xlsx 或 CSV");

  const rels = new Map<string, string>();
  for (const m of ((await read("xl/_rels/workbook.xml.rels")) ?? "").matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id"), target = attr(m[0], "Target");
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }
  const shared: string[] = [];
  for (const m of ((await read("xl/sharedStrings.xml")) ?? "").matchAll(/<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g)) shared.push(textRuns(m[1] ?? ""));

  const sheets: Sheet[] = [];
  let n = 0;
  for (const m of wbXml.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    n++;
    const rid = attr(m[0], "r:id") ?? attr(m[0], "\\w+:id");
    const xml = (rid && rels.get(rid) && (await read(rels.get(rid)!))) || (await read(`xl/worksheets/sheet${n}.xml`));
    if (!xml) continue;
    const rows: SheetRow[] = [];
    let seq = 0;
    for (const rm of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
      const rowNo = (seq = Number(attr(rm[1], "r")) || seq + 1);
      const cells: string[] = [];
      let next = 0;
      for (const cm of (rm[2] ?? "").matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        const ref = attr(cm[1], "r"), type = attr(cm[1], "t"), inner = cm[2] ?? "";
        const col = ref ? colIndex(ref) : next;
        next = col + 1;
        const v = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)?.[1];
        let text = "";
        if (type === "s") text = shared[Number(v)] ?? "";
        else if (type === "inlineStr") text = textRuns(inner);
        else if (v != null) text = unescapeXml(v);
        if (col >= 0) cells[col] = text.trim();
      }
      const filled = Array.from(cells, (c) => c ?? "");
      if (filled.some(Boolean)) rows.push({ rowNo, cells: filled });
    }
    sheets.push({ name: unescapeXml(attr(m[0], "name") ?? `Sheet${n}`), rows });
  }
  if (!sheets.length) throw new SheetReadError("檔案裡沒有工作表");
  return sheets;
}

/* ───────── CSV ───────── */

function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("big5").decode(bytes); // 台灣版 Excel 另存 CSV 的預設編碼
  }
}

export function parseCsv(text: string): SheetRow[] {
  if (/^\s*<(!doctype|html|\?xml|table)/i.test(text)) throw new SheetReadError("這個檔案其實是網頁或 XML 格式，不是 Excel。請用 Excel 開啟後「另存新檔」成 .xlsx 或 CSV 再上傳");
  if (text.includes("\u0000")) throw new SheetReadError("無法辨識這個檔案的格式。請用 Excel 開啟後「另存新檔」成 .xlsx 或 CSV 再上傳");
  const firstLine = text.slice(0, text.search(/\r|\n|$/));
  const delim = [",", "\t", ";"].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: SheetRow[] = [];
  let cells: string[] = [], cur = "", quoted = false, rowNo = 1;
  const endRow = () => {
    cells.push(cur.trim());
    if (cells.some(Boolean)) rows.push({ rowNo, cells });
    cells = []; cur = ""; rowNo++;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === "") quoted = true;
    else if (ch === delim) { cells.push(cur.trim()); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; endRow(); }
    else cur += ch;
  }
  if (cur || cells.length) endRow();
  return rows;
}
