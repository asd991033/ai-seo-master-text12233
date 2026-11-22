/**
 * 成品示意圖：在商品照片上找出「YOUR DESIGN HERE」的印刷區（淡藍斜紋佔位圖），
 * 把客戶的設計貼上去並保留布料陰影。純瀏覽器端運算，不需要伺服器。
 */
export type Region = {
  /** 0~255 的遮罩（N×N） */
  mask: Uint8ClampedArray;
  area: number;
  /** 外接矩形（以 N 為基準的像素座標），angle 為弧度 */
  cx: number; cy: number; w: number; h: number; angle: number;
  /** 設計透明處要顯示的底色：印刷區被商品本體包住時取商品顏色（如黑 T），否則為白 */
  fill: string;
  /** 印刷區是否被商品本體包住（如 T 恤胸前）；false 代表整個商品都是印刷區（滿版） */
  enclosed: boolean;
};
export type MockupModel = { n: number; regions: Region[]; shade: Uint8ClampedArray };

const N = 440;

function boxMax(src: Uint8Array | Uint8ClampedArray, n: number, r: number, min = false): Uint8ClampedArray {
  // 可分離的方形最大（或最小）濾波
  const tmp = new Uint8ClampedArray(n * n), out = new Uint8ClampedArray(n * n);
  const pick = min ? Math.min : Math.max;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = min ? 255 : 0;
    for (let k = Math.max(0, x - r); k <= Math.min(n - 1, x + r); k++) v = pick(v, src[y * n + k]);
    tmp[y * n + x] = v;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = min ? 255 : 0;
    for (let k = Math.max(0, y - r); k <= Math.min(n - 1, y + r); k++) v = pick(v, tmp[k * n + x]);
    out[y * n + x] = v;
  }
  return out;
}

function boxBlur(src: Uint8ClampedArray, n: number, r: number): Uint8ClampedArray {
  const tmp = new Float32Array(n * n), out = new Uint8ClampedArray(n * n);
  for (let y = 0; y < n; y++) {
    let s = 0, c = 0;
    for (let x = -r; x < n; x++) {
      if (x + r < n) { s += src[y * n + x + r]; c++; }
      if (x - r - 1 >= 0) { s -= src[y * n + x - r - 1]; c--; }
      if (x >= 0) tmp[y * n + x] = s / c;
    }
  }
  for (let x = 0; x < n; x++) {
    let s = 0, c = 0;
    for (let y = -r; y < n; y++) {
      if (y + r < n) { s += tmp[(y + r) * n + x]; c++; }
      if (y - r - 1 >= 0) { s -= tmp[(y - r - 1) * n + x]; c--; }
      if (y >= 0) out[y * n + x] = s / c;
    }
  }
  return out;
}

