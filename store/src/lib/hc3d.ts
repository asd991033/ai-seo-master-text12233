// @ts-nocheck
/**
 * 供應商（HiCustom）相容的效果圖渲染。
 * 依他們排版器的設定資料（catalog/hc-design）把各印刷面的設計貼到效果圖上：
 *   type 0 = 平面四角透視貼圖、type 2 = 3D 模型（three.js r117，與供應商同版本，光影才會一致）、type 3 = 純照片
 * 輸出與供應商排版器相同的 600×600 座標系。
 */
export type HcPart = { type: number; view?: number; quad?: { x: number; y: number }[]; distort?: Record<string, string>; mask?: string; cover?: string; d3?: any };
export type HcDetail = { image: string; texture: string; effect: string; master: number; parts: HcPart[] };
export type HcView = { id: number; name: string; pa: { x: number; y: number; w: number; h: number; vw: number; svg: string; pxW: number; pxH: number }; mask: string };
export type HcColor = { id: number; name: string; hex: string; views: { id: number; image: string; texture: string }[]; details: HcDetail[] };
export type HcDesign = { base: string; baseWidth: number; views: HcView[]; colors: HcColor[] };

let BASE = "";
export const setBase = (b: string) => { BASE = b; };
export const abs = (u: string) => (!u ? "" : /^https?:/.test(u) ? u : BASE + u);

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export const loadImg = (u: string) => {
  if (!imgCache.has(u)) imgCache.set(u, new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => { imgCache.delete(u); rej(new Error("img " + u)); }; i.src = u; }));
  return imgCache.get(u)!;
};
const num = (v: any, d = 0) => (v === undefined || v === null || v === "" || isNaN(+v) ? d : +v);

let T: any = null, renderer: any = null;
const glbCache = new Map(), jsonCache = new Map(), texCache = new Map();
async function three() {
  if (T) return T;
  const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import("three/build/three.module.js"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
  ]);
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  T = { THREE, loader: () => new GLTFLoader().setDRACOLoader(draco) };
  return T;
}
const loadGLB = (u: string) => { if (!glbCache.has(u)) glbCache.set(u, new Promise((res, rej) => T.loader().load(u, res, undefined, (e) => { glbCache.delete(u); rej(e); }))); return glbCache.get(u); };
const loadJSON = (u: string) => { if (!jsonCache.has(u)) jsonCache.set(u, fetch(u).then((r) => r.json())); return jsonCache.get(u); };
const loadTex = (u: string) => { if (!texCache.has(u)) texCache.set(u, new Promise((res, rej) => new T.THREE.TextureLoader().setCrossOrigin("anonymous").load(u, res, undefined, rej))); return texCache.get(u); };

