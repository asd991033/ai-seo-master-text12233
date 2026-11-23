"use client";
import dynamic from "next/dynamic";
import { useT } from "@/market/client";
import type { DesignerProduct } from "./Designer";

const Designer = dynamic(() => import("./Designer"), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const t = useT();
  return <div className="container-x py-20 text-center text-mute">{t.common.loading}</div>;
}

export function DesignerLoader({ product }: { product: DesignerProduct }) {
  return <Designer product={product} />;
}
