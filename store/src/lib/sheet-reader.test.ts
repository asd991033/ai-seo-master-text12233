import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { parseCsv, readSheets, SheetReadError } from "./sheet-reader";

const ab = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

test("一般 xlsx：文字、數字、日期", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("評價");
  ws.addRow(["SKU *", "星等 * (1–5)", "評價日期"]);
  ws.addRow(["BAG-01", 5, new Date(Date.UTC(2026, 0, 15))]);
  const [s] = await readSheets(ab(new Uint8Array(await wb.xlsx.writeBuffer())));
  assert.equal(s.name, "評價");
  assert.deepEqual(s.rows[1].cells.slice(0, 2), ["BAG-01", "5"]);
  assert.match(s.rows[1].cells[2], /^2026-01-15/);
});

test("ExcelJS 讀不了的 xlsx（命名空間前綴、內嵌字串、注音）改用備援讀法", async () => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("xl/workbook.xml", `<x:workbook xmlns:x="m" xmlns:r="r"><x:sheets><x:sheet name="工作表1" sheetId="1" r:id="rId7"/></x:sheets></x:workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<Relationships><Relationship Id="rId7" Target="worksheets/data.xml"/></Relationships>`);
  zip.file("xl/sharedStrings.xml", `<x:sst><x:si><x:t>SKU</x:t></x:si><x:si><x:r><x:t>王</x:t></x:r><x:r><x:t>小明 &amp; 家人</x:t></x:r><x:rPh><x:t>ㄨㄤˊ</x:t></x:rPh></x:si></x:sst>`);
  zip.file("xl/worksheets/data.xml", `<x:worksheet><x:sheetData><x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="C1" t="inlineStr"><x:is><x:t>評價內容</x:t></x:is></x:c></x:row><x:row r="3"><x:c r="A3" t="s"><x:v>1</x:v></x:c><x:c r="C3"><x:v>46037</x:v></x:c></x:row></x:sheetData></x:worksheet>`);
  const [s] = await readSheets(ab(await zip.generateAsync({ type: "uint8array" })));
  assert.equal(s.name, "工作表1");
  assert.deepEqual(s.rows, [{ rowNo: 1, cells: ["SKU", "", "評價內容"] }, { rowNo: 3, cells: ["王小明 & 家人", "", "46037"] }]);
});

test("副檔名是 xlsx 但內容是 CSV（UTF-8 與 Big5）", async () => {
  const utf8 = await readSheets(ab(new TextEncoder().encode('﻿SKU,評價內容\r\nA-1,"很好,""真的""\n第二行"\r\n')));
  assert.deepEqual(utf8[0].rows, [{ rowNo: 1, cells: ["SKU", "評價內容"] }, { rowNo: 2, cells: ["A-1", '很好,"真的"\n第二行'] }]);
  // 「評價」的 Big5 位元組
  const big5 = await readSheets(ab(new Uint8Array([0x53, 0x4b, 0x55, 0x2c, 0xb5, 0xfb, 0xbb, 0xf9, 0x0a, 0x41, 0x2c, 0x42])));
  assert.deepEqual(big5[0].rows[0].cells, ["SKU", "評價"]);
});

test("分隔符號自動判斷", () => {
  assert.deepEqual(parseCsv("a\tb\n1\t2")[1].cells, ["1", "2"]);
  assert.deepEqual(parseCsv("a;b\n1;2")[1].cells, ["1", "2"]);
});

test("舊版 xls／加密檔、網頁檔給出明確說明", async () => {
  await assert.rejects(readSheets(ab(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))), (e: unknown) => e instanceof SheetReadError && /舊版 \.xls/.test(e.message));
  await assert.rejects(readSheets(ab(new TextEncoder().encode("<html><table></table></html>"))), SheetReadError);
  await assert.rejects(readSheets(new ArrayBuffer(0)), SheetReadError);
});