/** 模型附的材質設定（法線貼圖、重複次數、金屬度、粗糙度） */
function matsInfo(json: any, files: { n: string; u: string }[]) {
  const scaleOf = (name: string) => { const s = name.split("_").find((t) => t.startsWith("scale")); return s ? s.slice(5).split("&").map(Number) : null; };
  const uri = (i: number) => { const im = json.images?.[i]; const f = im && files.find((x) => x.n === im.name); return f ? abs(f.u) : null; };
  const out: Record<string, any> = {};
  for (const m of json.materials || []) {
    const p: any = (out[m.name] = {}), pbr = m.pbrMetallicRoughness || {};
    if (m.name.includes("base")) { const s = scaleOf(m.name); if (s) p.repeat = s; }
    if (pbr.baseColorTexture) { p.map = uri(pbr.baseColorTexture.index); const s = pbr.baseColorTexture.extensions?.KHR_texture_transform?.scale; if (s) p.repeat = s; }
    if (m.normalTexture) { p.normalMap = uri(m.normalTexture.index); p.normalScale = m.normalTexture.scale; const s = scaleOf(m.name); if (s) p.normalRepeat = s; }
    if (pbr.metallicRoughnessTexture) p.metalMap = uri(pbr.metallicRoughnessTexture.index);
    p.metalness = pbr.metallicFactor; p.roughness = pbr.roughnessFactor;
  }
  return out;
}
/** 只對指定貼圖做 UV 縮放（布料紋理要重複很多次，設計貼圖不重複） */
function patchShader(THREE: any, mat: any, rep: Record<string, number[]>) {
  const mats: Record<string, any> = {};
  for (const k of Object.keys(rep)) mats[k] = new THREE.Matrix3().set(rep[k][0], 0, 0, 0, rep[k][1], 0, 0, 0, 1);
  mat.onBeforeCompile = (sh: any) => {
    let head = "";
    for (const k of Object.keys(mats)) { sh.uniforms[`u_${k}T`] = { value: mats[k] }; head += `uniform mat3 u_${k}T;\n`; }
    const expand = (s: string): string => s.replace(/#include <(.*)>/gm, (_, n) => expand(THREE.ShaderChunk[n]));
    sh.fragmentShader = head + expand(sh.fragmentShader).replace(/texture2D\( (normalMap|map), vUv \)/g, (all, k) => (mats[k] ? `texture2D( ${k}, ( u_${k}T * vec3( vUv, 1. ) ).xy )` : all));
  };
}
/** 依 uv 設定把各印刷面的畫布拼成一張材質貼圖 */
async function faceCanvas(uv: any, baseWidth: number, faces: Record<number, CanvasImageSource>, allowAlpha: any, texSize: number) {
  const list = uv.faces.filter((f) => faces[f.v] && f.p.visible !== false);
  const f0 = list.reduce((a, x) => Math.max(a, 1 / (x.p.scaleX || 1)), 1);
  const f = (f0 * texSize) / baseWidth; // 以較小的貼圖尺寸繪製，比例不變
  const size = Math.round(baseWidth * f);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const b = uv.base || {};
  ctx.fillStyle = b.t === 1 && b.c ? `rgb(${b.c.join(",")})` : allowAlpha != 1 ? "#fff" : "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, size, size);
  if (b.t === 2 && b.u) { try { ctx.drawImage(await loadImg(abs(b.u)), 0, 0, size, size); } catch {} }
  for (const x of list) {
    const p = x.p, sx = p.scaleX || 1, w = x.w * sx * f, h = x.h * sx * f, fx = p.flipX ? -1 : 1, fy = p.flipY ? -1 : 1;
    ctx.save();
    ctx.scale(fx, fy);
    ctx.rotate((((p.angle || 0) * Math.PI) / 180) * fx * fy);
    if (p.centerX !== undefined && p.centerX !== null && p.centerY !== undefined && p.centerY !== null) { ctx.translate(Math.round(p.centerX * f), Math.round(p.centerY * f)); ctx.translate(-w / 2, -h / 2); }
    ctx.drawImage(faces[x.v], 0, 0, w, h);
    ctx.restore();
  }
  return c;
}

async function render3D(part: HcPart, baseWidth: number, faces: Record<number, CanvasImageSource>, scale: number, texSize: number) {
  const { THREE } = await three();
  const d = part.d3, rp = d.rp || {}, files = d.files || [];
  const W = Math.max(2, Math.round(d.w * scale)), H = Math.max(2, Math.round(d.h * scale));
  if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); renderer.outputEncoding = THREE.sRGBEncoding; }
  renderer.setSize(W, H, false);
  renderer.physicallyCorrectLights = !!rp.newLightModel;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 1e4);
  scene.add(cam);
  cam.add(new THREE.AmbientLight(undefined, num(rp.ambientLightIntensity)));
  const mp = rp.mainPointPosition || {};
  const main = rp.newLightModel ? new THREE.DirectionalLight(undefined, num(rp.mainPointIntensity)) : new THREE.PointLight(undefined, num(rp.mainPointIntensity));
  main.position.set(num(mp.x, 32), num(mp.y, 23), num(mp.z, -4));
  scene.add(main);
  if (!rp.newLightModel) for (const [x, y, z] of [[0, 200, 0], [0, -200, 0], [200, 0, 0], [-200, 0, 0], [0, 0, 200], [0, 0, -200]]) { const l = new THREE.PointLight(undefined, num(rp.aroundPointIntensity)); l.position.set(x, y, z); scene.add(l); }
  for (const L of rp.lights || []) { const l = new THREE.PointLight(L.color, L.closed ? 0 : num(L.intensity), num(L.distance), num(L.decay)); l.position.set(num(L.position?.x), num(L.position?.y), num(L.position?.z)); scene.add(l); }
  const pos = d.pos || {};
  cam.position.set(num(pos.x), num(pos.y), num(pos.z));
  cam.lookAt(0, 0, 0);
  if (rp.zoom) { cam.zoom = num(rp.zoom, 1); cam.updateProjectionMatrix(); }
  const glb = files.find((f) => f.u.endsWith("glb") && (rp.useSourceModel ? f.n.includes("source") : !f.n.includes("source"))) || files.find((f) => f.u.endsWith("glb"));
  const jf = files.find((f) => f.u.endsWith("json"));
  if (!glb) throw new Error("no model");
  const [gltf, json] = await Promise.all([loadGLB(abs(glb.u)), jf ? loadJSON(abs(jf.u)) : Promise.resolve({})]);
  const info = matsInfo(json, files);
  const obj = gltf.scene.clone(true);
  const maps: Record<string, HTMLCanvasElement> = {};
  for (const uv of d.uv || []) maps[uv.name] = await faceCanvas(uv, baseWidth, faces, rp.allowAlpha, texSize);
  const jobs: Promise<unknown>[] = [], made: any[] = [];
  obj.traverse((m: any) => {
    if (!m.isMesh) return;
    const mat = (m.material = m.material.clone()), name = mat.name, inf = info[name] || {};
    made.push(mat);
    const nr = inf.normalRepeat || [1, 1];
    patchShader(THREE, mat, { map: inf.repeat || [1, 1], normalMap: [nr[0], -nr[1]] });
    const setMap = (t: any) => { t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = ["custom", "base"].some((k) => name.includes(k)); t.needsUpdate = true; mat.map = t; mat.needsUpdate = true; made.push(t); };
    if (inf.map) jobs.push(loadTex(inf.map).then((t: any) => setMap(t.clone())).catch(() => {}));
    if (maps[name]) setMap(new THREE.CanvasTexture(maps[name]));
    if (inf.normalMap) jobs.push(loadTex(inf.normalMap).then((t: any) => { t = t.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; if (inf.normalScale !== undefined && inf.normalScale !== null) mat.normalScale.set(inf.normalScale, -inf.normalScale); mat.normalMap = t; mat.needsUpdate = true; made.push(t); }).catch(() => {}));
    if (inf.metalMap) jobs.push(loadTex(inf.metalMap).then((t: any) => { t = t.clone(); t.flipY = false; t.needsUpdate = true; mat.metalnessMap = t; mat.roughnessMap = t; mat.needsUpdate = true; made.push(t); }).catch(() => {}));
    if (inf.metalness !== undefined && inf.metalness !== null) mat.metalness = inf.metalness;
    if (inf.roughness !== undefined && inf.roughness !== null) mat.roughness = inf.roughness;
  });
  await Promise.all(jobs);
  scene.add(obj);
  const r = rp.rotation;
  if (r) obj.setRotationFromEuler(new THREE.Euler(num(r.x), num(r.y), num(r.z)));
  renderer.render(scene, cam);
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  out.getContext("2d")!.drawImage(renderer.domElement, 0, 0);
  for (const x of made) x.dispose?.();
  return out;
}

