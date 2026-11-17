import { addDays, parseDate } from './dates'
import type { ExerciseLog } from './types'

export function logFor(logs: ExerciseLog[], exId: string, week: string): ExerciseLog | undefined {
  return logs.find((l) => l.planExerciseId === exId && l.week === week)
}

/** Verilen haftadan önceki en son kayıt */
export function lastLogBefore(logs: ExerciseLog[], exId: string, week: string): ExerciseLog | undefined {
  let best: ExerciseLog | undefined
  for (const l of logs) {
    if (l.planExerciseId !== exId || l.week >= week) continue
    if (!best || l.week > best.week) best = l
  }
  return best
}

export function logsFor(logs: ExerciseLog[], exId: string): ExerciseLog[] {
  return logs.filter((l) => l.planExerciseId === exId).sort((a, b) => a.week.localeCompare(b.week))
}

const dm = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })

export function weekLabel(week: string): string {
  return `${dm.format(parseDate(week))} – ${dm.format(parseDate(addDays(week, 6)))}`
}

export function kgText(n: number): string {
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`
}

export function setsText(log: ExerciseLog, bodyweight?: boolean): string {
  if (!log.sets.length) return '—'
  const ws = new Set(log.sets.map((s) => s.weight))
  const reps = log.sets.map((s) => s.reps).join(', ')
  if (bodyweight || (ws.size === 1 && log.sets[0].weight === 0)) return `${reps} tekrar`
  if (ws.size === 1) return `${kgText(log.sets[0].weight)} × ${reps}`
  return log.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')
}
