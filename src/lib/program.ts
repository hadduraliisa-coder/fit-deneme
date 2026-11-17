import { COOLDOWN_ITEMS, EXERCISES, REGION_LABELS, WARMUP_ITEMS, getExercise } from '../data/exercises'
import { getLimits, isExerciseAllowed } from './safety'
import type {
  CardioBlock,
  DayPlan,
  Equipment,
  Exercise,
  ExerciseSlot,
  HeartProfile,
  Limits,
  ProgramPlan,
  Region,
  SetupAnswers,
} from './types'

type DayKind = DayPlan['kind']

interface DayTemplate {
  name: string
  kind: DayKind
  /** Öncelik sırasına göre bölgeler; [bölge, varyant] (varyant 1 = alternatif hareket) */
  regions: [Region, number][]
}

const FULL_A: DayTemplate = {
  name: 'Tüm Vücut A',
  kind: 'full',
  regions: [
    ['quadriceps', 0],
    ['gogus', 0],
    ['sirt', 0],
    ['hamstring', 0],
    ['omuz', 0],
    ['core', 0],
    ['glutes', 0],
    ['biceps', 0],
    ['triceps', 0],
    ['baldir', 0],
  ],
}
const FULL_B: DayTemplate = {
  name: 'Tüm Vücut B',
  kind: 'full',
  regions: [
    ['hamstring', 1],
    ['sirt', 1],
    ['gogus', 1],
    ['glutes', 0],
    ['omuz', 1],
    ['core', 1],
    ['triceps', 0],
    ['biceps', 1],
    ['baldir', 1],
  ],
}
const FULL_C: DayTemplate = {
  name: 'Tüm Vücut C',
  kind: 'full',
  regions: [
    ['glutes', 1],
    ['quadriceps', 1],
    ['gogus', 0],
    ['sirt', 0],
    ['omuz', 2],
    ['core', 0],
    ['triceps', 1],
    ['biceps', 0],
    ['baldir', 0],
  ],
}
const UPPER_A: DayTemplate = {
  name: 'Üst Vücut A',
  kind: 'upper',
  regions: [
    ['gogus', 0],
    ['sirt', 0],
    ['omuz', 0],
    ['sirt', 1],
    ['biceps', 0],
    ['triceps', 0],
    ['omuz', 2],
    ['core', 0],
  ],
}
const UPPER_B: DayTemplate = {
  name: 'Üst Vücut B',
  kind: 'upper',
  regions: [
    ['sirt', 1],
    ['gogus', 1],
    ['omuz', 1],
    ['sirt', 0],
    ['triceps', 1],
    ['biceps', 1],
    ['gogus', 0],
    ['core', 1],
  ],
}
const LOWER_A: DayTemplate = {
  name: 'Alt Vücut A',
  kind: 'lower',
  regions: [
    ['quadriceps', 0],
    ['hamstring', 0],
    ['glutes', 0],
    ['quadriceps', 1],
    ['baldir', 0],
    ['core', 0],
    ['hamstring', 1],
  ],
}
const LOWER_B: DayTemplate = {
  name: 'Alt Vücut B',
  kind: 'lower',
  regions: [
    ['hamstring', 1],
    ['quadriceps', 1],
    ['glutes', 1],
    ['hamstring', 0],
    ['baldir', 1],
    ['core', 1],
    ['glutes', 0],
  ],
}
const CARDIO_CORE: DayTemplate = {
  name: 'Kardiyo + Core',
  kind: 'cardio-core',
  regions: [
    ['core', 0],
    ['core', 2],
    ['core', 1],
  ],
}

export function splitFor(days: SetupAnswers['daysPerWeek']): DayTemplate[] {
  switch (days) {
    case 2:
      return [FULL_A, FULL_B]
    case 3:
      return [FULL_A, FULL_B, FULL_C]
    case 4:
      return [UPPER_A, LOWER_A, UPPER_B, LOWER_B]
    case 5:
      return [UPPER_A, LOWER_A, CARDIO_CORE, UPPER_B, LOWER_B]
  }
}

export function warmupMinutes(sessionMin: number): number {
  if (sessionMin <= 30) return 5
  if (sessionMin <= 45) return 7
  return 10
}

export function cooldownMinutes(sessionMin: number): number {
  if (sessionMin <= 45) return 5
  if (sessionMin <= 60) return 7
  return 10
}

/** Hedefe göre güç antrenmanı sonrası kardiyo süresi */
export function cardioMinutesFor(goal: SetupAnswers['goal'], sessionMin: number, kind: DayKind): number {
  if (kind === 'cardio-core') return Math.max(15, sessionMin - warmupMinutes(sessionMin) - cooldownMinutes(sessionMin) - 12)
  if (goal === 'kilo') return sessionMin >= 45 ? 15 : 8
  if (goal === 'saglik') return sessionMin >= 45 ? 10 : 0
  return 0
}

/** Bir bölge için, profile ve ekipmana uygun hareketleri öncelik sırasıyla döndürür (en iyi seçim önce) */
export function candidatesFor(region: Region, limits: Limits, equipment: Equipment): Exercise[] {
  const list = EXERCISES.filter((e) => e.region === region && isExerciseAllowed(e, limits, equipment))
  return list.sort((a, b) => Number(b.isBest) - Number(a.isBest))
}

/** Aynı bölgedeki güvenli alternatifler (swap için) */
export function swapOptions(exerciseId: string, limits: Limits, equipment: Equipment): Exercise[] {
  const ex = getExercise(exerciseId)
  if (!ex) return []
  return candidatesFor(ex.region, limits, equipment).filter((e) => e.id !== exerciseId)
}

export function setsFor(sessionMin: number): number {
  return sessionMin <= 30 ? 2 : 3
}

