import { createContext, useContext } from 'react'
import type { RestState } from '../components/RestTimer'
import type { AppSettings, BodyLog, Limits, Workout } from './types'

export type Tab = 'today' | 'program' | 'exercises' | 'stats' | 'settings'

export interface AppCtx {
  settings: AppSettings
  /** Güncel profil limitleri (semptom bayrağı dahil değil) */
  limits: Limits
  /** Bir sonraki antrenmana uygulanacak limitler (semptom varsa azaltılmış) */
  sessionLimits: Limits
  workouts: Workout[]
  bodyLogs: BodyLog[]
  update: (patch: Partial<AppSettings>) => Promise<void>
  setTab: (t: Tab) => void
  openWorkout: () => void
  startRest: (r: RestState | null) => void
  openSetup: () => void
}

export const Ctx = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('AppCtx yok')
  return c
}
