"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Canvas, FabricObject, FabricImage, Textbox } from "fabric";
import { t } from "@/i18n";
import { loadDraft, useCart, type Draft } from "@/lib/cart";
import { analyze, planMockup, renderMockup, type MockupModel, type Placement } from "@/lib/mockup";

export type DesignerProduct = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  image: string | null;
  colors: { name: string; hex: string; image?: string }[];
  methods: { code: string; name: string; perColor: boolean }[];
  positions: {
    code: string; name: string; dielineUrl: string | null; widthMm: number; heightMm: number; pxW: number | null; pxH: number | null;
    mockupUrl: string | null; mockupX: number; mockupY: number; mockupW: number; mockupH: number;
    areas: { code: string; name: string; xMm: number; yMm: number; widthMm: number; heightMm: number }[];
  }[];
};

type Fabric = typeof import("fabric");
type Doc = { canvas: unknown; pxPerMm: number };
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

const loadImg = (src: string, cors = false) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });

export default function Designer({ product }: { product: DesignerProduct }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const [maxW, setMaxW] = useState(MAX_W);
  const [showDieline, setShowDieline] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState<MockupModel | null>(null);
  const [mockState, setMockState] = useState<"idle" | "loading" | "ready" | "none">("idle");
  const [guides, setGuides] = useState({ v: false, h: false });
  const [bg, setBg] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [, setTick] = useState(0);

  const stageWrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fabricRef = useRef<Fabric | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const docs = useRef<Record<string, Doc>>({});
  const flats = useRef<Record<string, HTMLCanvasElement>>({});
  const mockRef = useRef<HTMLCanvasElement>(null);
  const baseImg = useRef<HTMLImageElement | null>(null);
  const modelRef = useRef<MockupModel | null>(null);
  const planRef = useRef<Placement[]>([]);
  const editItem = useRef<string | null>(null);
  const outputs = useRef<Record<string, Output>>({});
  const loading = useRef(false);
  const history = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 });
  const currentCode = useRef<string | null>(null);

  useEffect(() => {
    // 依版面算出排版區可用寬度（桌機為三欄，中間欄 = 內容寬 − 左右欄）
    const inner = Math.min(window.innerWidth, 1152) - 48;
    setMaxW(Math.max(260, Math.min(MAX_W, (window.innerWidth >= 1024 ? inner - 560 : inner) - 36)));
    // 從購物車「重新編輯」進來：載回原本的設計
    const sp = new URLSearchParams(window.location.search);
    const edit = sp.get("edit"), itemId = sp.get("item");
    const item = edit && itemId ? useCart.getState().items.find((x) => x.id === itemId && x.designId === edit && x.slug === product.slug) : null;
    if (!item) return setDraft(loadDraft(product.slug));
    fetch(`/api/designs/${edit}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { data: Record<string, { json: Doc }> }) => {
        for (const [code, d] of Object.entries(j.data)) if (d.json?.canvas) docs.current[code] = { canvas: d.json.canvas, pxPerMm: d.json.pxPerMm };
        editItem.current = item.id;
        setDraft({ slug: product.slug, qty: item.qty, colorName: item.colorName, sizeName: item.sizeName, prints: item.prints });
      })
      .catch(() => setDraft(loadDraft(product.slug)));
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
  const color = product.colors.find((c) => c.name === draft?.colorName);
  const colorHex = color?.hex ?? "#ffffff";
  /** 沒有專屬示意圖與刀模的商品：用商品照片自動產生示意圖 */
  const baseUrl = color?.image ?? product.image;
  const auto = !!baseUrl && selected.length > 0 && selected.every((s) => !s.pos.mockupUrl && !s.pos.dielineUrl);
  const stageBg = cur?.pos.pxW ? "#ffffff" : colorHex;

  const geom = useCallback(
    (i: number) => {
      const { pos, area } = selected[i];
      const scale = Math.min(maxW / pos.widthMm, MAX_H / pos.heightMm);
      return { pos, area, scale, W: pos.widthMm * scale, H: pos.heightMm * scale, ax: area.xMm * scale, ay: area.yMm * scale, aw: area.widthMm * scale, ah: area.heightMm * scale };
    },
    [selected, maxW],
  );
  const g = cur ? geom(active) : null;
  const gRef = useRef(g);
  gRef.current = g;

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

  const hasContent = () => {
    const c = canvasRef.current;
    return !!c && (c.getObjects().length > 0 || !!c.backgroundColor);
  };
  /** 目前印刷面的設計（只裁印刷範圍） */
  const cropCanvas = useCallback(
    (i: number) => {
      const q = geom(i);
      return canvasRef.current!.toCanvasElement(Math.min(2, 900 / Math.max(q.aw, q.ah)), { left: q.ax, top: q.ay, width: q.aw, height: q.ah });
    },
    [geom],
  );
  /** 把各印刷面的設計貼到商品照片上 */
  const drawMock = useCallback(
    (target: HTMLCanvasElement | null, live: boolean, size = 800) => {
      const m = modelRef.current, base = baseImg.current;
      if (!target || !m || !base || !m.regions.length) return false;
      const designOf = (code: string) => (live && code === currentCode.current ? (hasContent() ? cropCanvas(activeRef.current) : null) : flats.current[code] ?? null);
      const designs = product.positions.map((pos) => designOf(pos.code));
      renderMockup(target, base, m, planRef.current, designs, size);
      return true;
    },
    [cropCanvas, product.positions],
  );

  /** 更新某一面的平面預覽縮圖 */
  const refreshThumb = useCallback(
    (i: number) => {
      const s0 = selected[i];
      if (!s0 || !canvasRef.current) return;
      const q = geom(i);
      const url = hasContent()
        ? canvasRef.current.toDataURL({ format: "png", left: q.ax, top: q.ay, width: q.aw, height: q.ah, multiplier: Math.min(2, 520 / Math.max(q.aw, q.ah)) })
        : null;
      setThumbs((t0) => (t0[s0.pos.code] === url ? t0 : { ...t0, [s0.pos.code]: url }));
    },
    [geom, selected],
  );

  const updatePreview = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePreview = useCallback(() => {
    if (updatePreview.current) clearTimeout(updatePreview.current);
    updatePreview.current = setTimeout(() => {
      const c = canvasRef.current;
      if (!c) return;
      if (modelRef.current) drawMock(mockRef.current, true);
      else setPreview(hasContent() ? c.toDataURL({ format: "png", multiplier: 1 }) : null);
      refreshThumb(activeRef.current);
    }, 120);
  }, [drawMock, refreshThumb]);

  /** 拖曳、縮放、旋轉的過程中即時更新示意圖（用較小的尺寸換取流暢度） */
  const liveBusy = useRef(false);
  const livePreview = useCallback(() => {
    if (liveBusy.current || !modelRef.current) return;
    liveBusy.current = true;
    requestAnimationFrame(() => {
      drawMock(mockRef.current, true, 520);
      liveBusy.current = false;
    });
  }, [drawMock]);

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
      docs.current[q.pos.code] = { canvas: json, pxPerMm: q.scale };
      if (!hasContent()) {
        delete outputs.current[q.pos.code];
        delete flats.current[q.pos.code];
        return;
      }
      flats.current[q.pos.code] = cropCanvas(i);
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
    [geom, selected, cropCanvas],
  );

  const loadPosition = useCallback(
    async (i: number, json?: unknown) => {
      const canvas = canvasRef.current!;
      const q = geom(i);
      loading.current = true;
      canvas.clear();
      canvas.setDimensions({ width: q.W, height: q.H });
      const doc: Doc | undefined = json ? { canvas: json, pxPerMm: q.scale } : docs.current[q.pos.code];
      if (doc) {
        await canvas.loadFromJSON(doc.canvas as Record<string, unknown>);
        // 設計是在不同畫面大小下存的：等比例換算到目前的畫布
        const k = q.scale / doc.pxPerMm;
        if (Math.abs(k - 1) > 1e-3) {
          canvas.getObjects().forEach((o) => { o.set({ left: o.left * k, top: o.top * k, scaleX: o.scaleX * k, scaleY: o.scaleY * k }); o.setCoords(); });
        }
      }
      applyClip(i);
      canvas.requestRenderAll();
      loading.current = false;
      currentCode.current = q.pos.code;
      setSel(null);
      setBg(typeof canvas.backgroundColor === "string" && canvas.backgroundColor ? canvas.backgroundColor : null);
      setTick((n) => n + 1);
      schedulePreview();
    },
    [geom, applyClip, schedulePreview],
  );

  // ---------- 商品照片 → 示意圖模型 ----------
  useEffect(() => {
    if (!auto || !baseUrl) return;
    let cancelled = false;
    setMockState("loading");
    loadImg(baseUrl, true)
      .then((img) => {
        if (cancelled) return;
        const m = analyze(img);
        baseImg.current = img;
        modelRef.current = m.regions.length ? m : null;
        planRef.current = planMockup(product.positions.map((x) => x.name), m.regions);
        setModel(modelRef.current);
        setMockState(m.regions.length ? "ready" : "none");
      })
      .catch(() => { if (!cancelled) setMockState("none"); });
    return () => { cancelled = true; };
  }, [auto, baseUrl, product.positions]);
  useEffect(() => { if (model && ready) drawMock(mockRef.current, true); }, [model, ready, drawMock]);

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
      setTick((n) => n + 1);
    };
    // 拖曳時靠近印刷範圍中心會自動吸附並顯示參考線
    const moving = (e: { target: FabricObject }) => {
      const fabric = fabricRef.current, q = gRef.current, o = e.target;
      if (!fabric || !q || !o) return;
      const c = o.getCenterPoint(), cx = q.ax + q.aw / 2, cy = q.ay + q.ah / 2;
      const v = Math.abs(c.x - cx) < 6, h = Math.abs(c.y - cy) < 6;
      if (v || h) o.setPositionByOrigin(new fabric.Point(v ? cx : c.x, h ? cy : c.y), "center", "center");
      setGuides((g0) => (g0.v === v && g0.h === h ? g0 : { v, h }));
    };
    const offs = [
      canvas.on("object:added", changed),
      canvas.on("object:removed", changed),
      canvas.on("object:modified", changed),
      canvas.on("object:moving", moving as never),
      canvas.on("object:moving", livePreview),
      canvas.on("object:scaling", livePreview),
      canvas.on("object:rotating", livePreview),
      canvas.on("object:resizing", livePreview),
      canvas.on("text:changed", livePreview),
      canvas.on("mouse:up", () => setGuides({ v: false, h: false })),
      canvas.on("text:changed", () => schedulePreview()),
      canvas.on("selection:created", refreshSel),
      canvas.on("selection:updated", refreshSel),
      canvas.on("selection:cleared", refreshSel),
    ];
    return () => offs.forEach((off) => off());
  }, [ready, pushHistory, schedulePreview, refreshSel, livePreview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const o = canvasRef.current?.getActiveObject() as (FabricObject & { isEditing?: boolean }) | undefined;
      if (o?.isEditing) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); act("delete"); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); travel(e.shiftKey ? 1 : -1); }
      else if (o && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        o.set({ left: o.left + (e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0), top: o.top + (e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0) });
        o.setCoords();
        canvasRef.current!.requestRenderAll();
        canvasRef.current!.fire("object:modified", { target: o } as never);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 雙指縮放與旋轉（觸控裝置）
  useEffect(() => {
    if (!ready) return;
    const stage = host.current;
    let start: { dist: number; ang: number; sx: number; sy: number; rot: number; o: FabricObject } | null = null;
    const measure = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return { dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY), ang: (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI };
    };
    const onStart = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      const o = canvas?.getActiveObject() as (FabricObject & { isEditing?: boolean }) | undefined;
      if (e.touches.length !== 2 || !o || o.isEditing || !stage?.contains(e.target as Node)) return;
      const m = measure(e);
      if (m.dist > 0) start = { ...m, sx: o.scaleX, sy: o.scaleY, rot: o.angle, o };
    };
    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      // 攔下事件，避免畫布把它當成單指拖曳
      e.preventDefault();
      e.stopPropagation();
      const fabric = fabricRef.current!, canvas = canvasRef.current!, { o } = start;
      const m = measure(e), k = Math.max(0.05, m.dist / start.dist), c = o.getCenterPoint();
      o.set({ scaleX: start.sx * k, scaleY: start.sy * k });
      o.rotate(start.rot + (m.ang - start.ang));
      o.setPositionByOrigin(new fabric.Point(c.x, c.y), "center", "center");
      o.setCoords();
      canvas.requestRenderAll();
    };
    const onEnd = () => {
      if (!start) return;
      const { o } = start;
      start = null;
      // 畫布會把「手指放開」當成點了一下文字而進入打字模式：手勢結束後退出
      setTimeout(() => {
        const tb = o as FabricObject & { isEditing?: boolean; exitEditing?: () => void };
        if (tb.isEditing) tb.exitEditing?.();
        canvasRef.current?.requestRenderAll();
        canvasRef.current?.fire("object:modified", { target: o } as never);
      }, 0);
    };
    window.addEventListener("touchstart", onStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onMove, { capture: true, passive: false });
    window.addEventListener("touchend", onEnd, { capture: true });
    window.addEventListener("touchcancel", onEnd, { capture: true });
    return () => {
      window.removeEventListener("touchstart", onStart, { capture: true });
      window.removeEventListener("touchmove", onMove, { capture: true });
      window.removeEventListener("touchend", onEnd, { capture: true });
      window.removeEventListener("touchcancel", onEnd, { capture: true });
    };
  }, [ready]);

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
      fontSize, fontFamily: FONTS[0].v, fill: isDark(bg ?? stageBg) ? "#ffffff" : "#1f1e1b", textAlign: "center",
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

  async function act(kind: "delete" | "duplicate" | "forward" | "backward" | "centerH" | "centerV" | "fit" | "cover" | "flipH" | "flipV") {
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
      case "flipH": o.set("flipX", !o.flipX); break;
      case "flipV": o.set("flipY", !o.flipY); break;
      case "fit":
      case "cover": {
        const k = (kind === "fit" ? Math.min : Math.max)(g.aw / o.getScaledWidth(), g.ah / o.getScaledHeight());
        o.set({ scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k });
        o.setPositionByOrigin(new fabric.Point(g.ax + g.aw / 2, g.ay + g.ah / 2), "center", "center");
        break;
      }
    }
    o.setCoords();
    canvas.requestRenderAll();
    if (kind !== "delete" && kind !== "duplicate") canvas.fire("object:modified", { target: o } as never);
  }

  function setBackground(value: string | null) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.backgroundColor = value ?? "";
    setBg(value);
    canvas.requestRenderAll();
    pushHistory();
    schedulePreview();
  }

  function pick(o: FabricObject) {
    const canvas = canvasRef.current!;
    canvas.setActiveObject(o);
    canvas.requestRenderAll();
    refreshSel();
  }

  function toggleVisible(o: FabricObject) {
    const canvas = canvasRef.current!;
    o.set("visible", !o.visible);
    if (!o.visible) canvas.discardActiveObject();
    canvas.requestRenderAll();
    canvas.fire("object:modified", { target: o } as never);
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
    if (auto && drawMock(c, false)) return c.toDataURL("image/jpeg", 0.88);
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
      ctx.fillStyle = stageBg;
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
      if (editItem.current) useCart.getState().replace(editItem.current, { designId: json.id, previewUrl: json.previewUrl });
      else addToCart({ productId: product.id, slug: product.slug, sku: product.sku, name: product.name, image: product.image, colorName: draft.colorName, sizeName: draft.sizeName ?? null, qty: draft.qty, prints: draft.prints, designId: json.id, previewUrl: json.previewUrl });
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

  const activeObj = canvasRef.current?.getActiveObject();
  const layers = (canvasRef.current?.getObjects() ?? [])
    .map((o, i) => ({
      o,
      label: o.isType("textbox", "i-text", "text") ? `${t.designer.layerText}：${(o as Textbox).text.replace(/\s+/g, " ").slice(0, 14)}` : `${t.designer.layerImage} ${i + 1}`,
    }))
    .reverse();
  /** 目前這一面有沒有出現在商品照片上 */
  const inPhoto = planRef.current.some((pl) => product.positions[pl.pos]?.code === cur.pos.code);
  const tool = "btn-ghost w-full justify-start rounded-lg px-3 py-2";
  const mini = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs hover:border-ink disabled:opacity-40";

  return (
    <div className="container-x py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/products/${product.slug}`} className="text-sm text-mute hover:text-ink">← {t.designer.back}</Link>
        <h1 className="text-xl font-bold">{t.designer.title}｜{product.name}</h1>
        <button type="button" onClick={save} disabled={!!busy || !ready} className="btn-primary ml-auto" data-testid="save-design">{busy ?? (editItem.current ? t.designer.saveEdit : t.designer.save)}</button>
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
        <aside className="order-2 space-y-4 lg:order-none">
          <div className="card space-y-2 p-3">
            <button type="button" className={tool} onClick={addText} disabled={!ready}>Ｔ　{t.designer.addText}</button>
            <button type="button" className={tool} onClick={() => fileInput.current?.click()} disabled={!ready}>▣　{t.designer.addImage}</button>
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="sr-only" onChange={(e) => addImage(e.target.files?.[0])} data-testid="image-input" />
            <div className="flex items-center gap-2 px-1 py-1 text-sm">
              <span className="flex-1">{t.designer.bg}</span>
              <input type="color" aria-label={t.designer.bg} className="h-8 w-10 rounded border border-line" value={bg ?? "#ffffff"} onChange={(e) => setBackground(e.target.value)} disabled={!ready} />
              <button type="button" className={mini} onClick={() => setBackground(null)} disabled={!bg}>{t.designer.clearBg}</button>
            </div>
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
                <button type="button" className={mini} onClick={() => act("cover")}>{t.designer.cover}</button>
                <button type="button" className={mini} onClick={() => act("flipH")}>{t.designer.flipH}</button>
                <button type="button" className={mini} onClick={() => act("flipV")}>{t.designer.flipV}</button>
                <button type="button" className={mini} onClick={() => act("duplicate")}>{t.designer.duplicate}</button>
                <button type="button" className={`${mini} col-span-2 text-danger`} onClick={() => act("delete")}>{t.designer.delete}</button>
              </div>
            )}
          </div>
          {layers.length > 0 && (
            <div className="card p-3 text-sm">
              <div className="mb-2 font-medium">{t.designer.layersTitle}</div>
              <ul className="space-y-1">
                {layers.map(({ o, label }, i) => (
                  <li key={i} className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${activeObj === o ? "border-forest bg-forest/5" : "border-line"}`}>
                    <button type="button" className="min-w-0 flex-1 truncate text-left text-xs" onClick={() => pick(o)}>{label}</button>
                    <button type="button" className="px-1 text-xs text-mute hover:text-ink" title={o.visible ? t.designer.hide : t.designer.show} onClick={() => toggleVisible(o)}>{o.visible ? "◉" : "○"}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cur.method?.perColor && <p className="rounded-lg bg-gold/10 p-3 text-xs leading-relaxed text-gold">{t.designer.colorLimit(cur.colors, cur.method.name)}</p>}
          <p className="text-xs leading-relaxed text-mute">{t.designer.tips}</p>
        </aside>

        {/* 排版區：底色 → fabric 畫布 → 刀模 → 印刷範圍標示 */}
        <section ref={stageWrap} className="order-1 min-w-0 lg:order-none" data-testid="dropzone"
          onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
          onDrop={(e) => { const f = e.dataTransfer.files?.[0]; if (f) { e.preventDefault(); addImage(f); } }}>
          <div className="card flex justify-center overflow-auto bg-sand p-4">
            <div className="relative shrink-0 shadow-sm" style={{ width: g.W, height: g.H, background: stageBg }} data-testid="stage">
              <div ref={host} className="absolute inset-0" />
              {showDieline && cur.pos.dielineUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cur.pos.dielineUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" data-testid="dieline" />
              )}
              {guides.v && <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#E6007E]" style={{ left: g.ax + g.aw / 2 }} />}
              {guides.h && <div className="pointer-events-none absolute right-0 left-0 h-px bg-[#E6007E]" style={{ top: g.ay + g.ah / 2 }} />}
              <div className="pointer-events-none absolute border border-dashed border-gold" style={{ left: g.ax, top: g.ay, width: g.aw, height: g.ah }}>
                <span className={`absolute rounded bg-gold px-1.5 text-[10px] leading-4 whitespace-nowrap text-white ${g.ay < 20 ? "top-1 left-1" : "-top-5 left-0"}`}>{cur.pos.pxW ? `${t.designer.printPx} ${cur.pos.pxW} × ${cur.pos.pxH} px` : `${t.designer.printArea} ${cur.area.widthMm} × ${cur.area.heightMm} mm`}</span>
                {!cur.pos.pxW && Math.min(cur.area.widthMm, cur.area.heightMm) >= 20 && (
                  <div className="absolute border border-dotted border-forest/50" style={{ inset: SAFE_MM * g.scale }} />
                )}
              </div>
            </div>
          </div>
          {auto && <p className="mt-3 text-xs leading-relaxed text-mute">{t.designer.fullArea}</p>}
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
        <aside className="order-3 lg:order-none">
          <div className="card p-3">
            <div className="mb-2 text-sm font-medium">{t.designer.mockup}</div>
            {auto ? (
              <>
                {/* 目前這一面不在商品照片上：先顯示這一面實際會印出來的畫面 */}
                {mockState === "ready" && !inPhoto && (
                  <div className="mb-3" data-testid="face-flat">
                    <div className="grid place-items-center rounded-lg bg-sand p-4">
                      <div className="w-full overflow-hidden rounded bg-white shadow-md" style={{ aspectRatio: `${g.aw} / ${g.ah}`, maxHeight: 320, maxWidth: (320 * g.aw) / g.ah }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {thumbs[cur.pos.code] && <img src={thumbs[cur.pos.code]!} alt="" className="h-full w-full" />}
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-medium">{t.designer.flatOf(cur.pos.name)}</div>
                  </div>
                )}
                {mockState === "ready" ? (
                  <div className={inPhoto ? "" : "flex items-center gap-3 rounded-lg border border-line p-2"}>
                    <canvas ref={mockRef} className={`block rounded-lg ${inPhoto ? "w-full" : "w-24 shrink-0"}`} data-testid="mockup-canvas" />
                    {!inPhoto && <span className="text-xs leading-relaxed text-mute">{t.designer.notInPhoto(cur.pos.name)}</span>}
                  </div>
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={baseUrl!} alt={product.name} className="block w-full rounded-lg" />
                    {mockState === "loading" && <span className="absolute inset-x-0 bottom-2 text-center text-xs text-mute">{t.designer.analyzing}</span>}
                  </div>
                )}
                <p className="mt-2 text-xs leading-relaxed text-mute">{mockState === "none" ? t.designer.flatNote : t.designer.mockSim}</p>
                {selected.length > 1 && (
                  <div className="mt-4 border-t border-line pt-3" data-testid="face-tiles">
                    <div className="mb-2 text-xs font-medium">{t.designer.allFaces}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.map((s0, i) => (
                        <button key={s0.pos.code} type="button" onClick={() => switchTo(i)} className={`rounded-lg border p-1.5 text-left transition ${i === active ? "border-forest ring-1 ring-forest" : "border-line hover:border-ink"}`}>
                          <div className="grid aspect-square place-items-center overflow-hidden rounded bg-sand">
                            {thumbs[s0.pos.code] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbs[s0.pos.code]!} alt="" className="max-h-full max-w-full bg-white shadow-sm" />
                            ) : (
                              <span className="text-[10px] text-mute">{((docs.current[s0.pos.code]?.canvas as { objects?: unknown[] } | undefined)?.objects?.length ?? 0) > 0 ? t.designer.doneFace : t.designer.emptyFace}</span>
                            )}
                          </div>
                          <div className="mt-1 truncate text-[11px]">{s0.pos.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative overflow-hidden rounded-lg" style={cur.pos.mockupUrl ? undefined : { aspectRatio: `${cur.pos.widthMm} / ${cur.pos.heightMm}`, background: stageBg }} data-testid="mockup">
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
                <p className="mt-2 text-xs leading-relaxed text-mute">{cur.pos.mockupUrl ? t.designer.mockupNote : t.designer.noMockup}</p>
              </>
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
