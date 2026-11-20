"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Canvas, FabricObject, FabricImage, Textbox } from "fabric";
import { t } from "@/i18n";
import { loadDraft, useCart, type Draft } from "@/lib/cart";

export type DesignerProduct = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  image: string | null;
  colors: { name: string; hex: string }[];
  methods: { code: string; name: string; perColor: boolean }[];
  positions: {
    code: string; name: string; dielineUrl: string | null; widthMm: number; heightMm: number; pxW: number | null; pxH: number | null;
    mockupUrl: string | null; mockupX: number; mockupY: number; mockupW: number; mockupH: number;
    areas: { code: string; name: string; xMm: number; yMm: number; widthMm: number; heightMm: number }[];
  }[];
};

type Fabric = typeof import("fabric");
type Output = { areaCode: string; json: unknown; pxPerMm: number; print: string; svg: string; flat: string };
type Sel =
  | { kind: "text"; fontFamily: string; pt: number; fill: string; bold: boolean; italic: boolean; align: string }
  | { kind: "image"; dpi: number }
  | { kind: "other" };

const MAX_W = 640;
const MAX_H = 600;
const PX_PER_MM_300DPI = 300 / 25.4;
const MAX_PRINT_PX = 4000;
const SAFE_MM = 3;
const FONTS = [
  { v: "Noto Sans TC", n: "思源黑體" },
  { v: "Noto Serif TC", n: "思源宋體" },
  { v: "Arial", n: "Arial" },
  { v: "Georgia", n: "Georgia" },
  { v: "Courier New", n: "Courier New" },
];

/** 判斷底色是否偏暗，用來決定預設文字顏色 */
const isDark = (hex: string) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
};

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });

