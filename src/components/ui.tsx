import { useEffect, type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {right}
    </div>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-accent text-accent-fg',
    secondary: 'bg-card2 text-fg border border-line',
    danger: 'bg-danger text-white',
    ghost: 'bg-transparent text-accent',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-4 py-3 text-base font-semibold active:scale-[0.98] disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/** Büyük +/− butonlu sayı girişi (tek elle kullanım için) */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit,
  label,
  decimals = 1,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  label?: string
  decimals?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(decimals))))
  return (
    <div className="flex flex-col items-stretch">
      {label && <span className="mb-1 text-center text-xs text-muted">{label}</span>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`${label ?? ''} azalt`}
          className="h-14 w-14 shrink-0 rounded-xl bg-card2 text-3xl font-bold text-fg active:scale-95"
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="number"
            inputMode="decimal"
            className="h-14 w-full rounded-xl border border-line bg-bg text-center text-2xl font-bold text-fg"
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(',', '.'))
              onChange(Number.isFinite(v) ? clamp(v) : 0)
            }}
            onFocus={(e) => e.target.select()}
          />
          {unit && <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-muted">{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`${label ?? ''} artır`}
          className="h-14 w-14 shrink-0 rounded-xl bg-card2 text-3xl font-bold text-fg active:scale-95"
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pb-safe max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="h-10 w-10 rounded-full bg-card2 text-xl" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  tone = 'default',
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  const base = 'min-h-11 rounded-full px-4 text-sm font-semibold border whitespace-nowrap'
  const cls = active
    ? tone === 'danger'
      ? 'bg-danger text-white border-danger'
      : 'bg-accent text-accent-fg border-accent'
    : tone === 'danger'
      ? 'bg-card2 text-danger border-line'
      : 'bg-card2 text-fg border-line'
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-card2 border border-line'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  )
}

export function Badge({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'warn' | 'danger' | 'muted' }) {
  const t = {
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
    muted: 'bg-card2 text-muted',
  }[tone]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${t}`}>{children}</span>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="pt-safe px-1 pb-2 pt-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </header>
  )
}
