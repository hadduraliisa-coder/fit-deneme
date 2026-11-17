import { getExercise } from '../data/exercises'
import { suggestNext, type Suggestion } from './overload'
import { lastSetsFor } from './stats'
import type { DayPlan, ExerciseSlot, Limits, SetLog, Workout, WorkoutEntry } from './types'
import { todayStr } from './dates'

export function suggestionFor(slot: ExerciseSlot, workouts: Workout[], limits: Limits, bodyWeight: number): Suggestion | null {
  const ex = getExercise(slot.exerciseId)
  if (!ex) return null
  return suggestNext(ex, lastSetsFor(workouts, ex.id), slot.repMax, limits, bodyWeight)
}

/** Bir slot için set satırlarını hazırlar: son seansın değerleri + güvenlik/ilerleme önerisi */
export function prefillSets(slot: ExerciseSlot, workouts: Workout[], limits: Limits, bodyWeight: number): SetLog[] {
  const ex = getExercise(slot.exerciseId)!
  const last = lastSetsFor(workouts, ex.id)
  const sug = suggestNext(ex, last, slot.repMax, limits, bodyWeight)
  return Array.from({ length: slot.sets }, (_, i) => {
    const prev = last?.[i] ?? last?.[last.length - 1]
    // Düşürme/başlangıç/semptom durumunda öneri doğrudan uygulanır; aksi halde son seansın ağırlığı gelir
    const useSuggestion = !prev || sug.action === 'decrease' || sug.action === 'start' || limits.reduced
    const weight = useSuggestion ? sug.weight : prev.weight
    let reps = slot.holdSec ?? prev?.reps ?? sug.reps
    if (slot.holdSec) reps = Math.min(slot.holdSec, limits.maxIsometricSec)
    else reps = Math.min(Math.max(reps, slot.repMin), slot.repMax)
    return { weight, reps, rpe: null, done: false }
  })
}

export function createWorkout(day: DayPlan, workouts: Workout[], limits: Limits, bodyWeight: number): Workout {
  const entries: WorkoutEntry[] = day.slots.map((slot) => ({
    exerciseId: slot.exerciseId,
    region: slot.region,
    isometric: slot.holdSec != null,
    sets: prefillSets(slot, workouts, limits, bodyWeight),
  }))
  return {
    date: todayStr(),
    startedAt: Date.now(),
    finishedAt: null,
    dayIndex: day.index,
    dayName: day.name,
    reduced: limits.reduced,
    entries,
    cardioMinutes: day.cardio ? 0 : undefined,
  }
}