export default function Designer({ product }: { product: DesignerProduct }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [active, setActive] = useState(0);
  const [maxW, setMaxW] = useState(MAX_W);
  const [showDieline, setShowDieline] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stageWrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fabricRef = useRef<Fabric | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const docs = useRef<Record<string, unknown>>({});
  const outputs = useRef<Record<string, Output>>({});
  const loading = useRef(false);
  const history = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const currentCode = useRef<string | null>(null);

  useEffect(() => {
    setDraft(loadDraft(product.slug));
    if (stageWrap.current) setMaxW(Math.min(MAX_W, stageWrap.current.clientWidth));
  }, [product.slug]);

  /** 客戶在商品頁選了哪些位置 / 面積 */
  const selected = useMemo(
    () =>
      (draft?.prints ?? []).flatMap((s) => {
        const pos = product.positions.find((p) => p.code === s.positionCode);
        const area = pos?.areas.find((a) => a.code === s.areaCode);
        const method = product.methods.find((m) => m.code === s.methodCode);
        return pos && area ? [{ pos, area, method, colors: s.colors }] : [];
      }),
    [draft, product],
  );
  const cur = selected[active];
  const colorHex = product.colors.find((c) => c.name === draft?.colorName)?.hex ?? "#ffffff";

  const geom = useCallback(
    (i: number) => {
      const { pos, area } = selected[i];
      const scale = Math.min(maxW / pos.widthMm, MAX_H / pos.heightMm);
      return { pos, area, scale, W: pos.widthMm * scale, H: pos.heightMm * scale, ax: area.xMm * scale, ay: area.yMm * scale, aw: area.widthMm * scale, ah: area.heightMm * scale };
    },
    [selected, maxW],
  );
  const g = cur ? geom(active) : null;

  // ---------- 畫布工具 ----------
  const snapshot = () => {
    const json = canvasRef.current!.toJSON() as Record<string, unknown>;
    delete json.clipPath;
    return json;
  };

  const refreshSel = useCallback(() => {
    const canvas = canvasRef.current;
    const o = canvas?.getActiveObject();
    if (!o || !g) return setSel(null);
    if (o.isType("textbox", "i-text", "text")) {
      const tb = o as Textbox;
      setSel({
        kind: "text", fontFamily: tb.fontFamily, fill: typeof tb.fill === "string" ? tb.fill : "#000000",
        pt: Math.round(((tb.fontSize * (tb.scaleY ?? 1)) / g.scale) * 2.835 * 10) / 10,
        bold: tb.fontWeight === "bold" || tb.fontWeight === 700, italic: tb.fontStyle === "italic", align: tb.textAlign,
      });
    } else if (o.isType("image")) {
      const img = o as FabricImage;
      const inches = img.getScaledWidth() / g.scale / 25.4;
      const isSvg = /\.svg($|\?)/i.test(img.getSrc());
      setSel({ kind: "image", dpi: isSvg ? 999 : Math.round(img.width / inches) });
    } else setSel({ kind: "other" });
  }, [g]);

  const updatePreview = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePreview = useCallback(() => {
    if (updatePreview.current) clearTimeout(updatePreview.current);
    updatePreview.current = setTimeout(() => {
      const c = canvasRef.current;
      if (c) setPreview(c.getObjects().length ? c.toDataURL({ format: "png", multiplier: 1 }) : null);
    }, 200);
  }, []);

  const pushHistory = useCallback(() => {
    const h = history.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(JSON.stringify(snapshot()));
    if (h.stack.length > 40) h.stack.shift();
    h.index = h.stack.length - 1;
    setHist({ undo: h.index > 0, redo: false });
  }, []);

  const applyClip = useCallback(
    (i: number) => {
      const fabric = fabricRef.current!;
      const q = geom(i);
      canvasRef.current!.clipPath = new fabric.Rect({ left: q.ax, top: q.ay, width: q.aw, height: q.ah, absolutePositioned: true });
    },
    [geom],
  );

  /** 把目前位置的內容存成 JSON 與輸出檔 */
  const capture = useCallback(
    (i: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !selected[i]) return;
      const q = geom(i);
      canvas.discardActiveObject();
      const json = snapshot();
      docs.current[q.pos.code] = json;
      if (!canvas.getObjects().length) {
        delete outputs.current[q.pos.code];
        return;
      }
      // 有供應商指定像素尺寸時照尺寸輸出，否則以 300 dpi 輸出
      const multiplier = q.pos.pxW ? Math.min(q.pos.pxW / q.aw, 8000 / Math.max(q.aw, q.ah)) : Math.min(PX_PER_MM_300DPI / q.scale, MAX_PRINT_PX / Math.max(q.aw, q.ah));
      outputs.current[q.pos.code] = {
        areaCode: q.area.code,
        json,
        pxPerMm: q.scale,
        print: canvas.toDataURL({ format: "png", left: q.ax, top: q.ay, width: q.aw, height: q.ah, multiplier }),
        svg: canvas.toSVG({ viewBox: { x: q.ax, y: q.ay, width: q.aw, height: q.ah }, width: `${q.area.widthMm}mm`, height: `${q.area.heightMm}mm` }),
        flat: canvas.toDataURL({ format: "png", multiplier: Math.min(2, 1000 / Math.max(q.W, q.H)) }),
      };
    },
    [geom, selected],
  );

  const loadPosition = useCallback(
    async (i: number, json?: unknown) => {
      const canvas = canvasRef.current!;
      const q = geom(i);
      loading.current = true;
      canvas.clear();
      canvas.setDimensions({ width: q.W, height: q.H });
      const doc = json ?? docs.current[q.pos.code];
      if (doc) await canvas.loadFromJSON(doc as Record<string, unknown>);
      applyClip(i);
      canvas.requestRenderAll();
      loading.current = false;
      currentCode.current = q.pos.code;
      setSel(null);
      schedulePreview();
    },
    [geom, applyClip, schedulePreview],
  );

  // ---------- 初始化 fabric ----------
  useEffect(() => {
    if (!selected.length || !host.current || canvasRef.current) return;
    let disposed = false;
    (async () => {
      const fabric = await import("fabric");
      if (disposed || !host.current) return;
      fabricRef.current = fabric;
      const el = document.createElement("canvas");
      host.current.appendChild(el);
      const canvas = new fabric.Canvas(el, { preserveObjectStacking: true, controlsAboveOverlay: true, selection: true });
      fabric.FabricObject.ownDefaults.cornerColor = "#23423a";
      fabric.FabricObject.ownDefaults.borderColor = "#23423a";
      fabric.FabricObject.ownDefaults.cornerStyle = "circle";
      fabric.FabricObject.ownDefaults.transparentCorners = false;
      canvasRef.current = canvas;
      await loadPosition(0);
      history.current = { stack: [JSON.stringify(snapshot())], index: 0 };
      (window as unknown as { __designer?: Canvas }).__designer = canvas;
      setReady(true);
      Promise.all(FONTS.slice(0, 2).map((f) => document.fonts.load(`16px "${f.v}"`))).then(() => canvas.requestRenderAll(), () => {});
    })();
    return () => {
      disposed = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length > 0]);

  // 事件綁定（依賴目前位置的幾何）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const changed = () => {
      if (loading.current) return;
      pushHistory();
      schedulePreview();
      refreshSel();
    };
    const offs = [
      canvas.on("object:added", changed),
      canvas.on("object:removed", changed),
      canvas.on("object:modified", changed),
      canvas.on("text:changed", () => schedulePreview()),
      canvas.on("selection:created", refreshSel),
      canvas.on("selection:updated", refreshSel),
      canvas.on("selection:cleared", refreshSel),
    ];
    return () => offs.forEach((off) => off());
  }, [ready, pushHistory, schedulePreview, refreshSel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const o = canvasRef.current?.getActiveObject() as (FabricObject & { isEditing?: boolean }) | undefined;
      if (o?.isEditing) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); act("delete"); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); travel(e.shiftKey ? 1 : -1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function switchTo(i: number) {
    if (i === active || !canvasRef.current) return;
    capture(active);
    setActive(i);
    await loadPosition(i);
    history.current = { stack: [JSON.stringify(snapshot())], index: 0 };
    setHist({ undo: false, redo: false });
  }

  async function travel(dir: 1 | -1) {
    const h = history.current;
    const next = h.index + dir;
    if (next < 0 || next >= h.stack.length) return;
    h.index = next;
    await loadPosition(active, JSON.parse(h.stack[next]));
    setHist({ undo: h.index > 0, redo: h.index < h.stack.length - 1 });
  }

  // ---------- 動作 ----------
  function addText() {
    const fabric = fabricRef.current, canvas = canvasRef.current;
    if (!fabric || !canvas || !g) return;
    const fontSize = Math.max(12, Math.min(g.ah * 0.18, g.aw * 0.14));
    const tb = new fabric.Textbox(t.designer.defaultText, {
      left: g.ax + g.aw / 2, top: g.ay + g.ah / 2, originX: "center", originY: "center", width: Math.min(g.aw * 0.9, fontSize * 6),
      fontSize, fontFamily: FONTS[0].v, fill: isDark(colorHex) ? "#ffffff" : "#1f1e1b", textAlign: "center",
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    canvas.requestRenderAll();
    refreshSel();
  }

  async function addImage(file: File | undefined) {
    const fabric = fabricRef.current, canvas = canvasRef.current;
    if (!file || !fabric || !canvas || !g) return;
    setBusy(t.product.uploading);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("kind", "image");
      fd.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const img = await fabric.FabricImage.fromURL(json.url);
      const w = img.width || 300, h = img.height || 300;
      const s = Math.min((g.aw * 0.8) / w, (g.ah * 0.8) / h);
      img.set({ left: g.ax + g.aw / 2, top: g.ay + g.ah / 2, originX: "center", originY: "center", scaleX: s, scaleY: s });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      refreshSel();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function act(kind: "delete" | "duplicate" | "forward" | "backward" | "centerH" | "centerV" | "fit") {
    const canvas = canvasRef.current;
    const o = canvas?.getActiveObject();
    if (!canvas || !o || !g) return;
    const center = o.getCenterPoint();
    const fabric = fabricRef.current!;
    switch (kind) {
      case "delete":
        canvas.getActiveObjects().forEach((x) => canvas.remove(x));
        canvas.discardActiveObject();
        break;
      case "duplicate": {
        const copy = await o.clone();
        copy.set({ left: (o.left ?? 0) + 12, top: (o.top ?? 0) + 12 });
        canvas.add(copy);
        canvas.setActiveObject(copy);
        break;
      }
      case "forward": canvas.bringObjectForward(o); break;
      case "backward": canvas.sendObjectBackwards(o); break;
      case "centerH": o.setPositionByOrigin(new fabric.Point(g.ax + g.aw / 2, center.y), "center", "center"); break;
      case "centerV": o.setPositionByOrigin(new fabric.Point(center.x, g.ay + g.ah / 2), "center", "center"); break;
      case "fit": {
        const k = Math.min(g.aw / o.getScaledWidth(), g.ah / o.getScaledHeight());
        o.set({ scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k });
        o.setPositionByOrigin(new fabric.Point(g.ax + g.aw / 2, g.ay + g.ah / 2), "center", "center");
        break;
      }
    }
    o.setCoords();
    canvas.requestRenderAll();
    if (kind !== "delete" && kind !== "duplicate") canvas.fire("object:modified", { target: o } as never);
  }

  function setText(patch: Partial<{ fontFamily: string; fill: string; bold: boolean; italic: boolean; align: string; pt: number }>) {
    const canvas = canvasRef.current;
    const o = canvas?.getActiveObject() as Textbox | undefined;
    if (!canvas || !o || !g) return;
    if (patch.fontFamily) o.set("fontFamily", patch.fontFamily);
    if (patch.fill) o.set("fill", patch.fill);
    if (patch.bold !== undefined) o.set("fontWeight", patch.bold ? "bold" : "normal");
    if (patch.italic !== undefined) o.set("fontStyle", patch.italic ? "italic" : "normal");
    if (patch.align) o.set("textAlign", patch.align);
    if (patch.pt && patch.pt > 0) o.set("fontSize", ((patch.pt / 2.835) * g.scale) / (o.scaleY ?? 1));
    o.setCoords();
    const done = () => { canvas.requestRenderAll(); canvas.fire("object:modified", { target: o } as never); };
    if (patch.fontFamily) document.fonts.load(`16px "${patch.fontFamily}"`).then(() => { o.initDimensions(); done(); }, done);
    else done();
  }

  /** 把排版結果合成到示意圖（或刀模）上，供購物車與後台預覽 */
  async function composite(i: number, flat: string): Promise<string> {
    const { pos } = selected[i];
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    const design = await loadImg(flat);
    if (pos.mockupUrl) {
      const base = await loadImg(pos.mockupUrl);
      const ratio = (base.naturalHeight || 800) / (base.naturalWidth || 800);
      c.width = 800;
      c.height = Math.round(800 * ratio);
      ctx.drawImage(base, 0, 0, c.width, c.height);
      ctx.drawImage(design, pos.mockupX * c.width, pos.mockupY * c.height, pos.mockupW * c.width, pos.mockupH * c.height);
    } else {
      c.width = 800;
      c.height = Math.round((800 * pos.heightMm) / pos.widthMm);
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(design, 0, 0, c.width, c.height);
      if (pos.dielineUrl) ctx.drawImage(await loadImg(pos.dielineUrl), 0, 0, c.width, c.height);
    }
    return c.toDataURL("image/jpeg", 0.88);
  }

  async function save() {
    if (!draft || !canvasRef.current) return;
    setError(null);
    capture(active);
    const codes = Object.keys(outputs.current);
    if (!codes.length) return setError(t.designer.empty);
    setBusy(t.designer.saving);
    try {
      const positions: Record<string, Omit<Output, "flat"> & { mockup: string }> = {};
      let previewImg: string | null = null;
      for (const [i, s] of selected.entries()) {
        const out = outputs.current[s.pos.code];
        if (!out) continue;
        const { flat, ...rest } = out;
        const mockup = await composite(i, flat);
        previewImg ??= mockup;
        positions[s.pos.code] = { ...rest, mockup };
      }
      const res = await fetch("/api/designs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, positions, preview: previewImg }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.designer.saveFailed);
      addToCart({ productId: product.id, slug: product.slug, sku: product.sku, name: product.name, image: product.image, colorName: draft.colorName, sizeName: draft.sizeName ?? null, qty: draft.qty, prints: draft.prints, designId: json.id, previewUrl: json.previewUrl });
      router.push("/cart");
    } catch (e) {
      setError((e as Error).message || t.designer.saveFailed);
      setBusy(null);
      await loadPosition(active);
    }
  }

  // ---------- 畫面 ----------
  if (draft === undefined) return <div ref={stageWrap} className="container-x py-20 text-center text-mute">{t.common.loading}</div>;
  if (!draft || !selected.length || !cur || !g) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-mute">{t.designer.noDraft}</p>
        <Link href={`/products/${product.slug}`} className="btn-primary mt-6">{t.designer.toProduct}</Link>
      </div>
    );
  }

  const tool = "btn-ghost w-full justify-start rounded-lg px-3 py-2";
  const mini = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs hover:border-ink disabled:opacity-40";

  return (
    <div className="container-x py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/products/${product.slug}`} className="text-sm text-mute hover:text-ink">← {t.designer.back}</Link>
        <h1 className="text-xl font-bold">{t.designer.title}｜{product.name}</h1>
        <button type="button" onClick={save} disabled={!!busy || !ready} className="btn-primary ml-auto" data-testid="save-design">{busy ?? t.designer.save}</button>
      </div>
      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {selected.map((s, i) => (
          <button key={s.pos.code} role="tab" aria-selected={i === active} type="button" onClick={() => switchTo(i)} className={i === active ? "chip-on" : "chip"}>
            {s.pos.name}・{s.area.name}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* 工具列 */}
        <aside className="space-y-4">
          <div className="card space-y-2 p-3">
            <button type="button" className={tool} onClick={addText} disabled={!ready}>Ｔ　{t.designer.addText}</button>
            <button type="button" className={tool} onClick={() => fileInput.current?.click()} disabled={!ready}>▣　{t.designer.addImage}</button>
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="sr-only" onChange={(e) => addImage(e.target.files?.[0])} data-testid="image-input" />
            <div className="flex gap-2 pt-1">
              <button type="button" className={mini} onClick={() => travel(-1)} disabled={!hist.undo}>↶ {t.designer.undo}</button>
              <button type="button" className={mini} onClick={() => travel(1)} disabled={!hist.redo}>↷ {t.designer.redo}</button>
            </div>
          </div>

          <div className="card p-3 text-sm">
            <div className="mb-2 font-medium">{t.designer.layers}</div>
            {!sel && <p className="text-xs text-mute">{t.designer.selectHint}</p>}
            {sel?.kind === "text" && (
              <div className="space-y-2">
                <label className="block"><span className="label">{t.designer.font}</span>
                  <select className="input" value={sel.fontFamily} onChange={(e) => setText({ fontFamily: e.target.value })}>
                    {FONTS.map((f) => <option key={f.v} value={f.v}>{f.n}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <label className="block flex-1"><span className="label">{t.designer.fontSize} (pt)</span>
                    <input type="number" min={4} step={1} className="input" value={sel.pt} onChange={(e) => setText({ pt: Number(e.target.value) })} />
                  </label>
                  <label className="block"><span className="label">{t.designer.fill}</span>
                    <input type="color" className="h-9 w-12 rounded border border-line" value={sel.fill} onChange={(e) => setText({ fill: e.target.value })} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={mini} aria-pressed={sel.bold} onClick={() => setText({ bold: !sel.bold })}><b>B</b></button>
                  <button type="button" className={mini} aria-pressed={sel.italic} onClick={() => setText({ italic: !sel.italic })}><i>I</i></button>
                  {(["left", "center", "right"] as const).map((a) => (
                    <button key={a} type="button" className={`${mini} ${sel.align === a ? "border-forest" : ""}`} onClick={() => setText({ align: a })}>{{ left: "⇤", center: "↔", right: "⇥" }[a]}</button>
                  ))}
                </div>
              </div>
            )}
            {sel?.kind === "image" && sel.dpi < 999 && (
              <p className={`text-xs ${sel.dpi < 150 ? "text-danger" : "text-mute"}`}>{sel.dpi < 150 ? t.designer.lowDpi(sel.dpi) : t.designer.okDpi(sel.dpi)}</p>
            )}
            {sel && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button type="button" className={mini} onClick={() => act("centerH")}>{t.designer.centerH}</button>
                <button type="button" className={mini} onClick={() => act("centerV")}>{t.designer.centerV}</button>
                <button type="button" className={mini} onClick={() => act("forward")}>{t.designer.forward}</button>
                <button type="button" className={mini} onClick={() => act("backward")}>{t.designer.backward}</button>
                <button type="button" className={mini} onClick={() => act("fit")}>{t.designer.fit}</button>
                <button type="button" className={mini} onClick={() => act("duplicate")}>{t.designer.duplicate}</button>
                <button type="button" className={`${mini} col-span-2 text-danger`} onClick={() => act("delete")}>{t.designer.delete}</button>
              </div>
            )}
          </div>
          {cur.method?.perColor && <p className="rounded-lg bg-gold/10 p-3 text-xs leading-relaxed text-gold">{t.designer.colorLimit(cur.colors, cur.method.name)}</p>}
          <p className="text-xs leading-relaxed text-mute">{t.designer.tips}</p>
        </aside>

        {/* 排版區：底色 → fabric 畫布 → 刀模 → 印刷範圍標示 */}
        <section ref={stageWrap} className="min-w-0" data-testid="dropzone"
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
          onDrop={(e) => { const f = e.dataTransfer.files?.[0]; if (f) { e.preventDefault(); addImage(f); } }}>
          <div className="card flex justify-center overflow-auto bg-sand p-4">
            <div className="relative shrink-0 shadow-sm" style={{ width: g.W, height: g.H, background: colorHex }} data-testid="stage">
              <div ref={host} className="absolute inset-0" />
              {showDieline && cur.pos.dielineUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cur.pos.dielineUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" data-testid="dieline" />
              )}
              <div className="pointer-events-none absolute border border-dashed border-gold" style={{ left: g.ax, top: g.ay, width: g.aw, height: g.ah }}>
                <span className={`absolute left-0 rounded bg-gold px-1.5 text-[10px] leading-4 whitespace-nowrap text-white ${g.ay < 20 ? "top-1 left-1" : "-top-5"}`}>{cur.pos.pxW ? `${t.designer.printPx} ${cur.pos.pxW} × ${cur.pos.pxH} px` : `${t.designer.printArea} ${cur.area.widthMm} × ${cur.area.heightMm} mm`}</span>
                {!cur.pos.pxW && Math.min(cur.area.widthMm, cur.area.heightMm) >= 20 && (
                  <div className="absolute border border-dotted border-forest/50" style={{ inset: SAFE_MM * g.scale }} />
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mute">
            {cur.pos.dielineUrl && <label className="flex items-center gap-2 text-ink">
              <input type="checkbox" checked={showDieline} onChange={(e) => setShowDieline(e.target.checked)} className="accent-[var(--color-forest)]" />{t.designer.showDieline}
            </label>}
            {cur.pos.dielineUrl && <Legend style={{ borderTop: "2px solid #E6007E" }} label={t.designer.legendCut} />}
            {cur.pos.dielineUrl && <Legend style={{ borderTop: "2px dashed #00A0C6" }} label={t.designer.legendFold} />}
            <Legend style={{ borderTop: "2px dashed var(--color-gold)" }} label={t.designer.legendArea} />
            {!cur.pos.pxW && <Legend style={{ borderTop: "2px dotted var(--color-forest)" }} label={t.designer.legendSafe} />}
          </div>
        </section>

        {/* 示意圖 */}
        <aside>
          <div className="card p-3">
            <div className="mb-2 text-sm font-medium">{t.designer.mockup}</div>
            <div className="relative overflow-hidden rounded-lg" style={cur.pos.mockupUrl ? undefined : { aspectRatio: `${cur.pos.widthMm} / ${cur.pos.heightMm}`, background: colorHex }} data-testid="mockup">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cur.pos.mockupUrl && <img src={cur.pos.mockupUrl} alt="" className="block w-full" />}
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="absolute" data-testid="mockup-design"
                  style={cur.pos.mockupUrl
                    ? { left: `${cur.pos.mockupX * 100}%`, top: `${cur.pos.mockupY * 100}%`, width: `${cur.pos.mockupW * 100}%`, height: `${cur.pos.mockupH * 100}%` }
                    : { inset: 0, width: "100%", height: "100%" }} />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {!cur.pos.mockupUrl && cur.pos.dielineUrl && <img src={cur.pos.dielineUrl} alt="" className="absolute inset-0 h-full w-full" />}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mute">{cur.pos.mockupUrl ? t.designer.mockupNote : cur.pos.dielineUrl ? t.designer.noMockup : t.designer.flatNote}</p>
            {!cur.pos.mockupUrl && !cur.pos.dielineUrl && product.image && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-2 text-xs text-mute">{t.designer.productRef}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={product.name} className="w-full rounded-lg" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Legend({ style, label }: { style: React.CSSProperties; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-5" style={style} />
      {label}
    </span>
  );
}
