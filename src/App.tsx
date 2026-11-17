import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { RestTimer, type RestState } from './components/RestTimer'
import { Ctx, type AppCtx, type Tab } from './lib/appContext'
import { db, defaultSettings, getSettings, updateSettings } from './lib/db'
import { getLimits } from './lib/safety'
import type { AppSettings } from './lib/types'
import { Disclaimer } from './pages/Disclaimer'
import { ExercisesPage } from './pages/Exercises'
import { ProgramPage } from './pages/Program'
import { SettingsPage } from './pages/Settings'
import { SetupPage } from './pages/Setup'
import { TodayPage } from './pages/Today'
import { WorkoutPage } from './pages/Workout'

const StatsPage = lazy(() => import('./pages/Stats').then((m) => ({ default: m.StatsPage })))

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Bugün', icon: '🏋️' },
  { id: 'program', label: 'Program', icon: '📅' },
  { id: 'exercises', label: 'Hareketler', icon: '📖' },
  { id: 'stats', label: 'İstatistik', icon: '📈' },
  { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // İlk açılışta varsayılan ayar kaydını oluştur
    void getSettings().then(() => setReady(true))
  }, [])

  const settings = useLiveQuery(() => db.settings.get('main'), [])
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? []
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray(), []) ?? []

  const [tab, setTab] = useState<Tab>('today')
  const [view, setView] = useState<'tabs' | 'workout' | 'setup'>('tabs')
  const [rest, setRest] = useState<RestState | null>(null)

  const theme = settings?.theme ?? 'dark'
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#f4f6f8')
  }, [theme])

  const update = useCallback((patch: Partial<AppSettings>) => updateSettings(patch), [])

  const ctx: AppCtx | null = useMemo(() => {
    if (!settings) return null
    const s: AppSettings = { ...defaultSettings(), ...settings }
    return {
      settings: s,
      limits: getLimits(s.profile),
      sessionLimits: getLimits(s.profile, { reduced: !!s.symptomFlag }),
      workouts,
      bodyLogs,
      update,
      setTab: (t) => {
        setView('tabs')
        setTab(t)
        window.scrollTo(0, 0)
      },
      openWorkout: () => {
        setView('workout')
        window.scrollTo(0, 0)
      },
      startRest: setRest,
      openSetup: () => {
        setView('setup')
        window.scrollTo(0, 0)
      },
    }
  }, [settings, workouts, bodyLogs, update])

  if (!ready || !ctx) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Yükleniyor…</div>
  }

  if (!ctx.settings.disclaimerAccepted) {
    return <Disclaimer onAccept={() => update({ disclaimerAccepted: true })} />
  }

  if (!ctx.settings.program || view === 'setup') {
    return (
      <Ctx.Provider value={ctx}>
        <SetupPage onDone={() => { setView('tabs'); setTab('today') }} onCancel={ctx.settings.program ? () => setView('tabs') : undefined} />
      </Ctx.Provider>
    )
  }

  const hasActive = workouts.some((w) => w.finishedAt == null)

  return (
    <Ctx.Provider value={ctx}>
      <main className="mx-auto min-h-screen max-w-lg px-3 pb-44">
        {view === 'workout' && hasActive ? (
          <WorkoutPage onExit={() => setView('tabs')} />
        ) : (
          <>
            {tab === 'today' && <TodayPage />}
            {tab === 'program' && <ProgramPage />}
            {tab === 'exercises' && <ExercisesPage />}
            {tab === 'stats' && (
              <Suspense fallback={<p className="p-6 text-center text-muted">Yükleniyor…</p>}>
                <StatsPage />
              </Suspense>
            )}
            {tab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>
      <RestTimer rest={rest} onChange={setRest} />
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const active = view === 'tabs' && tab === t.id
            return (
              <li key={t.id}>
                <button
                  className={`flex h-[68px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => ctx.setTab(t.id)}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </Ctx.Provider>
  )
}
