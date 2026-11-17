import { useMemo, useState } from 'react'
import { DurBanner } from '../components/DurBanner'
import { Badge, Button, Card, Chip, PageHeader, SectionTitle, Stepper } from '../components/ui'
import { getExercise } from '../data/exercises'
import { planExerciseWarning, weeklyTarget } from '../lib/advice'
import { useApp } from '../lib/appContext'
import { db } from '../lib/db'
import { addDays, todayStr, weekStart } from '../lib/dates'
import { allPlanExercises } from '../lib/plan'
import { exceedsRpe } from '../lib/safety'
import type { ExerciseLog, LogSet, PlanExercise, Symptom } from '../lib/types'
import { kgText, lastLogBefore, logFor, setsText, weekLabel } from '../lib/weekly'
import { FEELINGS, SYMPTOM_LABELS } from './symptoms'

const RPE_CHOICES = [3, 4, 5, 6, 7, 8, 9, 10]

export function WeekPage() {
  const { settings, exerciseLogs, weekNotes, sessionLimits } = useApp()
  const plan = settings.plan!
  const current = weekStart(todayStr())
  const [week, setWeek] = useState(current)
  const exercises = allPlanExercises(plan)
  const doneCount = exercises.filter((e) => logFor(exerciseLogs, e.id, week)).length

  return (
    <div>
      <PageHeader title={week === current ? 'Bu Hafta' : 'Geçmiş hafta'} />
      <div className="mb-3 flex items-center gap-2">
        <button className="h-12 w-12 rounded-xl bg-card2 text-2xl" aria-label="Önceki hafta" onClick={() => setWeek(addDays(week, -7))}>
          ‹
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold">{weekLabel(week)}</p>
          <p className="text-xs text-muted">
            {doneCount}/{exercises.length} hareket girildi
          </p>
        </div>
        <button
          className="h-12 w-12 rounded-xl bg-card2 text-2xl disabled:opacity-30"
          aria-label="Sonraki hafta"
          disabled={week >= current}
          onClick={() => setWeek(addDays(week, 7))}
        >
          ›
        </button>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-card2">
        <div className="h-full bg-accent transition-all" style={{ width: `${exercises.length ? (doneCount / exercises.length) * 100 : 0}%` }} />
      </div>

      <DurBanner maxHr={settings.profile.maxHr} betaBlocker={settings.profile.betaBlocker} />

      {settings.symptomFlag && (
        <Card className="mt-3 border-warn/50 bg-warn/10">
          <p className="font-bold text-warn">⚠️ Semptom bildirdin</p>
          <p className="mt-1 text-sm">
            {settings.symptomFlag.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ')}. Bu haftanın hedefleri bir kademe hafifletildi (RPE en fazla{' '}
            {sessionLimits.maxRpe}, ağırlıklar ~%10 az). Lütfen doktoruna danış; semptom sürüyorsa antrenman yapma.
          </p>
        </Card>
      )}

      {exercises.length === 0 && (
        <Card className="mt-4 text-center">
          <p className="mb-3">Planında henüz hareket yok.</p>
          <p className="text-sm text-muted">Alttaki “Planım” sekmesinden günlerini ve hareketlerini yaz.</p>
        </Card>
      )}

      {plan.days.map((day) => (
        <section key={day.id}>
          {day.exercises.length > 0 && <SectionTitle>{day.name}</SectionTitle>}
          <div className="space-y-2">
            {day.exercises.map((ex) => (
              <ExerciseWeekCard key={`${ex.id}-${week}-${logFor(exerciseLogs, ex.id, week)?.id ?? 'yeni'}`} ex={ex} week={week} />
            ))}
          </div>
        </section>
      ))}

      {exercises.length > 0 && <WeekNoteCard key={`${week}-${weekNotes.find((n) => n.week === week) ? 'var' : 'yok'}`} week={week} />}
    </div>
  )
}

