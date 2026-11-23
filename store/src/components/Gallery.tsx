"use client";
import { useEffect, useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
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
        {(override ?? images[i]) && <img src={override ?? images[i]} alt={alt} className="h-full w-full object-cover" data-testid="main-image" />}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={src} type="button" onClick={() => { setI(n); setOverride(null); }} aria-label={`${alt} ${n + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${n === i ? "border-forest" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt}｜圖片 ${n + 1}`} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
