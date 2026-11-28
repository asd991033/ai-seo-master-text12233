"use client";
import { useEffect, useRef, useState } from "react";
import { useMarket, useT } from "@/market/client";

type Info = { enabled: boolean; limit?: number; remaining?: number; member?: boolean; styles?: { id: string; zh: string; en: string }[] };

/** 設計器的「AI 設計」視窗：照片換風格、文字生圖。生成的圖由 onUse 放進畫布 */
export function AiDesign({ open, onClose, onUse, selectedUrl }: { open: boolean; onClose: () => void; onUse: (url: string) => void | Promise<void>; selectedUrl: string | null }) {
  const t = useT(), a = t.designer.ai, en = useMarket().locale === "en";
  const [info, setInfo] = useState<Info | null>(null);
  const [mode, setMode] = useState<"style" | "text">("style");
  const [style, setStyle] = useState("cartoon");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [useSelected, setUseSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai-image").then((r) => r.json()).then(setInfo).catch(() => setInfo({ enabled: false }));
    setUseSelected(!!selectedUrl);
    setError(null);
  }, [open, selectedUrl]);
  useEffect(() => {
    if (!file) return setFilePreview(null);
    const u = URL.createObjectURL(file);
    setFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;
  const source = mode === "style" ? (file ? filePreview : useSelected ? selectedUrl : null) : null;
  const remaining = info?.remaining ?? 0;
  const canGo = !busy && remaining > 0 && (mode === "style" ? !!source && (!!style || prompt.trim().length >= 2) : prompt.trim().length >= 2);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("mode", mode);
      fd.set("style", style);
      fd.set("prompt", prompt);
      if (mode === "style") { if (file) fd.set("file", file); else if (selectedUrl) fd.set("imageUrl", selectedUrl); }
      const res = await fetch("/api/ai-image", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string; remaining?: number; limit?: number } | null;
      if (!res.ok || !json?.url) throw new Error(json?.error || a.failed);
      setResult(json.url);
      setInfo((i) => (i ? { ...i, remaining: json.remaining ?? i.remaining } : i));
    } catch (e) {
      setError((e as Error).message);
      fetch("/api/ai-image").then((r) => r.json()).then(setInfo).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={a.title} data-testid="ai-dialog" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">✦ {a.title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={a.close} className="rounded-lg px-2 py-1 text-xl leading-none text-mute hover:text-ink">×</button>
        </div>
        {info && !info.enabled ? <p className="mt-4 text-sm text-mute">{a.off}</p> : (
          <>
            <div className="mt-4 flex gap-2" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "style"} className={chip(mode === "style")} onClick={() => setMode("style")}>{a.tabStyle}</button>
              <button type="button" role="tab" aria-selected={mode === "text"} className={chip(mode === "text")} onClick={() => setMode("text")}>{a.tabText}</button>
            </div>

            {mode === "style" ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-mute">{a.styleLead}</p>
                <div className="flex items-center gap-3">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-sand text-[11px] text-mute">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {source ? <img src={source} alt="" className="h-full w-full object-cover" /> : a.noPhoto}
                  </div>
                  <div className="space-y-2">
                    <button type="button" className="btn-ghost py-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>{a.pickPhoto}</button>
                    <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="sr-only" data-testid="ai-file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUseSelected(false); }} />
                    {selectedUrl && !file && <label className="flex items-center gap-2 text-xs text-mute"><input type="checkbox" checked={useSelected} onChange={(e) => setUseSelected(e.target.checked)} />{a.useSelected}</label>}
                  </div>
                </div>
                <label className="block">
                  <span className="text-mute">{a.editLead}</span>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300} rows={2} placeholder={a.editPh} className="input mt-2" data-testid="ai-edit" />
                </label>
              </div>
            ) : (
              <label className="mt-4 block text-sm">
                <span className="text-mute">{a.textLead}</span>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300} rows={3} placeholder={a.textPh} className="input mt-2" data-testid="ai-prompt" />
              </label>
            )}

            <div className="mt-4">
              <div className="mb-2 text-xs text-mute">{a.style}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={style === ""} className={chip(style === "")} onClick={() => setStyle("")}>{mode === "style" ? a.styleKeep : a.styleAny}</button>
                {(info?.styles ?? []).map((s) => <button key={s.id} type="button" aria-pressed={style === s.id} className={chip(style === s.id)} onClick={() => setStyle(s.id)}>{en ? s.en : s.zh}</button>)}
              </div>
            </div>

            {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
            {busy && <p className="mt-4 rounded-lg bg-sand px-3 py-3 text-sm" role="status">{a.working}</p>}
            {result && !busy && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result} alt={a.resultAlt} className="mx-auto max-h-72 rounded-lg border border-line" data-testid="ai-result" />
                <p className="mt-2 text-xs text-mute">{a.resNote}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {result && !busy && <button type="button" className="btn-primary" data-testid="ai-use" onClick={async () => { await onUse(result); setResult(null); setFile(null); onClose(); }}>{a.use}</button>}
              <button type="button" className={result ? "btn-ghost" : "btn-primary"} disabled={!canGo} onClick={generate} data-testid="ai-generate">{busy ? a.workingShort : result ? a.again : a.generate}</button>
              <span className="ml-auto text-xs text-mute" data-testid="ai-remaining">{info ? a.remaining(remaining, info.limit ?? 0) : ""}</span>
            </div>
            {info && remaining === 0 && <p className="mt-2 text-xs text-mute">{info.member ? a.usedUpMember : a.usedUpGuest}</p>}
            <p className="mt-3 text-[11px] leading-relaxed text-mute">{a.terms}</p>
          </>
        )}
      </div>
    </div>
  );
}
