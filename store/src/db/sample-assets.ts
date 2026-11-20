/**
 * 示範用的刀模與示意圖（SVG）。正式上線時由後台批量上傳真實檔案取代。
 *
 * 刀模 SVG 慣例：viewBox 以 mm 為單位；裁切線＝洋紅實線、摺線＝青色虛線；不要有填色。
 */
const CUT = `fill="none" stroke="#E6007E" stroke-width="0.8"`;
const FOLD = `fill="none" stroke="#00A0C6" stroke-width="0.6" stroke-dasharray="4 3"`;

const dieline = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">${body}</svg>`;

const scene = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F3EE"/><stop offset="1" stop-color="#E9E3D9"/></linearGradient></defs><rect width="800" height="800" fill="url(#bg)"/>${body}</svg>`;

const SHIRT = "M200 40 Q300 110 400 40 L560 110 L600 240 L500 270 L480 220 L480 680 L120 680 L120 220 L100 270 L0 240 L40 110 Z";

export type SampleAsset = { dieline: string; mockup?: string; rect?: [number, number, number, number] };

export const sampleAssets: Record<string, SampleAsset> = {
  tote: {
    dieline: dieline(380, 420, `<rect x="0.4" y="0.4" width="379.2" height="419.2" ${CUT}/><rect x="10" y="10" width="360" height="400" ${FOLD}/><line x1="0" y1="30" x2="380" y2="30" ${FOLD}/>`),
    mockup: scene(`<ellipse cx="400" cy="700" rx="230" ry="18" fill="#000" opacity=".08"/><path d="M300 255 C300 90 500 90 500 255" fill="none" stroke="#D9CDB8" stroke-width="22"/><rect x="210" y="250" width="380" height="420" rx="4" fill="#EFE7D8"/><rect x="210" y="250" width="380" height="30" fill="#E4DAC7"/><rect x="210" y="250" width="380" height="420" rx="4" fill="none" stroke="#CFC3AC" stroke-width="2"/>`),
    rect: [0.2625, 0.3125, 0.475, 0.525],
  },
  mug: {
    dieline: dieline(90, 95, `<rect x="0.4" y="0.4" width="89.2" height="94.2" rx="3" ${CUT}/><line x1="45" y1="0" x2="45" y2="95" ${FOLD}/>`),
    mockup: scene(`<ellipse cx="400" cy="560" rx="190" ry="16" fill="#000" opacity=".08"/><path d="M550 290 h40 a70 80 0 0 1 0 190 h-40" fill="none" stroke="#FFFFFF" stroke-width="30"/><rect x="250" y="230" width="300" height="317" rx="14" fill="#FFFFFF"/><rect x="250" y="230" width="300" height="317" rx="14" fill="none" stroke="#D8D4CC" stroke-width="2"/><ellipse cx="400" cy="232" rx="150" ry="14" fill="#ECE8E1"/>`),
    rect: [0.3125, 0.2875, 0.375, 0.39625],
  },
  box: {
    dieline: dieline(460, 340, `<path d="M130 50 H330 V100 H380 V240 H330 V290 H130 V240 H80 V100 H130 Z" ${CUT}/><rect x="130" y="100" width="200" height="140" ${FOLD}/><path d="M130 50 l-14 12 v26 l14 12 M330 50 l14 12 v26 l-14 12 M130 290 l-14 -12 v-26 l14 -12 M330 290 l14 -12 v-26 l-14 -12" ${CUT}/>`),
    mockup: scene(`<ellipse cx="400" cy="610" rx="250" ry="20" fill="#000" opacity=".08"/><path d="M180 360 L400 300 L620 360 L400 430 Z" fill="#C9A77A"/><path d="M180 360 L400 430 V610 L180 530 Z" fill="#B58F60"/><path d="M620 360 L400 430 V610 L620 530 Z" fill="#A47E50"/>`),
  },
  notebook: {
    dieline: dieline(148, 210, `<rect x="0.4" y="0.4" width="147.2" height="209.2" rx="4" ${CUT}/><line x1="8" y1="0" x2="8" y2="210" ${FOLD}/>`),
    mockup: scene(`<ellipse cx="400" cy="625" rx="180" ry="14" fill="#000" opacity=".08"/><rect x="262" y="198" width="296" height="420" rx="8" fill="#F3EFE8"/><rect x="252" y="190" width="296" height="420" rx="8" fill="#2F4A3F"/><rect x="252" y="190" width="16" height="420" fill="#27402F"/><rect x="505" y="190" width="10" height="420" fill="#C9A45C"/>`),
    rect: [0.315, 0.2375, 0.37, 0.525],
  },
  bottle: {
    dieline: dieline(70, 180, `<rect x="0.4" y="0.4" width="69.2" height="179.2" rx="6" ${CUT}/><line x1="35" y1="0" x2="35" y2="180" ${FOLD}/>`),
    mockup: scene(`<ellipse cx="400" cy="585" rx="110" ry="12" fill="#000" opacity=".08"/><rect x="352" y="150" width="96" height="60" rx="10" fill="#B9BDC1"/><rect x="340" y="200" width="120" height="24" rx="6" fill="#A7ACB1"/><rect x="330" y="220" width="140" height="360" rx="18" fill="#DCDFE2"/><rect x="345" y="235" width="18" height="330" rx="9" fill="#fff" opacity=".5"/>`),
    rect: [0.4125, 0.275, 0.175, 0.45],
  },
  tshirt: {
    dieline: dieline(600, 700, `<path d="${SHIRT}" ${CUT}/><line x1="300" y1="75" x2="300" y2="680" ${FOLD}/>`),
    mockup: scene(`<g transform="translate(100 50)"><path d="${SHIRT}" fill="#FFFFFF" stroke="#D8D4CC" stroke-width="2"/><path d="M200 40 Q300 110 400 40" fill="none" stroke="#D8D4CC" stroke-width="8"/></g>`),
    rect: [0.125, 0.0625, 0.75, 0.875],
  },
};