/**
 * 畫一張效果圖：底圖 → 各 part 的設計 → 紋理覆蓋。
 * faces[viewId] = 該印刷面的整張畫布（正方形，對應供應商的 view 座標），沒有設計的面不要放。
 */
export async function renderDetail(det: HcDetail, hc: HcDesign, faces: Record<number, CanvasImageSource>, size = 600, texSize = 1024): Promise<HTMLCanvasElement> {
  setBase(hc.base);
  const k = size / 600, bw = hc.baseWidth;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  if (det.image) { try { ctx.drawImage(await loadImg(abs(det.image)), 0, 0, size, size); } catch {} }
  for (const p of det.parts) {
    if (p.type === 0 && p.view && faces[p.view]) {
      const v = hc.views.find((x) => x.id === p.view);
      if (!v) continue;
      const pa = v.pa, src = faces[p.view] as HTMLCanvasElement, s = (src.width || bw) / pa.vw;
      const crop = document.createElement("canvas");
      crop.width = Math.max(1, Math.round(pa.w * s)); crop.height = Math.max(1, Math.round(pa.h * s));
      crop.getContext("2d")!.drawImage(src, -pa.x * s, -pa.y * s);
      const x0 = Math.trunc((pa.x / pa.vw) * 600), y0 = Math.trunc((pa.y / pa.vw) * 600) || 0.5, w = (pa.w / pa.vw) * 600, h = (pa.h / pa.vw) * 600;
      const quad = p.quad && p.quad.length === 4 ? p.quad : [{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h }];
      const layer = document.createElement("canvas");
      layer.width = layer.height = size;
      const lx = layer.getContext("2d")!;
      warpQuad(lx, crop, quad.map((q) => ({ x: q.x * k, y: q.y * k })));
      if (p.mask) { try { lx.globalCompositeOperation = "destination-in"; lx.drawImage(await loadImg(abs(p.mask)), 0, 0, size, size); } catch {} }
      ctx.drawImage(layer, 0, 0);
    } else if (p.type === 2 && p.d3) {
      const d = p.d3, img = await render3D(p, bw, faces, 2 * k, texSize);
      let cx = 300, cy = 300;
      if (p.distort) {
        const pts = ["p1", "p2", "p3", "p4"].map((q) => String(p.distort![q] || "0,0").split(",").map((v) => +v / (bw / 1200)));
        cx = (Math.min(...pts.map((q) => q[0])) + Math.max(...pts.map((q) => q[0]))) / 2;
        cy = (Math.min(...pts.map((q) => q[1])) + Math.max(...pts.map((q) => q[1]))) / 2;
      }
      ctx.save();
      ctx.translate(cx * k, cy * k);
      ctx.rotate(((d.angle || 0) * Math.PI) / 180);
      ctx.drawImage(img, (-d.w * k) / 2, (-d.h * k) / 2, d.w * k, d.h * k);
      ctx.restore();
    } else if (p.type === 1 && p.cover) {
      try { ctx.drawImage(await loadImg(abs(p.cover)), 0, 0, size, size); } catch {}
    }
  }
  if (det.texture) { try { ctx.drawImage(await loadImg(abs(det.texture)), 0, 0, size, size); } catch {} }
  return c;
}

