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
  for (let i = 0; i < n * n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;
    const text = b >= 140 && r <= 110 && b - r >= 70;
    const pale = b - r >= 12 && b >= g && Math.min(r, g) >= 130 && b >= 190;
    if (text || pale) seed[i] = 255;
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
    const sm = boxBlur(tmp, n, 3);
    for (let i = 0; i < n * n; i++) m[i] = sm[i] >= 128 && !bg[i] ? 1 : 0;
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
    let ring = 0, on = 0, sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < n * n; i++) if (grown[i] && !hard[i]) {
      ring++;
      if (!bg[i] && !light[i]) { on++; sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; }
    }
    const fill = ring > 0 && on / ring > 0.6 ? `rgb(${Math.round(sr / on)},${Math.round(sg / on)},${Math.round(sb / on)})` : "#ffffff";
    return { mask: boxBlur(hard, n, 1), area, cx: mx + uc * b.cos - vc * b.sin, cy: my + uc * b.sin + vc * b.cos, w: b.u1 - b.u0 + 1, h: b.v1 - b.v0 + 1, angle, fill };
  });

  // 陰影：取區域最大亮度（去掉斜紋與文字），再模糊，保留布料的明暗
  const shade = boxBlur(boxMax(lum, n, Math.round(n * 0.035)), n, Math.round(n * 0.012));
  return { n, regions, shade };
}

/**
 * 把設計貼到商品照上。designs[i] 對應 regions[i]（由大到小）；沒有設計的區域維持原照片。
 */
export function renderMockup(out: HTMLCanvasElement, base: CanvasImageSource, model: MockupModel, designs: (CanvasImageSource | null)[], size = 800) {
  const { n } = model;
  out.width = out.height = size;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);
  const layer = document.createElement("canvas");
  layer.width = layer.height = n;
  const lctx = layer.getContext("2d", { willReadFrequently: true })!;
  model.regions.forEach((rg, i) => {
    const design = designs[i];
    if (!design) return;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, n, n);
    lctx.fillStyle = rg.fill;
    lctx.fillRect(0, 0, n, n);
    // 以「填滿」方式放進外接矩形
    const dw = (design as HTMLImageElement).naturalWidth || (design as HTMLCanvasElement).width;
    const dh = (design as HTMLImageElement).naturalHeight || (design as HTMLCanvasElement).height;
    const k = Math.max(rg.w / dw, rg.h / dh);
    lctx.translate(rg.cx, rg.cy);
    lctx.rotate(rg.angle);
    lctx.drawImage(design, (-dw * k) / 2, (-dh * k) / 2, dw * k, dh * k);
    const px = lctx.getImageData(0, 0, n, n);
    const p = px.data;
    for (let j = 0; j < n * n; j++) {
      const s = Math.min(1, model.shade[j] / 248);
      p[j * 4] *= s; p[j * 4 + 1] *= s; p[j * 4 + 2] *= s;
      p[j * 4 + 3] = rg.mask[j];
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.putImageData(px, 0, 0);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(layer, 0, 0, size, size);
  });
}
