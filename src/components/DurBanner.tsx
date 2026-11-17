import { DUR_TEXT } from '../lib/safety'

/** Antrenman ekranında hep görünen küçük "DUR" uyarısı */
export function DurBanner({ maxHr, betaBlocker }: { maxHr?: number | null; betaBlocker?: boolean }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs leading-snug text-fg"
    >
      <span className="mt-0.5 shrink-0 rounded bg-danger px-1.5 py-0.5 text-[11px] font-black tracking-wider text-white">DUR</span>
      <span>
        {DUR_TEXT}
        {maxHr && !betaBlocker ? ` Nabız limitin: ${maxHr} atım/dk.` : ''}
      </span>
    </div>
  )
}