export function analyze(img: CanvasImageSource): MockupModel {
  const n = N;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, n, n);
  ctx.drawImage(img, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  const seed = new Uint8Array(n * n), light = new Uint8Array(n * n), white = new Uint8Array(n * n), lum = new Uint8ClampedArray(n * n);
  const blue = new Uint8ClampedArray(n * n), isText = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;
    const text = b >= 140 && r <= 110 && b - r >= 70;
    const pale = b - r >= 12 && b >= g && Math.min(r, g) >= 130 && b >= 190;
    if (text || pale) seed[i] = 255;
    blue[i] = b;
    if (b - r >= 85 && r < 175) isText[i] = 1;
    // 佔位圖本體：白色、淡藍或藍字（排除深色配件與其他顏色）
    const bluish = b >= r + 12 && b >= g && b >= 120;
    if (text || pale || bluish || (l >= 150 && Math.max(r, g, b) - Math.min(r, g, b) <= 40)) light[i] = 1;
    if (r >= 252 && g >= 252 && b >= 252) white[i] = 1;
  }
  // 斜紋之間的白色用閉運算補起來，得到印刷區的大致範圍
  const R = Math.round(n * 0.055);
  const closed = boxMax(boxMax(boxMax(seed, n, R), n, R, true), n, Math.round(R * 0.6));

  // 從四邊往內填滿純白背景（商品邊緣的陰影會擋住，不會灌進商品內部）
  const bg = new Uint8Array(n * n);
  const stack: number[] = [];
  const push = (i: number) => { if (!bg[i] && white[i]) { bg[i] = 1; stack.push(i); } };
  for (let k = 0; k < n; k++) { push(k); push((n - 1) * n + k); push(k * n); push(k * n + n - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % n, y = (i / n) | 0;
    if (x > 0) push(i - 1);
    if (x < n - 1) push(i + 1);
    if (y > 0) push(i - n);
    if (y < n - 1) push(i + n);
  }
  const m = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) m[i] = closed[i] && light[i] && !bg[i] ? 1 : 0;

  // 補小洞（文字邊緣的雜點），保留拉鍊這類較大的缺口
  {
    const seen = new Uint8Array(n * n);
    const maxHole = n * n * 0.0025;
    for (let s0 = 0; s0 < n * n; s0++) {
      if (m[s0] || seen[s0]) continue;
      const cells = [s0];
      seen[s0] = 1;
      let edge = false;
      for (let q = 0; q < cells.length; q++) {
        const i = cells[q], x = i % n, y = (i / n) | 0;
        if (x === 0 || y === 0 || x === n - 1 || y === n - 1) edge = true;
        for (const j of [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, y > 0 ? i - n : -1, y < n - 1 ? i + n : -1]) {
          if (j >= 0 && !m[j] && !seen[j]) { seen[j] = 1; cells.push(j); }
        }
      }
      if (!edge && cells.length <= maxHole) for (const i of cells) m[i] = 1;
    }
  }
  // 平滑邊緣：模糊後取多數決
  {
    const tmp = new Uint8ClampedArray(n * n);
    for (let i = 0; i < n * n; i++) tmp[i] = m[i] ? 255 : 0;
    let sm = boxBlur(tmp, n, 4);
    for (let i = 0; i < n * n; i++) tmp[i] = sm[i] >= 128 ? 255 : 0;
    sm = boxBlur(tmp, n, 3);
    for (let i = 0; i < n * n; i++) m[i] = sm[i] >= 128 ? 1 : 0;
  }

  // 連通元件
  const label = new Int32Array(n * n);
  const comps: { id: number; area: number }[] = [];
  void lum;
  for (let s = 0; s < n * n; s++) {
    if (!m[s] || label[s]) continue;
    const id = comps.length + 1;
    let area = 0, seeds = 0;
    label[s] = id;
    const st = [s];
    while (st.length) {
      const i = st.pop()!, x = i % n, y = (i / n) | 0;
      area++;
      if (seed[i]) seeds++;
      for (const j of [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, y > 0 ? i - n : -1, y < n - 1 ? i + n : -1]) {
        if (j >= 0 && m[j] && !label[j]) { label[j] = id; st.push(j); }
      }
    }
    if (seeds / area > 0.12) comps.push({ id, area });
    else comps.push({ id, area: 0 });
  }
  const minArea = n * n * 0.012;
  const regions: Region[] = comps.filter((x) => x.area >= minArea).sort((a, b) => b.area - a.area).slice(0, 6).map(({ id, area }) => {
    const hard = new Uint8ClampedArray(n * n);
    let sx = 0, sy = 0;
    for (let i = 0; i < n * n; i++) if (label[i] === id) { hard[i] = 255; sx += i % n; sy += (i / n) | 0; }
    const mx = sx / area, my = sy / area;
    let cxx = 0, cyy = 0, cxy = 0;
    for (let i = 0; i < n * n; i++) if (hard[i]) { const dx = (i % n) - mx, dy = ((i / n) | 0) - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    const bounds = (angle: number) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (let i = 0; i < n * n; i++) if (hard[i]) {
        const dx = (i % n) - mx, dy = ((i / n) | 0) - my, u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
        if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
      }
      return { u0, u1, v0, v1, cos, sin, fill: area / ((u1 - u0 + 1) * (v1 - v0 + 1)) };
    };
    // 主軸角度（折回 ±45°）；只有當它明顯是「歪斜的矩形」時才採用，否則視為水平
    let angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    while (angle > Math.PI / 4) angle -= Math.PI / 2;
    while (angle < -Math.PI / 4) angle += Math.PI / 2;
    let b = bounds(0);
    if (Math.abs(angle) > 0.05) { const rb = bounds(angle); if (rb.fill > 0.86 && rb.fill > b.fill + 0.06) b = rb; else angle = 0; } else angle = 0;
    const uc = (b.u0 + b.u1) / 2, vc = (b.v0 + b.v1) / 2;
    // 取印刷區外圍一圈的顏色
    const grown = boxMax(hard, n, 5);
    let ring = 0, on = 0, sr = 0, sg = 0, sb = 0, inside = 0;
    for (let i = 0; i < n * n; i++) if (grown[i] && !hard[i]) {
      ring++;
      if (!bg[i]) inside++;
      if (!bg[i] && !light[i]) { on++; sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; }
    }
    const fill = ring > 0 && on / ring > 0.6 ? `rgb(${Math.round(sr / on)},${Math.round(sg / on)},${Math.round(sb / on)})` : "#ffffff";
    return { mask: boxBlur(boxBlur(hard, n, 2), n, 2), area, cx: mx + uc * b.cos - vc * b.sin, cy: my + uc * b.sin + vc * b.cos, w: b.u1 - b.u0 + 1, h: b.v1 - b.v0 + 1, angle, fill, enclosed: ring > 0 && inside / ring > 0.6 };
  });

  // 陰影：佔位圖的淡藍斜紋在「藍色通道」幾乎和白底一樣亮，所以藍色通道就是去掉斜紋後的布料明暗，
  // 縫線、皺褶、陰影都還在。藍字的部分用周圍的亮度補上。
  const textNear = boxMax(isText.map((v) => (v ? 255 : 0)) as unknown as Uint8Array, n, 3);
  // 以周圍「非文字」像素的平均亮度補上文字的位置，才不會留下字的殘影
  const rr = Math.round(n * 0.03);
  const num = boxBlur(blue.map((v, i) => (textNear[i] ? 0 : v)), n, rr);
  const den = boxBlur(textNear.map((v) => (v ? 0 : 255)), n, rr);
  const src = new Uint8ClampedArray(n * n);
  for (let i = 0; i < n * n; i++) src[i] = textNear[i] ? (den[i] > 6 ? (num[i] * 255) / den[i] : 245) : blue[i];
  const shade = boxBlur(src, n, 1);
  return { n, regions, shade };
}

