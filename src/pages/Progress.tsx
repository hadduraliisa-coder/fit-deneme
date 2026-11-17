import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, Modal, PageHeader, SectionTitle } from '../components/ui'
import { STATUS_LABELS, evaluateProgress, logVolume, topWeight, weeklyTarget, weeksBetween, type ProgressStatus } from '../lib/advice'
import { useApp } from '../lib/appContext'
import { addDays, shortDate, todayStr, weekStart } from '../lib/dates'
import { allPlanExercises } from '../lib/plan'
import type { ExerciseLog, PlanExercise } from '../lib/types'
import { kgText, logsFor, setsText } from '../lib/weekly'

const axis = { stroke: 'var(--app-muted)', fontSize: 11 }
const tooltipStyle = {
  contentStyle: { background: 'var(--app-card)', border: '1px solid var(--app-line)', borderRadius: 12, color: 'var(--app-fg)' },
  labelStyle: { color: 'var(--app-muted)' },
}

const STATUS_TONE: Record<ProgressStatus, 'accent' | 'warn' | 'danger' | 'muted'> = {
  'veri-yok': 'muted',
  geride: 'warn',
  uygun: 'accent',
  hizli: 'accent',
  'cok-hizli': 'danger',
}

function pct(a: number, b: number) {
  if (!a) return null
  return Math.round(((b - a) / a) * 1000) / 10
}

export function ProgressPage() {
  const { settings, exerciseLogs } = useApp()
  const exercises = allPlanExercises(settings.plan)
  const [detail, setDetail] = useState<PlanExercise | null>(null)
  const thisWeek = weekStart(todayStr())

  // Haftalık toplam hacim (son 12 hafta)
  const volume = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of exerciseLogs) map.set(l.week, (map.get(l.week) ?? 0) + logVolume(l))
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, v]) => ({ week, label: shortDate(week), volume: Math.round(v) }))
  }, [exerciseLogs])
  const volNow = volume.find((v) => v.week === thisWeek)?.volume ?? 0
  const volPrev = volume.find((v) => v.week === addDays(thisWeek, -7))?.volume ?? 0
  const volPct = pct(volPrev, volNow)

  // Haftalık seri: kayıt girilen ardışık haftalar
  const streak = useMemo(() => {
    const weeks = new Set(exerciseLogs.map((l) => l.week))
    let cur = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7)
    let n = 0
    while (weeks.has(cur)) {
      n++
      cur = addDays(cur, -7)
    }
    return n
  }, [exerciseLogs, thisWeek])

  return (
    <div>
      <PageHeader title="İlerleme" subtitle="Haftalık kilo artışların ve olması gereken aralık" />
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-3xl font-black">{streak}</p>
          <p className="text-xs text-muted">hafta seri 🔥</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-black">{volNow.toLocaleString('tr-TR')}</p>
          <p className="text-xs text-muted">bu hafta hacim (kg)</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-black ${volPct == null ? '' : volPct >= 0 ? 'text-ok' : 'text-warn'}`}>
            {volPct == null ? '—' : `${volPct > 0 ? '+' : ''}${volPct}%`}
          </p>
          <p className="text-xs text-muted">geçen haftaya göre</p>
        </Card>
      </div>

      <SectionTitle>Hareketler</SectionTitle>
      {exercises.length === 0 && <p className="p-4 text-center text-sm text-muted">Planında hareket yok.</p>}
      <div className="space-y-2">
        {exercises.map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} logs={logsFor(exerciseLogs, ex.id)} onOpen={() => setDetail(ex)} />
        ))}
      </div>

      <SectionTitle>Haftalık toplam hacim (set × tekrar × kg)</SectionTitle>
      <Card>
        {volume.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Henüz kayıt yok.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString('tr-TR')} kg`, 'Hacim']} />
                <Bar dataKey="volume" fill="var(--app-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <p className="mt-4 px-1 text-xs text-muted">
        Beklenen aralıklar ACSM ve AHA önerilerine dayalı yaklaşık değerlerdir ve kalp profiline göre düşürülür. Kaynaklar: Ayarlar → Kaynaklar.
      </p>

      {detail && <ExerciseDetailModal ex={detail} logs={logsFor(exerciseLogs, detail.id)} onClose={() => setDetail(null)} />}
    </div>
  )
}

