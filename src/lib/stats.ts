import { getExercise } from '../data/exercises'
import { addDays, weekStart } from './dates'
import type { Region, Workout } from './types'

export function finished(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => w.finishedAt != null).sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt)
}

/** Hacim = set × tekrar × kg (sadece tamamlanan setler) */
export function workoutVolume(w: Workout): number {
  let v = 0
  for (const e of w.entries) for (const s of e.sets) if (s.done) v += s.reps * s.weight
  return v
}

export function weeklyVolume(workouts: Workout[]): { week: string; volume: number }[] {
  const map = new Map<string, number>()
  for (const w of finished(workouts)) {
    const k = weekStart(w.date)
    map.set(k, (map.get(k) ?? 0) + workoutVolume(w))
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, volume]) => ({ week, volume: Math.round(volume) }))
}

/** Verilen haftadaki kas grubu bazında tamamlanan set sayısı */
export function setsPerRegion(workouts: Workout[], week: string): { region: Region; sets: number }[] {
  const map = new Map<Region, number>()
  for (const w of finished(workouts)) {
    if (weekStart(w.date) !== week) continue
    for (const e of w.entries) {
      const n = e.sets.filter((s) => s.done).length
      if (n) map.set(e.region, (map.get(e.region) ?? 0) + n)
    }
  }
  return [...map.entries()].map(([region, sets]) => ({ region, sets }))
}

/** Hareket bazında her seansın en ağır seti */
export function exerciseProgress(workouts: Workout[], exerciseId: string): { date: string; weight: number; reps: number }[] {
  const out: { date: string; weight: number; reps: number }[] = []
  for (const w of finished(workouts)) {
    const e = w.entries.find((x) => x.exerciseId === exerciseId)
    if (!e) continue
    const done = e.sets.filter((s) => s.done)
    if (!done.length) continue
    const top = done.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))
    out.push({ date: w.date, weight: top.weight, reps: top.reps })
  }
  return out
}

export function personalRecords(workouts: Workout[]): { exerciseId: string; weight: number; reps: number; date: string }[] {
  const map = new Map<string, { weight: number; reps: number; date: string }>()
  for (const w of finished(workouts)) {
    for (const e of w.entries) {
      if (getExercise(e.exerciseId)?.cardio) continue
      for (const s of e.sets) {
        if (!s.done) continue
        const cur = map.get(e.exerciseId)
        if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          map.set(e.exerciseId, { weight: s.weight, reps: s.reps, date: w.date })
        }
      }
    }
  }
  return [...map.entries()].map(([exerciseId, v]) => ({ exerciseId, ...v }))
}

/** Seri: en az bir antrenman yapılan ardışık hafta sayısı (bu hafta henüz boşsa geçen haftadan sayılır) */
export function weekStreak(workouts: Workout[], today: string): number {
  const weeks = new Set(finished(workouts).map((w) => weekStart(w.date)))
  let cur = weekStart(today)
  if (!weeks.has(cur)) cur = addDays(cur, -7)
  let n = 0
  while (weeks.has(cur)) {
    n++
    cur = addDays(cur, -7)
  }
  return n
}

/** Son antrenmandaki hareketin setleri (otomatik doldurma için) */
export function lastSetsFor(workouts: Workout[], exerciseId: string) {
  const list = finished(workouts)
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i].entries.find((x) => x.exerciseId === exerciseId)
    if (e && e.sets.some((s) => s.done)) return e.sets
  }
  return null
}