export type Placement = { regions: number[]; pos: number };

const HIDDEN = /[後后背底內内]/;
const FRONT = /^(前片|前面|正面|A面|上衣前片)$/;

/**
 * 決定哪個印刷面貼到照片上的哪些區塊。商品照通常只拍正面：
 * 背面、袖子等不在照片上的印刷面不貼；正面設計會跨越所有區塊連續貼上（例如被拉鍊分成兩半的外套）。
 */
export function planMockup(names: string[], regions: Region[]): Placement[] {
  if (!regions.length || !names.length) return [];
  const all = regions.map((_, i) => i);
  const idx = (re: RegExp) => names.findIndex((n) => re.test(n.trim()));
  // 左右前片：以穿著者的左右為準，所以「左前片」在照片的右邊
  const lf = idx(/^左前片$/), rf = idx(/^右前片$/);
  if (lf >= 0 && rf >= 0 && regions.length >= 2) {
    const [a, b] = [0, 1].sort((x, y) => regions[x].cx - regions[y].cx);
    return [{ regions: [a], pos: rf }, { regions: [b], pos: lf }];
  }
  // 上衣 + 褲子這類兩件式：最大的兩塊各自對應一個正面
  const fronts = names.map((n, i) => (FRONT.test(n.trim()) ? i : -1)).filter((i) => i >= 0);
  if (fronts.length >= 2 && regions.length >= 2) {
    return [{ regions: [0], pos: fronts[0] }, { regions: all.slice(1), pos: fronts[1] }];
  }
  const main = fronts[0] ?? names.findIndex((n) => !HIDDEN.test(n));
  return main >= 0 ? [{ regions: all, pos: main }] : [];
}

