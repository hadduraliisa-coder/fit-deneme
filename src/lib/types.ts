export type Region =
  | 'gogus'
  | 'sirt'
  | 'omuz'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstring'
  | 'glutes'
  | 'baldir'
  | 'core'
  | 'kardiyo'

/** Kullanıcının elindeki ekipman ortamı */
export type Equipment = 'salon' | 'ev' | 'dambil'

export type BodyPart = 'upper' | 'lower' | 'core' | 'cardio'

export type Severity = 'hafif' | 'orta' | 'ciddi'

export type Goal = 'saglik' | 'kas' | 'kilo'

export interface Exercise {
  id: string
  nameTr: string
  nameEn: string
  region: Region
  bodyPart: BodyPart
  /** Hedef kaslar (serbest metin) */
  targetMuscles: string
  /** Hangi ekipman ortamlarında yapılabilir */
  equipment: Equipment[]
  /** Kartta gösterilecek ekipman açıklaması */
  equipmentText: string
  /** Bölgenin "en iyi seçim" hareketi mi? */
  isBest: boolean
  /** Neden en iyi seçim (sadece isBest için) */
  bestReason?: string
  steps: string[]
  mistakes: string[]
  /** Nefes talimatı – her harekette zorunlu */
  breathing: string
  /** Kalp güvenliği notu – her harekette zorunlu */
  heartNote: string
  /** Ağır compound (squat, trap bar deadlift, ayakta overhead press vb.) */
  heavyCompound: boolean
  /** Makine veya destekli (oturarak, yatarak, tutunarak) hareket */
  supported: boolean
  /** Compound hareket mi (dinlenme ve tekrar aralığı için) */
  compound: boolean
  /** Ağırlık kullanılmıyorsa (vücut ağırlığı / lastik) true */
  bodyweight?: boolean
  /** İzometrik tutuş ise tutuş süresi (sn) – tekrar yerine kullanılır */
  isometric?: boolean
  /** Kardiyo hareketi mi */
  cardio?: boolean
  /** Baş aşağı pozisyon içerir mi (güvenlik filtresi; veride hep false olmalı) */
  inverted?: boolean
  /** Nefes tutmayı (Valsalva) gerektirir mi (veride hep false olmalı) */
  valsalva?: boolean
  /** Başlangıç ağırlığı önerisi: vücut ağırlığı × katsayı (dambılda tek dambıl) */
  startFactor?: number
  /** Ağırlık artış adımları için en küçük adım (kg) */
  minIncrement?: number
}

export interface HeartProfile {
  severity: Severity
  /** Opsiyonel maksimum nabız limiti */
  maxHr?: number | null
  betaBlocker: boolean
  hiit: boolean
}

export interface SetupAnswers {
  daysPerWeek: 2 | 3 | 4 | 5
  sessionMin: 30 | 45 | 60 | 75
  equipment: Equipment
  goal: Goal
  bodyWeight: number
}

export interface Limits {
  severity: Severity
  maxRpe: number
  targetRpe: [number, number]
  repMin: number
  repMax: number
  restCompoundSec: number
  restIsolationSec: number
  maxIsometricSec: number
  allowHeavyCompound: boolean
  onlySupported: boolean
  allowHiit: boolean
  allowFailure: false
  allow1RmTest: false
  /** Semptom sonrası bir kademe azaltılmış mı */
  reduced: boolean
}

export interface BlockItem {
  name: string
  minutes?: number
  detail: string
}

export interface ExerciseSlot {
  region: Region
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  /** İzometrik ise saniye cinsinden tutuş */
  holdSec?: number
  restSec: number
  targetRpe: [number, number]
}

export interface CardioBlock {
  exerciseId: string
  minutes: number
  mode: 'orta' | 'hiit'
  detail: string
}

export interface DayPlan {
  index: number
  name: string
  kind: 'full' | 'upper' | 'lower' | 'cardio-core'
  warmup: { minutes: number; items: BlockItem[] }
  slots: ExerciseSlot[]
  cardio?: CardioBlock
  cooldown: { minutes: number; items: BlockItem[] }
}

export interface ProgramPlan {
  createdAt: string
  setup: SetupAnswers
  profileSeverity: Severity
  days: DayPlan[]
}

export interface SetLog {
  weight: number
  reps: number
  rpe: number | null
  done: boolean
}

export interface WorkoutEntry {
  exerciseId: string
  region: Region
  sets: SetLog[]
  isometric?: boolean
}

export type Symptom = 'carpinti' | 'nefes' | 'basdonmesi' | 'sislik' | 'gogusagrisi'

export interface Workout {
  id?: number
  date: string // YYYY-MM-DD
  startedAt: number
  finishedAt: number | null
  dayIndex: number
  dayName: string
  reduced: boolean
  entries: WorkoutEntry[]
  cardioMinutes?: number
  feeling?: number // 1-5
  note?: string
  symptoms?: Symptom[]
}

export interface BodyLog {
  id?: number
  date: string
  weight?: number | null
  waist?: number | null
  restingHr?: number | null
  systolic?: number | null
  diastolic?: number | null
}

export interface AppSettings {
  id: 'main'
  disclaimerAccepted: boolean
  theme: 'dark' | 'light'
  profile: HeartProfile
  setup: SetupAnswers | null
  program: ProgramPlan | null
  /** "günIndex-slotIndex" → exerciseId */
  swaps: Record<string, string>
  /** Sıradaki antrenman gününün indeksi */
  nextDayIndex: number
  /** Semptom bildirildiyse bir sonraki antrenman azaltılır */
  symptomFlag: { date: string; symptoms: Symptom[] } | null
  /** v2: kullanıcının kendi yazdığı plan */
  plan: Plan | null
  level: Level
  bodyGoal: BodyGoal
  bodyWeight: number
}

// ───────────── Haftalık takip (v2) ─────────────

export type Level = 'baslangic' | 'orta' | 'ileri'
export type BodyGoal = 'kas' | 'kilo' | 'koru'

export interface PlanExercise {
  id: string
  name: string
  /** Kütüphanedeki hareketle eşleşiyorsa id (güvenlik notları için) */
  libraryId?: string
  bodyPart: BodyPart
  sets: number
  repMin: number
  repMax: number
  /** Ağırlıksız (vücut ağırlığı / lastik / kardiyo) */
  bodyweight?: boolean
  note?: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Plan {
  days: PlanDay[]
}

export interface LogSet {
  weight: number
  reps: number
}

/** Bir hareketin bir haftadaki kaydı (hafta başına tek kayıt) */
export interface ExerciseLog {
  id?: number
  planExerciseId: string
  /** Haftanın pazartesi günü YYYY-MM-DD */
  week: string
  date: string
  sets: LogSet[]
  /** En zor setin RPE'si */
  rpe: number | null
  note?: string
}

export interface WeekNote {
  week: string
  feeling?: number
  symptoms: Symptom[]
  note?: string
}