/** 這張效果圖會用到哪些印刷面 */
export function detailViews(det: HcDetail): number[] {
  const s = new Set<number>();
  for (const p of det.parts) { if (p.type === 0 && p.view) s.add(p.view); if (p.type === 2 && p.d3) for (const uv of p.d3.uv || []) for (const f of uv.faces) s.add(f.v); }
  return [...s];
}
/** 會隨設計變化的效果圖（排除尺寸表這類純照片） */
export const isDynamic = (det: HcDetail) => det.parts.some((p) => p.type === 0 || p.type === 2);

/**
 * 把某一面的印刷區圖（flat）放進供應商的 view 座標，並套上刀模遮罩。回傳正方形畫布。
 */
export async function faceSquare(hc: HcDesign, view: HcView, flat: CanvasImageSource, size = 1024): Promise<HTMLCanvasElement> {
  setBase(hc.base);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!, s = size / view.pa.vw;
  ctx.drawImage(flat, view.pa.x * s, view.pa.y * s, view.pa.w * s, view.pa.h * s);
  if (view.mask) { try { const m = await loadImg(abs(view.mask)); ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(m, 0, 0, size, size); } catch {} }
  return c;
}

/** 把 src 透視變形貼到四個角（左上、右上、右下、左下）。用細分三角形近似，交界多畫半個像素避免接縫 */
export function warpQuad(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, q: { x: number; y: number }[], N = 24) {
  const Hm = homography([[0, 0], [1, 0], [1, 1], [0, 1]], q.map((p) => [p.x, p.y]));
  const P = (u: number, v: number) => { const w = Hm[6] * u + Hm[7] * v + 1; return [(Hm[0] * u + Hm[1] * v + Hm[2]) / w, (Hm[3] * u + Hm[4] * v + Hm[5]) / w]; };
  const sw = src.width, sh = src.height;
  const tri = (a, b, c, ua, ub, uc) => {
    const [x0, y0] = a, [x1, y1] = b, [x2, y2] = c, [u0, v0] = ua, [u1, v1] = ub, [u2, v2] = uc;
    const den = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
    if (!den) return;
    const A = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / den, B = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / den, C = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / den;
    const D = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / den, E = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / den, F = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / den;
    const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, g = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * 0.6, y + (dy / l) * 0.6]; };
    ctx.save(); ctx.beginPath(); ctx.moveTo(...g(x0, y0)); ctx.lineTo(...g(x1, y1)); ctx.lineTo(...g(x2, y2)); ctx.closePath(); ctx.clip(); ctx.setTransform(A, D, B, E, C, F); ctx.drawImage(src, 0, 0); ctx.restore();
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N, a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1);
    tri(a, b, c, [u0 * sw, v0 * sh], [u1 * sw, v0 * sh], [u1 * sw, v1 * sh]);
    tri(a, c, d, [u0 * sw, v0 * sh], [u1 * sw, v1 * sh], [u0 * sw, v1 * sh]);
  }
}
function homography(s: number[][], d: number[][]) {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) { const [x, y] = s[i], [X, Y] = d[i]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X); A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y); }
  for (let i = 0; i < 8; i++) {
    let m = i;
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < 8; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const h = new Array(8);
  for (let i = 7; i >= 0; i--) { let v = b[i]; for (let c = i + 1; c < 8; c++) v -= A[i][c] * h[c]; h[i] = v / A[i][i]; }
  return h;
}
