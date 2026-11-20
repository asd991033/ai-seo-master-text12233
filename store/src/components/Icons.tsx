/** 線條圖示（統一 1.5 線寬） */
const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
type P = { className?: string };
export const IconSearch = (p: P) => <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconUser = (p: P) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
export const IconBag = (p: P) => <svg {...base} {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
export const IconMenu = (p: P) => <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const IconClose = (p: P) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconLayers = (p: P) => <svg {...base} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>;
export const IconTag = (p: P) => <svg {...base} {...p}><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>;
export const IconBrush = (p: P) => <svg {...base} {...p}><path d="M14 4l6 6-9 9H5v-6l9-9Z" /><path d="m12 6 6 6" /></svg>;
export const IconTruck = (p: P) => <svg {...base} {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>;
export const IconCheck = (p: P) => <svg {...base} {...p}><path d="m5 12 5 5 9-10" /></svg>;
export const IconArrow = (p: P) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