export function makeSlot(ex: Exercise, limits: Limits, sessionMin: number): ExerciseSlot {
  const repMin = ex.compound ? limits.repMin : Math.max(limits.repMin, 10)
  const repMax = ex.compound ? Math.min(limits.repMax, 12) : limits.repMax
  const slot: ExerciseSlot = {
    region: ex.region,
    exerciseId: ex.id,
    sets: setsFor(sessionMin),
    repMin: Math.min(repMin, repMax),
    repMax,
    restSec: ex.compound ? limits.restCompoundSec : limits.restIsolationSec,
    targetRpe: limits.targetRpe,
  }
  if (ex.isometric) {
    slot.holdSec = Math.min(30, limits.maxIsometricSec)
    slot.repMin = 1
    slot.repMax = 1
  }
  return slot
}

/** Bir güç hareketinin ortalama süresi (dk): setler × (çalışma + dinlenme) + geçiş */
export function slotMinutes(slot: ExerciseSlot): number {
  const workSec = slot.holdSec ?? 45
  return (slot.sets * (workSec + slot.restSec)) / 60 + 1.5
}

export function buildCardio(
  setup: SetupAnswers,
  limits: Limits,
  minutes: number,
): CardioBlock | undefined {
  if (minutes <= 0) return undefined
  const options = candidatesFor('kardiyo', limits, setup.equipment)
  const ex = options[0]
  if (!ex) return undefined
  if (limits.allowHiit) {
    return {
      exerciseId: ex.id,
      minutes,
      mode: 'hiit',
      detail: `3 dk rahat başla, sonra 30 sn tempolu (RPE ${limits.maxRpe}’yi geçme) / 90 sn yavaş tekrarla, son 3 dk yavaşla. Nefes nefese kalma.`,
    }
  }
  return {
    exerciseId: ex.id,
    minutes,
    mode: 'orta',
    detail: `Orta yoğunluk: konuşabileceğin tempoda (RPE ${Math.min(4, limits.maxRpe - 1)}–${Math.min(5, limits.maxRpe)} / 10). Nefesin hızlanır ama cümle kurabilirsin.`,
  }
}

export function buildDay(
  template: DayTemplate,
  index: number,
  setup: SetupAnswers,
  limits: Limits,
): DayPlan {
  const warm = warmupMinutes(setup.sessionMin)
  const cool = cooldownMinutes(setup.sessionMin)
  const cardioMin = cardioMinutesFor(setup.goal, setup.sessionMin, template.kind)
  let budget = setup.sessionMin - warm - cool - cardioMin

  const slots: ExerciseSlot[] = []
  const used = new Set<string>()
  for (const [region, variant] of template.regions) {
    const cands = candidatesFor(region, limits, setup.equipment).filter((c) => !used.has(c.id))
    if (cands.length === 0) continue
    const ex = cands[Math.min(variant, cands.length - 1)]
    const slot = makeSlot(ex, limits, setup.sessionMin)
    const need = slotMinutes(slot)
    // En az 2 hareket her zaman; sonrası süreye sığdığı kadar
    if (slots.length >= 2 && need > budget) break
    slots.push(slot)
    used.add(ex.id)
    budget -= need
  }

  return {
    index,
    name: template.name,
    kind: template.kind,
    warmup: {
      minutes: warm,
      items: WARMUP_ITEMS.map((w) => ({ ...w })),
    },
    slots,
    cardio: buildCardio(setup, limits, cardioMin),
    cooldown: {
      minutes: cool,
      items: COOLDOWN_ITEMS.map((c) => ({ ...c })),
    },
  }
}

export function generateProgram(setup: SetupAnswers, profile: HeartProfile): ProgramPlan {
  const limits = getLimits(profile)
  const days = splitFor(setup.daysPerWeek).map((t, i) => buildDay(t, i, setup, limits))
  return {
    createdAt: new Date().toISOString(),
    setup,
    profileSeverity: profile.severity,
    days,
  }
}

/**
 * Kayıtlı programdaki slotlara kullanıcı değişikliklerini (swap) ve güncel profil limitlerini uygular.
 * Profil sonradan değiştiyse ve hareket artık yasaksa, aynı bölgedeki ilk güvenli harekete düşer.
 */
export function resolveDay(
  plan: ProgramPlan,
  dayIndex: number,
  swaps: Record<string, string>,
  limits: Limits,
): DayPlan {
  const day = plan.days[dayIndex % plan.days.length]
  const equipment = plan.setup.equipment
  const slots: ExerciseSlot[] = []
  const used = new Set<string>()
  day.slots.forEach((slot, si) => {
    const wanted = swaps[`${day.index}-${si}`] ?? slot.exerciseId
    let ex = getExercise(wanted)
    if (!ex || !isExerciseAllowed(ex, limits, equipment) || used.has(ex.id)) {
      ex = candidatesFor(slot.region, limits, equipment).find((c) => !used.has(c.id))
    }
    if (!ex) return
    used.add(ex.id)
    slots.push({ ...makeSlot(ex, limits, plan.setup.sessionMin), sets: slot.sets })
  })
  const cardio = day.cardio ? buildCardio(plan.setup, limits, day.cardio.minutes) : undefined
  return { ...day, slots, cardio }
}

export function regionLabel(r: Region): string {
  return REGION_LABELS[r]
}

export const GOAL_LABELS: Record<SetupAnswers['goal'], string> = {
  saglik: 'Genel sağlık',
  kas: 'Kas kazanımı',
  kilo: 'Kilo verme',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  salon: 'Spor salonu',
  ev: 'Ev (vücut ağırlığı + lastik)',
  dambil: 'Dambıl (ev)',
}
