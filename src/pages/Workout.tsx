import { useEffect, useState } from 'react'
import { DurBanner } from '../components/DurBanner'
import { ExerciseDetail } from '../components/ExerciseDetail'
import { primeAudio } from '../components/RestTimer'
import { SwapSheet } from '../components/SwapSheet'
import { Badge, Button, Card, Chip, Modal, Stepper } from '../components/ui'
import { getExercise } from '../data/exercises'
import { useApp } from '../lib/appContext'
import { db } from '../lib/db'
import { makeSlot, regionLabel, resolveDay } from '../lib/program'
import { exceedsRpe, getLimits } from '../lib/safety'
import type { SetLog, Symptom, Workout, WorkoutEntry } from '../lib/types'
import { prefillSets, suggestionFor } from '../lib/workoutFlow'
import { FEELINGS, SYMPTOM_LABELS } from './symptoms'

const RPE_CHOICES = [3, 4, 5, 6, 7, 8, 9, 10]

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const s = Math.max(0, Math.floor((now - since) / 1000))
  return (
    <span className="tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  )
}

export function WorkoutPage({ onExit }: { onExit: () => void }) {
  const app = useApp()
  const { settings, workouts, update, startRest } = app
  const w = workouts.find((x) => x.finishedAt == null)
  const [detail, setDetail] = useState<string | null>(null)
  const [swapEntry, setSwapEntry] = useState<number | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [warmDone, setWarmDone] = useState<Record<number, boolean>>({})
  const [coolDone, setCoolDone] = useState<Record<number, boolean>>({})

  if (!w || !settings.program) return null
  const program = settings.program
  const limits = getLimits(settings.profile, { reduced: w.reduced })
  const day = resolveDay(program, w.dayIndex, settings.swaps, limits)
  const bw = settings.setup?.bodyWeight ?? 75
  const sessionMin = program.setup.sessionMin

  const save = (patch: Partial<Workout>) => db.workouts.update(w.id!, patch)
  const setEntries = (entries: WorkoutEntry[]) => save({ entries })

  const updateSet = (ei: number, si: number, patch: Partial<SetLog>) => {
    const entries = w.entries.map((e, i) =>
      i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
    )
    void setEntries(entries)
  }

  const completeSet = (ei: number, si: number) => {
    primeAudio()
    const e = w.entries[ei]
    const ex = getExercise(e.exerciseId)!
    const wasDone = e.sets[si].done
    updateSet(ei, si, { done: !wasDone })
    if (!wasDone) {
      const slot = makeSlot(ex, limits, sessionMin)
      startRest({ endsAt: Date.now() + slot.restSec * 1000, total: slot.restSec, label: ex.nameTr })
    }
  }

  const addSet = (ei: number) => {
    const e = w.entries[ei]
    const last = e.sets[e.sets.length - 1]
    const entries = w.entries.map((x, i) =>
      i === ei ? { ...x, sets: [...x.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 10, rpe: null, done: false }] } : x,
    )
    void setEntries(entries)
  }

  const removeSet = (ei: number) => {
    const e = w.entries[ei]
    if (e.sets.length <= 1) return
    const entries = w.entries.map((x, i) => (i === ei ? { ...x, sets: x.sets.slice(0, -1) } : x))
    void setEntries(entries)
  }

  const swapIn = (ei: number, id: string) => {
    const ex = getExercise(id)!
    const slot = makeSlot(ex, limits, sessionMin)
    slot.sets = w.entries[ei].sets.length
    const entries = w.entries.map((x, i) =>
      i === ei
        ? { exerciseId: id, region: ex.region, isometric: !!ex.isometric, sets: prefillSets(slot, workouts, limits, bw) }
        : x,
    )
    void setEntries(entries)
  }

  const totalSets = w.entries.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = w.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)

  return (
    <div>
      <div className="pt-safe sticky top-0 z-20 -mx-3 bg-bg/95 px-3 pb-2 pt-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <button className="h-11 rounded-lg bg-card2 px-3 text-sm font-semibold" onClick={onExit}>
            ← Geri
          </button>
          <div className="text-center">
            <p className="text-sm font-bold leading-tight">{w.dayName}</p>
            <p className="text-xs text-muted">
              <Elapsed since={w.startedAt} /> · {doneSets}/{totalSets} set
            </p>
          </div>
          <Button className="!min-h-11 !py-2 text-sm" onClick={() => setFinishOpen(true)}>
            Bitir
          </Button>
        </div>
        <DurBanner maxHr={settings.profile.maxHr} betaBlocker={settings.profile.betaBlocker} />
      </div>

      {w.reduced && (
        <p className="mt-2 rounded-xl bg-warn/10 p-3 text-sm text-warn">
          Semptom sonrası hafifletilmiş antrenman: RPE en fazla {limits.maxRpe}.
        </p>
      )}

      <Card className="mt-3">
        <p className="mb-2 font-semibold">🔥 Isınma · {day.warmup.minutes} dk</p>
        <ul className="space-y-1">
          {day.warmup.items.map((it, i) => (
            <li key={i}>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--app-accent)]"
                  checked={!!warmDone[i]}
                  onChange={(e) => setWarmDone({ ...warmDone, [i]: e.target.checked })}
                />
                <span className="text-sm">
                  <span className="font-medium">{it.name}:</span> <span className="text-muted">{it.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      {w.entries.map((e, ei) => {
        const ex = getExercise(e.exerciseId)
        if (!ex) return null
        const slot = makeSlot(ex, limits, sessionMin)
        const sug = suggestionFor(slot, workouts, limits, bw)
        const weighted = !ex.bodyweight
        return (
          <Card key={`${e.exerciseId}-${ei}`} className="mt-3">
            <div className="flex items-start justify-between gap-2">
              <button className="min-w-0 flex-1 text-left" onClick={() => setDetail(ex.id)}>
                <p className="text-xs text-muted">{regionLabel(ex.region)}</p>
                <p className="text-lg font-bold leading-tight">{ex.nameTr}</p>
                <p className="text-sm text-muted">({ex.nameEn}) · ⓘ detay</p>
              </button>
              <button className="h-11 shrink-0 rounded-lg bg-card2 px-3 text-sm font-semibold" onClick={() => setSwapEntry(ei)}>
                ⇄
              </button>
            </div>
            <p className="mt-2 rounded-lg bg-card2 p-2 text-sm">🫁 {ex.breathing}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="muted">{slot.holdSec ? `${slot.holdSec} sn tutuş (en fazla ${limits.maxIsometricSec})` : `${slot.repMin}–${slot.repMax} tekrar`}</Badge>
              <Badge tone="muted">RPE {slot.targetRpe[0]}–{slot.targetRpe[1]}</Badge>
              <Badge tone="muted">Dinlenme {slot.restSec} sn</Badge>
            </div>
            {sug && <p className="mt-1 text-xs text-muted">{sug.reason}</p>}

            <div className="mt-3 space-y-3">
              {e.sets.map((s, si) => {
                const over = exceedsRpe(s.rpe, limits)
                return (
                  <div key={si} className={`rounded-xl border p-3 ${s.done ? 'border-accent/60 bg-accent/5' : 'border-line'}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">Set {si + 1}</span>
                      {s.done && <Badge>✓ Tamam</Badge>}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {weighted && (
                        <Stepper
                          label="Ağırlık"
                          unit="kg"
                          value={s.weight}
                          step={ex.minIncrement && ex.minIncrement < 2.5 ? ex.minIncrement : 2.5}
                          max={500}
                          onChange={(v) => updateSet(ei, si, { weight: v })}
                        />
                      )}
                      <Stepper
                        label={e.isometric ? 'Süre' : 'Tekrar'}
                        unit={e.isometric ? 'sn' : 'tkr'}
                        value={s.reps}
                        step={e.isometric ? 5 : 1}
                        max={e.isometric ? limits.maxIsometricSec : 30}
                        decimals={0}
                        onChange={(v) => updateSet(ei, si, { reps: v })}
                      />
                    </div>
                    <p className="mb-1 mt-3 text-xs text-muted">
                      RPE (zorluk 1–10) · limitin {limits.maxRpe}
                    </p>
                    <div className="grid grid-cols-8 gap-1">
                      {RPE_CHOICES.map((r) => (
                        <button
                          key={r}
                          onClick={() => updateSet(ei, si, { rpe: s.rpe === r ? null : r })}
                          className={`h-11 rounded-lg text-base font-bold ${
                            s.rpe === r
                              ? r > limits.maxRpe
                                ? 'bg-danger text-white'
                                : 'bg-accent text-accent-fg'
                              : r > limits.maxRpe
                                ? 'bg-card2 text-danger/80'
                                : 'bg-card2'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {over && (
                      <p className="mt-2 rounded-lg bg-danger/10 p-2 text-sm text-danger">
                        Limitinin üstündesin. Sonraki sette ağırlığı veya tekrarı azalt, dinlenmeyi uzat. Kendini kötü
                        hissediyorsan DUR.
                      </p>
                    )}
                    <Button
                      variant={s.done ? 'secondary' : 'primary'}
                      className="mt-3 w-full"
                      onClick={() => completeSet(ei, si)}
                    >
                      {s.done ? 'Geri al' : '✓ Seti tamamla → dinlen'}
                    </Button>
                  </div>
                )
              })}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => addSet(ei)}>
                  + Set
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => removeSet(ei)} disabled={e.sets.length <= 1}>
                  − Set
                </Button>
              </div>
            </div>
          </Card>
        )
      })}

      {day.cardio && (
        <Card className="mt-3">
          <p className="font-semibold">
            🚶 Kardiyo · {getExercise(day.cardio.exerciseId)?.nameTr}{' '}
            {day.cardio.mode === 'hiit' ? <Badge tone="warn">HIIT</Badge> : <Badge tone="muted">Orta yoğunluk</Badge>}
          </p>
          <p className="mt-1 text-sm text-muted">{day.cardio.detail}</p>
          <p className="mt-1 text-sm text-muted">Hedef: {day.cardio.minutes} dk</p>
          <div className="mt-3">
            <Stepper
              label="Yapılan süre"
              unit="dk"
              value={w.cardioMinutes ?? 0}
              step={1}
              max={120}
              decimals={0}
              onChange={(v) => void save({ cardioMinutes: v })}
            />
          </div>
        </Card>
      )}

      <Card className="mt-3">
        <p className="mb-2 font-semibold">🧘 Soğuma · {day.cooldown.minutes} dk</p>
        <ul className="space-y-1">
          {day.cooldown.items.map((it, i) => (
            <li key={i}>
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--app-accent)]"
                  checked={!!coolDone[i]}
                  onChange={(e) => setCoolDone({ ...coolDone, [i]: e.target.checked })}
                />
                <span className="text-sm">
                  <span className="font-medium">{it.name}:</span> <span className="text-muted">{it.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid gap-2">
        <Button onClick={() => setFinishOpen(true)}>Antrenmanı bitir</Button>
        <Button variant="ghost" onClick={() => setCancelOpen(true)}>
          Antrenmanı iptal et
        </Button>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? getExercise(detail)?.nameTr ?? '' : ''}>
        {detail && getExercise(detail) && <ExerciseDetail ex={getExercise(detail)!} />}
      </Modal>

      {swapEntry != null && w.entries[swapEntry] && (
        <SwapSheet
          open
          exerciseId={w.entries[swapEntry].exerciseId}
          onClose={() => setSwapEntry(null)}
          onPick={(id) => swapIn(swapEntry, id)}
        />
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Antrenman iptal edilsin mi?">
        <p className="mb-4 text-sm">Bu antrenmanın kayıtları silinecek. Program sırası değişmez.</p>
        <div className="grid gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await db.workouts.delete(w.id!)
              startRest(null)
              setCancelOpen(false)
              onExit()
            }}
          >
            Evet, iptal et
          </Button>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>
            Vazgeç
          </Button>
        </div>
      </Modal>

      <FinishModal
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        onSave={async (feeling, note, symptoms) => {
          await save({ finishedAt: Date.now(), feeling, note, symptoms })
          await update({
            nextDayIndex: (w.dayIndex + 1) % program.days.length,
            symptomFlag: symptoms.length ? { date: w.date, symptoms } : null,
          })
          setFinishOpen(false)
          startRest(null)
          onExit()
          app.setTab('today')
        }}
      />
    </div>
  )
}

function FinishModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (feeling: number, note: string, symptoms: Symptom[]) => void | Promise<void>
}) {
  const [feeling, setFeeling] = useState(4)
  const [note, setNote] = useState('')
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const toggle = (s: Symptom) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  return (
    <Modal open={open} onClose={onClose} title="Nasıl hissettin?">
      <div className="grid grid-cols-5 gap-1">
        {FEELINGS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFeeling(f.v)}
            className={`flex h-16 flex-col items-center justify-center rounded-xl text-2xl ${feeling === f.v ? 'bg-accent/20 ring-2 ring-accent' : 'bg-card2'}`}
            aria-label={f.t}
          >
            {f.e}
            <span className="text-[10px] text-muted">{f.t}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 font-semibold">Semptom oldu mu?</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SYMPTOM_LABELS) as Symptom[]).map((s) => (
          <Chip key={s} tone="danger" active={symptoms.includes(s)} onClick={() => toggle(s)}>
            {SYMPTOM_LABELS[s]}
          </Chip>
        ))}
      </div>
      {symptoms.length > 0 && (
        <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {symptoms.includes('gogusagrisi')
            ? 'Göğüs ağrısı/baskı ciddi olabilir. Devam ediyor veya şiddetliyse hemen 112’yi ara. '
            : ''}
          Bir sonraki antrenmanın yoğunluğu bir kademe düşürülecek. Lütfen doktoruna danış.
        </p>
      )}
      <label className="mt-4 block">
        <span className="mb-1 block font-semibold">Not (isteğe bağlı)</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-line bg-bg p-3 text-base"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Uyku, enerji, ağrı, motivasyon…"
        />
      </label>
      <Button className="mt-4 w-full" onClick={() => onSave(feeling, note.trim(), symptoms)}>
        Kaydet ve bitir
      </Button>
    </Modal>
  )
}
