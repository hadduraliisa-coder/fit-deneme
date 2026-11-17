import { getExercise } from '../data/exercises'
import { generateProgram } from './program'
import type { Equipment, Exercise, HeartProfile, Plan, PlanDay, PlanExercise, SetupAnswers } from './types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function fromLibrary(ex: Exercise, sets = 3): PlanExercise {
  return {
    id: uid(),
    name: ex.nameTr,
    libraryId: ex.id,
    bodyPart: ex.bodyPart,
    sets,
    repMin: ex.compound ? 8 : 10,
    repMax: ex.compound ? 12 : 15,
    bodyweight: !!ex.bodyweight || !!ex.cardio,
  }
}

export function customExercise(name: string): PlanExercise {
  return { id: uid(), name, bodyPart: 'upper', sets: 3, repMin: 8, repMax: 12 }
}

export function emptyDay(name: string): PlanDay {
  return { id: uid(), name, exercises: [] }
}

export function emptyPlan(): Plan {
  return { days: [emptyDay('1. Gün')] }
}

/** Hazır şablon: program oluşturucunun güvenli seçimlerinden düzenlenebilir plan üretir */
export function templatePlan(
  daysPerWeek: SetupAnswers['daysPerWeek'],
  equipment: Equipment,
  profile: HeartProfile,
): Plan {
  const program = generateProgram({ daysPerWeek, sessionMin: 60, equipment, goal: 'kas', bodyWeight: 75 }, profile)
  return {
    days: program.days.map((d) => ({
      id: uid(),
      name: d.name,
      exercises: d.slots
        .map((s) => {
          const ex = getExercise(s.exerciseId)
          if (!ex) return null
          const pe = fromLibrary(ex, s.sets)
          pe.repMin = s.repMin
          pe.repMax = s.repMax
          return pe
        })
        .filter((x): x is PlanExercise => x != null),
    })),
  }
}

export function allPlanExercises(plan: Plan | null): PlanExercise[] {
  return plan ? plan.days.flatMap((d) => d.exercises) : []
}
