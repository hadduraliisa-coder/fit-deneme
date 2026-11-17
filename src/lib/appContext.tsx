import { createContext, useContext } from 'react'
import type { AppSettings, BodyLog, ExerciseLog, Limits, WeekNote } from './types'

export type Tab = 'week' | 'plan' | 'progress' | 'body' | 'settings'

export interface AppCtx {
  settings: AppSettings
  /** Güncel profil limitleri */
  limits: Limits
  /** Bu haftanın hedeflerine uygulanacak limitler (semptom varsa bir kademe azaltılmış) */
  sessionLimits: Limits
  exerciseLogs: ExerciseLog[]
  weekNotes: WeekNote[]
  bodyLogs: BodyLog[]
  update: (patch: Partial<AppSettings>) => Promise<void>
  setTab: (t: Tab) => void
  openSetup: () => void
}

export const Ctx = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('AppCtx yok')
  return c
}
