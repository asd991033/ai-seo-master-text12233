/** 星等顯示（value 可帶小數，例如平均 4.6） */
export function Stars({ value, label, className = "" }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span role="img" aria-label={label} className={`relative inline-block whitespace-nowrap leading-none tracking-[2px] text-line ${className}`}>
      ★★★★★
      <span aria-hidden className="absolute inset-y-0 left-0 overflow-hidden text-gold" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