/**
 * 把設計貼到商品照上。每個 placement 的設計會以「填滿」方式鋪在它涵蓋的區塊上；
 * 沒有設計的區塊顯示為空白布料（不保留佔位圖）。
 */
export function renderMockup(out: HTMLCanvasElement, base: CanvasImageSource, model: MockupModel, plan: Placement[], designs: (CanvasImageSource | null)[], size = 800) {
  const { n } = model;
  out.width = out.height = size;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);
  const layer = document.createElement("canvas");
  layer.width = layer.height = n;
  const lctx = layer.getContext("2d", { willReadFrequently: true })!;
  const big = document.createElement("canvas");
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  const used = new Set(plan.flatMap((p) => p.regions));
  const groups: { regions: number[]; design: CanvasImageSource | null }[] = [
    ...plan.map((p) => ({ regions: p.regions, design: designs[p.pos] ?? null })),
    ...model.regions.map((_, i) => i).filter((i) => !used.has(i)).map((i) => ({ regions: [i], design: null })),
  ];
  for (const g of groups) {
    const rs = g.regions.map((i) => model.regions[i]).filter(Boolean);
    if (!rs.length) continue;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, n, n);
    lctx.fillStyle = rs[0].fill;
    lctx.fillRect(0, 0, n, n);
    if (g.design) {
      // 多個區塊時以它們的聯集外框為準，設計才會連續
      let cx = rs[0].cx, cy = rs[0].cy, w = rs[0].w, h = rs[0].h, angle = rs[0].angle;
      if (rs.length > 1) {
        let x0 = n, y0 = n, x1 = 0, y1 = 0;
        for (const r of rs) for (let j = 0; j < n * n; j++) if (r.mask[j] > 127) {
          const x = j % n, y = (j / n) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; w = x1 - x0 + 1; h = y1 - y0 + 1; angle = 0;
      }
      const dw = (g.design as HTMLImageElement).naturalWidth || (g.design as HTMLCanvasElement).width;
      const dh = (g.design as HTMLImageElement).naturalHeight || (g.design as HTMLCanvasElement).height;
      // 比例接近時直接對齊外框，排版區的左上角就是商品上的左上角，位置才對得上；
      // 比例差太多（例如繞一圈的印刷面只拍到正面）才改用置中填滿，避免嚴重變形
      const ratio = (w / h) / (dw / dh);
      lctx.translate(cx, cy);
      lctx.rotate(angle);
      if (ratio > 0.62 && ratio < 1.6) lctx.drawImage(g.design, -w / 2, -h / 2, w, h);
      else {
        const k = Math.max(w / dw, h / dh);
        lctx.drawImage(g.design, (-dw * k) / 2, (-dh * k) / 2, dw * k, dh * k);
      }
    }
    const px = lctx.getImageData(0, 0, n, n);
    const p = px.data;
    for (let j = 0; j < n * n; j++) {
      const sh = Math.min(1, model.shade[j] / 250);
      p[j * 4] *= sh; p[j * 4 + 1] *= sh; p[j * 4 + 2] *= sh;
      let a = 0;
      for (const r of rs) if (r.mask[j] > a) a = r.mask[j];
      p[j * 4 + 3] = a;
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.putImageData(px, 0, 0);
    // 放大到輸出尺寸後再把半透明邊緣收斂成平滑的輪廓，避免鋸齒與毛邊
    big.width = big.height = size;
    bctx.imageSmoothingQuality = "high";
    bctx.clearRect(0, 0, size, size);
    bctx.drawImage(layer, 0, 0, size, size);
    const bp = bctx.getImageData(0, 0, size, size);
    const q = bp.data;
    for (let j = 3; j < q.length; j += 4) {
      const t = Math.min(1, Math.max(0, (q[j] / 255 - 0.4) / 0.2));
      q[j] = 255 * t * t * (3 - 2 * t);
    }
    bctx.putImageData(bp, 0, 0);
    ctx.drawImage(big, 0, 0);
  }
}
