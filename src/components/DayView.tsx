import { useState } from 'react'
import { getExercise } from '../data/exercises'
import { useApp } from '../lib/appContext'
import { regionLabel } from '../lib/program'
import type { DayPlan } from '../lib/types'
import { suggestionFor } from '../lib/workoutFlow'
import { ExerciseDetail } from './ExerciseDetail'
import { SwapSheet } from './SwapSheet'
import { Badge, Modal } from './ui'

function fmtKg(w: number) {
  return `${String(w).replace('.', ',')} kg`
}

export function DayView({ day, showSuggestions = true, swappable = true }: { day: DayPlan; showSuggestions?: boolean; swappable?: boolean }) {
  const { settings, workouts, sessionLimits, update } = useApp()
  const [detail, setDetail] = useState<string | null>(null)
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  const bw = settings.setup?.bodyWeight ?? 75
  const detailEx = detail ? getExercise(detail) : undefined
  const programDay = settings.program?.days[day.index]

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-card2 p-3">
        <p className="font-semibold">🔥 Isınma · {day.warmup.minutes} dk</p>
        <p className="text-sm text-muted">{day.warmup.items.map((i) => i.name).join(' · ')}</p>
      </div>

      {day.slots.map((slot, i) => {
        const ex = getExercise(slot.exerciseId)
        if (!ex) return null
        const sug = showSuggestions ? suggestionFor(slot, workouts, sessionLimits, bw) : null
        return (
          <div key={`${slot.exerciseId}-${i}`} className="rounded-xl border border-line bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(ex.id)}>
                <p className="text-xs text-muted">{regionLabel(slot.region)}</p>
                <p className="font-semibold leading-tight">
                  {ex.nameTr} <span className="font-normal text-muted">({ex.nameEn})</span>
                </p>
              </button>
              {swappable && (
                <button
                  className="h-11 shrink-0 rounded-lg bg-card2 px-3 text-sm font-semibold"
                  onClick={() => setSwapIdx(i)}
                  aria-label={`${ex.nameTr} hareketini değiştir`}
                >
                  ⇄ Değiştir
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
              <Badge tone="muted">
                {slot.sets} set × {slot.holdSec ? `${slot.holdSec} sn` : `${slot.repMin}–${slot.repMax} tekrar`}
              </Badge>
              <Badge tone="muted">Dinlenme {slot.restSec} sn</Badge>
              <Badge tone="muted">
                RPE {slot.targetRpe[0]}–{slot.targetRpe[1]}
              </Badge>
              {sug && !ex.bodyweight && sug.weight > 0 && (
                <Badge tone={sug.action === 'increase' ? 'accent' : sug.action === 'decrease' ? 'danger' : 'muted'}>
                  Öneri {fmtKg(sug.weight)}
                  {sug.action === 'increase' ? ' ↑' : sug.action === 'decrease' ? ' ↓' : ''}
                </Badge>
              )}
            </div>
            {sug && sug.action !== 'keep' && <p className="mt-1 text-xs text-muted">{sug.reason}</p>}
          </div>
        )
      })}

      {day.cardio && (
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="font-semibold">
            🚶 Kardiyo · {day.cardio.minutes} dk · {getExercise(day.cardio.exerciseId)?.nameTr}
            {day.cardio.mode === 'hiit' && <span className="ml-1"><Badge tone="warn">HIIT</Badge></span>}
          </p>
          <p className="text-sm text-muted">{day.cardio.detail}</p>
        </div>
      )}

      <div className="rounded-xl bg-card2 p-3">
        <p className="font-semibold">🧘 Soğuma · {day.cooldown.minutes} dk</p>
        <p className="text-sm text-muted">{day.cooldown.items.map((i) => i.name).join(' · ')}</p>
      </div>

      <Modal open={!!detailEx} onClose={() => setDetail(null)} title={detailEx ? `${detailEx.nameTr} (${detailEx.nameEn})` : ''}>
        {detailEx && <ExerciseDetail ex={detailEx} />}
      </Modal>
      {swapIdx != null && day.slots[swapIdx] && (
        <SwapSheet
          open
          exerciseId={day.slots[swapIdx].exerciseId}
          defaultId={programDay?.slots[swapIdx]?.exerciseId}
          onClose={() => setSwapIdx(null)}
          onPick={(id) => {
            const key = `${day.index}-${swapIdx}`
            const swaps = { ...settings.swaps }
            if (programDay?.slots[swapIdx]?.exerciseId === id) delete swaps[key]
            else swaps[key] = id
            void update({ swaps })
          }}
        />
      )}
    </div>
  )
}
