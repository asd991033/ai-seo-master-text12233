"use client";
import { useEffect, useState } from "react";
import { useT } from "@/market/client";

/** firstAlt：第一張是成品情境圖時的替代文字（其餘圖片用「品名｜圖片 N」） */
export function Gallery({ images, alt, firstAlt }: { images: string[]; alt: string; firstAlt?: string }) {
  const t = useT();
  const [i, setI] = useState(0);
  const altOf = (n: number) => (n === 0 && firstAlt ? firstAlt : t.meta.imageN(alt, n + 1));
  // 選顏色時顯示該顏色的照片
  const [override, setOverride] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setOverride((e as CustomEvent<string>).detail);
    window.addEventListener("product-image", on);
    return () => window.removeEventListener("product-image", on);
  }, []);
  return (
    <div>
      <div className="card aspect-square overflow-hidden bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {(override ?? images[i]) && <img src={override ?? images[i]} alt={override ? alt : altOf(i)} className="h-full w-full object-cover" data-testid="main-image" />}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={src} type="button" onClick={() => { setI(n); setOverride(null); }} aria-label={`${alt} ${n + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${n === i ? "border-forest" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={altOf(n)} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