function ExerciseRow({ ex, logs, onOpen }: { ex: PlanExercise; logs: ExerciseLog[]; onOpen: () => void }) {
  const { settings } = useApp()
  const ev = evaluateProgress(logs, ex, settings.level, settings.profile.severity)
  const last = logs[logs.length - 1]
  const prev = logs[logs.length - 2]
  const d = last && prev && !ex.bodyweight ? topWeight(last) - topWeight(prev) : null
  return (
    <button className="w-full rounded-2xl border border-line bg-card p-3 text-left active:scale-[0.99]" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{ex.name}</p>
          <p className="text-sm text-muted">{last ? setsText(last, ex.bodyweight) : 'Kayıt yok'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
          {d != null && d !== 0 && (
            <span className={`text-sm font-bold ${d > 0 ? 'text-ok' : 'text-warn'}`}>
              {d > 0 ? '+' : ''}
              {kgText(d)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function ExerciseDetailModal({ ex, logs, onClose }: { ex: PlanExercise; logs: ExerciseLog[]; onClose: () => void }) {
  const { settings, sessionLimits } = useApp()
  const ev = evaluateProgress(logs, ex, settings.level, settings.profile.severity)
  const next = weeklyTarget(ex, logs[logs.length - 1], sessionLimits, settings.bodyWeight)
  const first = logs.find((l) => topWeight(l) > 0)
  const data = logs.map((l) => {
    const w = topWeight(l)
    const weeks = first ? weeksBetween(first.week, l.week) : 0
    const f0 = first ? topWeight(first) : 0
    return {
      label: shortDate(l.week),
      kilo: ex.bodyweight ? Math.max(...l.sets.map((s) => s.reps)) : w,
      min: !ex.bodyweight && first ? Math.round(f0 * Math.pow(1 + ev.expectedPct[0] / 100, weeks) * 2) / 2 : undefined,
      max: !ex.bodyweight && first ? Math.round(f0 * Math.pow(1 + ev.expectedPct[1] / 100, weeks) * 2) / 2 : undefined,
    }
  })
  const fmtPct = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })

  return (
    <Modal open onClose={onClose} title={ex.name}>
      <div className="space-y-4 text-sm">
        <div className={`rounded-xl p-3 ${ev.status === 'cok-hizli' ? 'bg-danger/10' : ev.status === 'geride' ? 'bg-warn/10' : 'bg-accent/10'}`}>
          <p className="mb-1 font-bold">
            {STATUS_LABELS[ev.status]} · beklenen artış haftada %{fmtPct(ev.expectedPct[0])}–{fmtPct(ev.expectedPct[1])}
          </p>
          <p>{ev.message}</p>
        </div>
        <div className="rounded-xl bg-card2 p-3">
          <p className="font-semibold">🎯 Gelecek kayıt için öneri</p>
          <p>
            {!ex.bodyweight && next.weight > 0 ? `${kgText(next.weight)} × ` : ''}
            {ex.repMin}–{ex.repMax} tekrar. {next.reason}
          </p>
        </div>

        {data.length > 0 && (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line name={ex.bodyweight ? 'En çok tekrar' : 'Senin kilon'} type="monotone" dataKey="kilo" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4 }} />
                {!ex.bodyweight && (
                  <>
                    <Line name="Beklenen (alt)" type="monotone" dataKey="min" stroke="var(--app-muted)" strokeDasharray="5 5" dot={false} />
                    <Line name="Beklenen (üst)" type="monotone" dataKey="max" stroke="var(--app-warn)" strokeDasharray="5 5" dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <p className="mb-1 font-semibold">Haftalık kayıtlar</p>
          {logs.length === 0 && <p className="text-muted">Henüz kayıt yok.</p>}
          <table className="w-full text-left">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1">Hafta</th>
                <th>Kayıt</th>
                <th className="text-right">Değişim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs
                .slice()
                .reverse()
                .map((l, i, arr) => {
                  const prev = arr[i + 1]
                  const d = prev && !ex.bodyweight ? topWeight(l) - topWeight(prev) : null
                  const p = prev && !ex.bodyweight ? pct(topWeight(prev), topWeight(l)) : null
                  return (
                    <tr key={l.week}>
                      <td className="py-2 pr-2 whitespace-nowrap">{shortDate(l.week)}</td>
                      <td className="py-2">
                        {setsText(l, ex.bodyweight)}
                        {l.rpe ? <span className="text-muted"> · RPE {l.rpe}</span> : null}
                      </td>
                      <td className={`py-2 text-right whitespace-nowrap ${d == null || d === 0 ? 'text-muted' : d > 0 ? 'text-ok' : 'text-warn'}`}>
                        {d == null ? '—' : `${d > 0 ? '+' : ''}${kgText(d)}`}
                        {p != null && d !== 0 ? <span className="block text-xs">{p > 0 ? '+' : ''}{p}%</span> : null}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
