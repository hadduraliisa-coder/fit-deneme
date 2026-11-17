import { useEffect, useState } from 'react'

let audioCtx: AudioContext | null = null

/** Kullanıcı etkileşimi sırasında çağrılmalı (iOS ses kilidi için) */
export function primeAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    /* ses desteklenmiyor */
  }
}

function beep() {
  if (!audioCtx) return
  const t0 = audioCtx.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.3)
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + i * 0.3 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.3 + 0.2)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t0 + i * 0.3)
    osc.stop(t0 + i * 0.3 + 0.22)
  }
}

export function notifyRestDone() {
  try {
    navigator.vibrate?.([300, 120, 300, 120, 300])
  } catch {
    /* titreşim yok */
  }
  beep()
}

export interface RestState {
  endsAt: number
  total: number
  label: string
}

export function RestTimer({
  rest,
  onChange,
}: {
  rest: RestState | null
  onChange: (r: RestState | null) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const [doneFlash, setDoneFlash] = useState(false)

  useEffect(() => {
    if (!rest) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [rest])

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (rest && remaining === 0) {
      notifyRestDone()
      setDoneFlash(true)
      onChange(null)
      const t = window.setTimeout(() => setDoneFlash(false), 4000)
      return () => window.clearTimeout(t)
    }
  }, [rest, remaining, onChange])

  if (!rest && !doneFlash) return null

  if (!rest) {
    return (
      <div className="fixed inset-x-0 bottom-[76px] z-40 mx-auto max-w-lg px-3">
        <div className="rounded-2xl bg-accent px-4 py-3 text-center text-lg font-bold text-accent-fg shadow-lg">
          Dinlenme bitti – sıradaki set! (Nefesini tutma)
        </div>
      </div>
    )
  }

  const pct = Math.max(0, Math.min(100, (remaining / rest.total) * 100))
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  return (
    <div className="fixed inset-x-0 bottom-[76px] z-40 mx-auto max-w-lg px-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
        <div className="h-1.5 bg-accent transition-all" style={{ width: `${pct}%` }} />
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1">
            <p className="text-xs text-muted">Dinlenme · {rest.label}</p>
            <p className="text-3xl font-black tabular-nums">
              {mm}:{ss}
            </p>
          </div>
          <button
            className="h-12 rounded-xl bg-card2 px-3 font-semibold"
            onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 15000, total: rest.total + 15 })}
          >
            +15 sn
          </button>
          <button className="h-12 rounded-xl bg-card2 px-3 font-semibold" onClick={() => onChange(null)}>
            Geç
          </button>
        </div>
      </div>
    </div>
  )
}
