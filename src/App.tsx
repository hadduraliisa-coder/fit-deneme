import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Ctx, type AppCtx, type Tab } from './lib/appContext'
import { db, defaultSettings, getSettings, updateSettings } from './lib/db'
import { getLimits } from './lib/safety'
import type { AppSettings } from './lib/types'
import { Disclaimer } from './pages/Disclaimer'
import { PlanPage } from './pages/Plan'
import { SettingsPage } from './pages/Settings'
import { SetupPage } from './pages/Setup'
import { WeekPage } from './pages/Week'

const ProgressPage = lazy(() => import('./pages/Progress').then((m) => ({ default: m.ProgressPage })))
const BodyPage = lazy(() => import('./pages/Body').then((m) => ({ default: m.BodyPage })))

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'week', label: 'Bu Hafta', icon: '🗓️' },
  { id: 'plan', label: 'Planım', icon: '📝' },
  { id: 'progress', label: 'İlerleme', icon: '📈' },
  { id: 'body', label: 'Vücut', icon: '⚖️' },
  { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
]

const Loading = () => <p className="p-6 text-center text-muted">Yükleniyor…</p>

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void getSettings().then(() => setReady(true))
  }, [])

  const settings = useLiveQuery(() => db.settings.get('main'), [])
  const exerciseLogs = useLiveQuery(() => db.exerciseLogs.toArray(), []) ?? []
  const weekNotes = useLiveQuery(() => db.weekNotes.toArray(), []) ?? []
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray(), []) ?? []

  const [tab, setTab] = useState<Tab>('week')
  const [setupOpen, setSetupOpen] = useState(false)

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
      exerciseLogs,
      weekNotes,
      bodyLogs,
      update,
      setTab: (t) => {
        setSetupOpen(false)
        setTab(t)
        window.scrollTo(0, 0)
      },
      openSetup: () => {
        setSetupOpen(true)
        window.scrollTo(0, 0)
      },
    }
  }, [settings, exerciseLogs, weekNotes, bodyLogs, update])

  if (!ready || !ctx) return <div className="flex min-h-screen items-center justify-center text-muted">Yükleniyor…</div>

  if (!ctx.settings.disclaimerAccepted) {
    return <Disclaimer onAccept={() => update({ disclaimerAccepted: true })} />
  }

  if (!ctx.settings.plan || setupOpen) {
    return (
      <Ctx.Provider value={ctx}>
        <SetupPage
          onDone={() => {
            setSetupOpen(false)
            setTab('plan')
          }}
          onCancel={ctx.settings.plan ? () => setSetupOpen(false) : undefined}
        />
      </Ctx.Provider>
    )
  }

  return (
    <Ctx.Provider value={ctx}>
      <main className="mx-auto min-h-screen max-w-lg px-3 pb-28">
        {tab === 'week' && <WeekPage />}
        {tab === 'plan' && <PlanPage />}
        {tab === 'progress' && (
          <Suspense fallback={<Loading />}>
            <ProgressPage />
          </Suspense>
        )}
        {tab === 'body' && (
          <Suspense fallback={<Loading />}>
            <BodyPage />
          </Suspense>
        )}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id
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
