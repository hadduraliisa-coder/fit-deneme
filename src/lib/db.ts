import Dexie, { type Table } from 'dexie'
import { DEFAULT_PROFILE } from './safety'
import type { AppSettings, BodyLog, ExerciseLog, WeekNote, Workout } from './types'

export class FitDB extends Dexie {
  settings!: Table<AppSettings, string>
  workouts!: Table<Workout, number>
  bodyLogs!: Table<BodyLog, number>
  exerciseLogs!: Table<ExerciseLog, number>
  weekNotes!: Table<WeekNote, string>

  constructor() {
    super('fit-deneme')
    this.version(1).stores({
      settings: 'id',
      workouts: '++id, date, finishedAt, dayIndex',
      bodyLogs: '++id, date',
    })
    // v2: haftalık takip
    this.version(2).stores({
      exerciseLogs: '++id, &[planExerciseId+week], week, planExerciseId',
      weekNotes: 'week',
    })
  }
}

export const db = new FitDB()

export function defaultSettings(): AppSettings {
  return {
    id: 'main',
    disclaimerAccepted: false,
    theme: 'dark',
    profile: { ...DEFAULT_PROFILE },
    setup: null,
    program: null,
    swaps: {},
    nextDayIndex: 0,
    symptomFlag: null,
    plan: null,
    level: 'baslangic',
    bodyGoal: 'kas',
    bodyWeight: 75,
  }
}

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('main')
  if (s) return { ...defaultSettings(), ...s }
  const d = defaultSettings()
  await db.settings.put(d)
  return d
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const cur = await getSettings()
  await db.settings.put({ ...cur, ...patch, id: 'main' })
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', [db.settings, db.workouts, db.bodyLogs, db.exerciseLogs, db.weekNotes], async () => {
    await db.settings.clear()
    await db.workouts.clear()
    await db.bodyLogs.clear()
    await db.exerciseLogs.clear()
    await db.weekNotes.clear()
  })
}