function ExerciseWeekCard({ ex, week }: { ex: PlanExercise; week: string }) {
  const { settings, exerciseLogs, sessionLimits, limits } = useApp()
  const existing = logFor(exerciseLogs, ex.id, week)
  const last = lastLogBefore(exerciseLogs, ex.id, week)
  const target = useMemo(() => weeklyTarget(ex, last, sessionLimits, settings.bodyWeight), [ex, last, sessionLimits, settings.bodyWeight])
  const lib = ex.libraryId ? getExercise(ex.libraryId) : undefined
  const weighted = !ex.bodyweight
  const warn = planExerciseWarning(ex, limits)

  const initialSets = (): LogSet[] => {
    if (existing) return existing.sets.map((s) => ({ ...s }))
    return Array.from({ length: ex.sets }, (_, i) => {
      const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1]
      const reps = prev ? Math.min(Math.max(prev.reps, ex.repMin), ex.repMax) : target.reps
      return { weight: weighted ? target.weight : 0, reps: Math.min(Math.max(reps, ex.repMin), ex.repMax) }
    })
  }
  const [open, setOpen] = useState(!existing)
  const [sets, setSets] = useState<LogSet[]>(initialSets)
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null)

  const allWeight = sets[0]?.weight ?? 0
  const setAllWeight = (w: number) => setSets((cur) => cur.map((s) => ({ ...s, weight: w })))
  const save = async () => {
    const rec: ExerciseLog = { planExerciseId: ex.id, week, date: todayStr(), sets, rpe, ...(existing?.id != null ? { id: existing.id } : {}) }
    await db.exerciseLogs.put(rec)
    setOpen(false)
  }
  const remove = async () => {
    if (existing?.id != null) await db.exerciseLogs.delete(existing.id)
    setSets(initialSets())
    setRpe(null)
    setOpen(true)
  }

  const actionBadge =
    target.action === 'increase' ? <Badge>↑ Artır</Badge> : target.action === 'decrease' ? <Badge tone="danger">↓ Azalt</Badge> : target.action === 'keep' ? <Badge tone="muted">= Aynı kal</Badge> : <Badge tone="muted">Başlangıç</Badge>

  // Geçen haftaya göre değişim
  const delta = existing && last && weighted ? Math.max(...existing.sets.map((s) => s.weight)) - Math.max(...last.sets.map((s) => s.weight)) : null

  return (
    <Card className={existing && !open ? 'border-accent/40' : ''}>
      <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="min-w-0">
          <p className="font-bold leading-tight">{ex.name}</p>
          <p className="text-sm text-muted">
            {ex.sets} set × {ex.repMin}–{ex.repMax} {ex.bodyPart === 'cardio' ? 'dk' : 'tekrar'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {existing ? <Badge>✓ Girildi</Badge> : actionBadge}
          {delta != null && delta !== 0 && <Badge tone={delta > 0 ? 'accent' : 'warn'}>{delta > 0 ? '+' : ''}{kgText(delta)}</Badge>}
        </div>
      </button>

      {existing && !open && <p className="mt-2 text-sm">{setsText(existing, ex.bodyweight)}{existing.rpe ? ` · RPE ${existing.rpe}` : ''}</p>}

      {open && (
        <div className="mt-3 space-y-3">
          {last ? (
            <p className="rounded-lg bg-card2 p-2 text-sm">
              <span className="text-muted">Önceki ({weekLabel(last.week)}):</span> {setsText(last, ex.bodyweight)}
              {last.rpe ? ` · RPE ${last.rpe}` : ''}
            </p>
          ) : (
            <p className="rounded-lg bg-card2 p-2 text-sm text-muted">İlk kayıt – rahat bir ağırlıkla başla.</p>
          )}
          <div className="rounded-lg bg-accent/10 p-3 text-sm">
            <p className="font-semibold text-accent">
              🎯 Bu haftanın hedefi: {weighted && target.weight > 0 ? `${kgText(target.weight)} × ` : ''}
              {ex.repMin}–{ex.repMax} {ex.bodyPart === 'cardio' ? 'dk' : 'tekrar'}, RPE {sessionLimits.targetRpe[0]}–{sessionLimits.targetRpe[1]}
            </p>
            <p className="mt-1">{target.reason}</p>
          </div>
          {lib && <p className="text-xs text-muted">🫁 {lib.breathing}</p>}
          {warn && <p className="rounded-lg bg-warn/10 p-2 text-xs text-warn">⚠️ {warn}</p>}

          {weighted && <Stepper label="Ağırlık (tüm setler)" unit="kg" value={allWeight} step={lib?.minIncrement && lib.minIncrement < 2.5 ? lib.minIncrement : 2.5} max={500} onChange={setAllWeight} />}

          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-sm font-semibold">Set {i + 1}</span>
                <div className="flex-1">
                  <Stepper
                    value={s.reps}
                    unit={ex.bodyPart === 'cardio' ? 'dk' : 'tkr'}
                    decimals={0}
                    max={ex.bodyPart === 'cardio' ? 180 : 50}
                    onChange={(v) => setSets((cur) => cur.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSets((cur) => [...cur, { ...(cur[cur.length - 1] ?? { weight: 0, reps: ex.repMin }) }])}
              >
                + Set
              </Button>
              <Button variant="secondary" className="flex-1" disabled={sets.length <= 1} onClick={() => setSets((cur) => cur.slice(0, -1))}>
                − Set
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted">En zor setin RPE’si (zorluk 1–10) · limitin {sessionLimits.maxRpe}</p>
            <div className="grid grid-cols-8 gap-1">
              {RPE_CHOICES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRpe(rpe === r ? null : r)}
                  className={`h-11 rounded-lg text-base font-bold ${
                    rpe === r ? (r > sessionLimits.maxRpe ? 'bg-danger text-white' : 'bg-accent text-accent-fg') : r > sessionLimits.maxRpe ? 'bg-card2 text-danger/80' : 'bg-card2'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {exceedsRpe(rpe, sessionLimits) && (
              <p className="mt-2 rounded-lg bg-danger/10 p-2 text-sm text-danger">Limitinin üstündesin. Gelecek hafta ağırlığı azaltman önerilecek.</p>
            )}
            {rpe == null && <p className="mt-1 text-xs text-muted">RPE girmezsen kilo artışı önerilmez.</p>}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button onClick={save}>{existing ? 'Güncelle' : 'Kaydet'}</Button>
            {existing && (
              <Button variant="ghost" className="text-danger!" onClick={remove}>
                Sil
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function WeekNoteCard({ week }: { week: string }) {
  const { weekNotes, update } = useApp()
  const existing = weekNotes.find((n) => n.week === week)
  const [feeling, setFeeling] = useState<number | undefined>(existing?.feeling)
  const [symptoms, setSymptoms] = useState<Symptom[]>(existing?.symptoms ?? [])
  const [note, setNote] = useState(existing?.note ?? '')
  const [saved, setSaved] = useState(false)
  const toggle = (s: Symptom) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  const current = week === weekStart(todayStr())

  const save = async () => {
    await db.weekNotes.put({ week, feeling, symptoms, note: note.trim() || undefined })
    // Sadece en güncel hafta notu semptom bayrağını belirler
    if (current) await update({ symptomFlag: symptoms.length ? { date: todayStr(), symptoms } : null })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <SectionTitle>Bu hafta nasıl hissettin?</SectionTitle>
      <Card>
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
        <p className="mb-2 mt-4 font-semibold">Antrenmanda/sonrasında semptom oldu mu?</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SYMPTOM_LABELS) as Symptom[]).map((s) => (
            <Chip key={s} tone="danger" active={symptoms.includes(s)} onClick={() => toggle(s)}>
              {SYMPTOM_LABELS[s]}
            </Chip>
          ))}
        </div>
        {symptoms.length > 0 && (
          <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {symptoms.includes('gogusagrisi') ? 'Göğüs ağrısı/baskı ciddi olabilir. Devam ediyor veya şiddetliyse hemen 112’yi ara. ' : ''}
            Sonraki hedefler bir kademe hafifletilecek. Lütfen doktoruna danış.
          </p>
        )}
        <textarea
          className="mt-4 min-h-20 w-full rounded-xl border border-line bg-bg p-3 text-base"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Not: uyku, enerji, ağrı…"
        />
        <Button className="mt-3 w-full" onClick={save}>
          {saved ? '✓ Kaydedildi' : 'Notu kaydet'}
        </Button>
      </Card>
    </>
  )
}
