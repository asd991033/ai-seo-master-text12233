/** AI 設計的風格清單（前後端共用；prompt 只在伺服器使用，不會送到瀏覽器） */
export type AiStyle = { id: string; zh: string; en: string; prompt: string };

export const AI_STYLES: AiStyle[] = [
  { id: "cartoon", zh: "卡通", en: "Cartoon", prompt: "a clean modern cartoon illustration with bold outlines, flat bright colours and simple cel shading" },
  { id: "anime", zh: "動漫", en: "Anime", prompt: "a Japanese anime illustration with crisp line art, soft cel shading and expressive eyes" },
  { id: "watercolor", zh: "水彩", en: "Watercolour", prompt: "a soft hand-painted watercolour painting with visible brush texture and gentle colour bleeds" },
  { id: "lineart", zh: "線稿", en: "Line art", prompt: "a minimalist black ink line drawing on a white background, single-weight clean lines, no shading" },
  { id: "pixel", zh: "像素", en: "Pixel art", prompt: "retro 16-bit pixel art with a limited colour palette and clearly visible square pixels" },
  { id: "oil", zh: "油畫", en: "Oil painting", prompt: "a classical oil painting with rich colours and visible textured brush strokes" },
  { id: "pop", zh: "普普風", en: "Pop art", prompt: "bold pop art with halftone dots, thick outlines and high-contrast saturated colours" },
  { id: "sticker", zh: "貼紙", en: "Sticker", prompt: "a cute die-cut sticker illustration with a thick white border, simple shapes and soft shading" },
];

export const AI_PROMPT_MAX = 300;
