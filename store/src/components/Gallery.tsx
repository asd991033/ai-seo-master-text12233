"use client";
import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="card aspect-square overflow-hidden bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {images[i] && <img src={images[i]} alt={alt} className="h-full w-full object-cover" />}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((src, n) => (
            <button key={src} type="button" onClick={() => setI(n)} aria-label={`${alt} ${n + 1}`} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${n === i ? "border-forest" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
