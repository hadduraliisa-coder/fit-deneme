import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, Chip, Modal, PageHeader, SectionTitle, Stepper } from '../components/ui'
import { REGION_LABELS, getExercise } from '../data/exercises'
import { useApp } from '../lib/appContext'
import { db } from '../lib/db'
import { addDays, longDate, parseDate, shortDate, todayStr, weekStart } from '../lib/dates'
import { exerciseProgress, finished, personalRecords, setsPerRegion, weekStreak, weeklyVolume, workoutVolume } from '../lib/stats'
import type { BodyLog, Workout } from '../lib/types'
import { FEELINGS, SYMPTOM_LABELS } from './symptoms'

const axis = { stroke: 'var(--app-muted)', fontSize: 11 }
const tooltipStyle = {
  contentStyle: { background: 'var(--app-card)', border: '1px solid var(--app-line)', borderRadius: 12, color: 'var(--app-fg)' },
  labelStyle: { color: 'var(--app-muted)' },
}

type Seg = 'charts' | 'history' | 'body'

export function StatsPage() {
  const [seg, setSeg] = useState<Seg>('charts')
  return (
    <div>
      <PageHeader title="İstatistik" />
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Chip active={seg === 'charts'} onClick={() => setSeg('charts')}>
          Grafikler
        </Chip>
        <Chip active={seg === 'history'} onClick={() => setSeg('history')}>
          Geçmiş
        </Chip>
        <Chip active={seg === 'body'} onClick={() => setSeg('body')}>
          Vücut
        </Chip>
      </div>
      {seg === 'charts' && <Charts />}
      {seg === 'history' && <History />}
      {seg === 'body' && <Body />}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted">{text}</p>
}

function Charts() {
  const { workouts, bodyLogs } = useApp()
  const done = finished(workouts)
  const today = todayStr()
  const streak = weekStreak(workouts, today)
  const vol = weeklyVolume(workouts).slice(-12).map((v) => ({ ...v, label: shortDate(v.week) }))
  const thisWeek = weekStart(today)
  const perRegion = setsPerRegion(workouts, thisWeek)
    .filter((r) => r.region !== 'kardiyo')
    .map((r) => ({ name: REGION_LABELS[r.region].split(' (')[0], sets: r.sets }))
  const exIds = useMemo(() => {
    const ids = new Set<string>()
    for (const w of done) for (const e of w.entries) if (!getExercise(e.exerciseId)?.cardio) ids.add(e.exerciseId)
    return [...ids]
  }, [done])
  const [exId, setExId] = useState<string>('')
  const selected = exId || exIds[0] || ''
  const prog = selected ? exerciseProgress(workouts, selected).map((p) => ({ ...p, label: shortDate(p.date) })) : []
  const weights = bodyLogs.filter((b) => b.weight).map((b) => ({ label: shortDate(b.date), weight: b.weight }))

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-3xl font-black">{streak}</p>
          <p className="text-xs text-muted">hafta seri 🔥</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{done.length}</p>
          <p className="text-xs text-muted">antrenman</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{done.filter((w) => weekStart(w.date) === thisWeek).length}</p>
          <p className="text-xs text-muted">bu hafta</p>
        </Card>
      </div>

      <SectionTitle>Hareket bazında ağırlık ilerlemesi</SectionTitle>
      <Card>
        {exIds.length === 0 ? (
          <Empty text="Henüz kayıtlı set yok." />
        ) : (
          <>
            <select
              className="mb-3 h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
              value={selected}
              onChange={(e) => setExId(e.target.value)}
            >
              {exIds.map((id) => (
                <option key={id} value={id}>
                  {getExercise(id)?.nameTr ?? id}
                </option>
              ))}
            </select>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prog} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip {...tooltipStyle} formatter={(v, _n, p) => [`${v} kg × ${(p.payload as { reps: number }).reps}`, 'En ağır set']} />
                  <Line type="monotone" dataKey="weight" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      <SectionTitle>Haftalık toplam hacim (set × tekrar × kg)</SectionTitle>
      <Card>
        {vol.length === 0 ? (
          <Empty text="Veri yok." />
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vol} margin={{ left: -10, right: 8, top: 8 }}>
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

      <SectionTitle>Bu hafta kas grubu başına set</SectionTitle>
      <Card>
        {perRegion.length === 0 ? (
          <Empty text="Bu hafta henüz set yok." />
        ) : (
          <div style={{ height: Math.max(120, perRegion.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perRegion} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" allowDecimals={false} {...axis} />
                <YAxis type="category" dataKey="name" width={90} {...axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Set']} />
                <Bar dataKey="sets" fill="var(--app-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <SectionTitle>Vücut ağırlığı</SectionTitle>
      <Card>
        {weights.length === 0 ? (
          <Empty text="Vücut sekmesinden ağırlık kaydı ekle." />
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weights} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} {...axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Ağırlık']} />
                <Line type="monotone" dataKey="weight" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  )
}

function Calendar({ workouts, month, onMonth, onPick }: { workouts: Workout[]; month: string; onMonth: (m: string) => void; onPick: (d: string) => void }) {
  const first = parseDate(month)
  const startDow = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const dates = new Set(workouts.map((w) => w.date))
  const cells: (string | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(todayStr(new Date(first.getFullYear(), first.getMonth(), d)))
  const title = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(first)
  const shift = (n: number) => onMonth(todayStr(new Date(first.getFullYear(), first.getMonth() + n, 1)))
  const today = todayStr()
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <button className="h-11 w-11 rounded-lg bg-card2 text-xl" onClick={() => shift(-1)} aria-label="Önceki ay">
          ‹
        </button>
        <p className="font-semibold capitalize">{title}</p>
        <button className="h-11 w-11 rounded-lg bg-card2 text-xl" onClick={() => shift(1)} aria-label="Sonraki ay">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) =>
          c ? (
            <button
              key={c}
              onClick={() => dates.has(c) && onPick(c)}
              className={`aspect-square rounded-lg text-sm ${
                dates.has(c) ? 'bg-accent font-bold text-accent-fg' : c === today ? 'border border-accent' : 'bg-card2'
              }`}
            >
              {parseDate(c).getDate()}
            </button>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
    </Card>
  )
}

function WorkoutSummary({ w }: { w: Workout }) {
  const feeling = FEELINGS.find((f) => f.v === w.feeling)
  const mins = w.finishedAt ? Math.round((w.finishedAt - w.startedAt) / 60000) : 0
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="muted">{mins} dk</Badge>
        <Badge tone="muted">Hacim {Math.round(workoutVolume(w)).toLocaleString('tr-TR')} kg</Badge>
        {w.cardioMinutes ? <Badge tone="muted">Kardiyo {w.cardioMinutes} dk</Badge> : null}
        {feeling && <Badge tone="muted">{feeling.e} {feeling.t}</Badge>}
        {w.reduced && <Badge tone="warn">Hafifletilmiş</Badge>}
      </div>
      {w.symptoms && w.symptoms.length > 0 && (
        <p className="text-danger">Semptom: {w.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ')}</p>
      )}
      {w.note && <p className="italic text-muted">“{w.note}”</p>}
      <ul className="space-y-1">
        {w.entries.map((e, i) => {
          const done = e.sets.filter((s) => s.done)
          if (!done.length) return null
          return (
            <li key={i}>
              <span className="font-medium">{getExercise(e.exerciseId)?.nameTr ?? e.exerciseId}:</span>{' '}
              <span className="text-muted">
                {done
                  .map((s) => `${s.weight ? `${s.weight}kg×` : ''}${s.reps}${e.isometric ? 'sn' : ''}${s.rpe ? ` @${s.rpe}` : ''}`)
                  .join(', ')}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function History() {
  const { workouts } = useApp()
  const done = finished(workouts).slice().reverse()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return todayStr(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [picked, setPicked] = useState<string | null>(null)
  const [del, setDel] = useState<Workout | null>(null)
  const prs = personalRecords(workouts).sort((a, b) => (getExercise(a.exerciseId)?.nameTr ?? '').localeCompare(getExercise(b.exerciseId)?.nameTr ?? '', 'tr'))
  const pickedList = picked ? done.filter((w) => w.date === picked) : []

  return (
    <div>
      <Calendar workouts={done} month={month} onMonth={setMonth} onPick={setPicked} />

      <SectionTitle>Kişisel rekorlar (ağırlık × tekrar)</SectionTitle>
      <Card>
        {prs.length === 0 ? (
          <Empty text="Henüz rekor yok." />
        ) : (
          <ul className="divide-y divide-line">
            {prs.map((p) => (
              <li key={p.exerciseId} className="flex items-center justify-between py-2 text-sm">
                <span>{getExercise(p.exerciseId)?.nameTr}</span>
                <span className="font-bold">
                  {p.weight ? `${String(p.weight).replace('.', ',')} kg × ` : ''}
                  {p.reps}
                  <span className="ml-2 font-normal text-muted">{shortDate(p.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">1RM (tek tekrar maksimum) hesaplanmaz ve test edilmez.</p>
      </Card>

      <SectionTitle>Antrenman geçmişi</SectionTitle>
      {done.length === 0 && <Empty text="Henüz tamamlanmış antrenman yok." />}
      <div className="space-y-2">
        {done.map((w) => (
          <Card key={w.id}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-bold">{w.dayName}</p>
                <p className="text-xs text-muted">{longDate(w.date)}</p>
              </div>
              <button className="h-10 rounded-lg px-3 text-sm text-danger" onClick={() => setDel(w)}>
                Sil
              </button>
            </div>
            <WorkoutSummary w={w} />
          </Card>
        ))}
      </div>

      <Modal open={!!picked} onClose={() => setPicked(null)} title={picked ? longDate(picked) : ''}>
        <div className="space-y-4">
          {pickedList.map((w) => (
            <div key={w.id}>
              <p className="mb-1 font-bold">{w.dayName}</p>
              <WorkoutSummary w={w} />
            </div>
          ))}
        </div>
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Antrenman silinsin mi?">
        <p className="mb-4 text-sm">{del ? `${del.dayName} – ${longDate(del.date)}` : ''} kalıcı olarak silinecek.</p>
        <div className="grid gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (del?.id != null) await db.workouts.delete(del.id)
              setDel(null)
            }}
          >
            Sil
          </Button>
          <Button variant="secondary" onClick={() => setDel(null)}>
            Vazgeç
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function OptionalStepper({
  label,
  unit,
  value,
  onChange,
  step,
  def,
  min,
  max,
  decimals = 0,
}: {
  label: string
  unit: string
  value: number | null
  onChange: (v: number | null) => void
  step: number
  def: number
  min: number
  max: number
  decimals?: number
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button className="h-9 rounded-lg px-2 text-sm text-accent" onClick={() => onChange(value == null ? def : null)}>
          {value == null ? '+ Ekle' : 'Kaldır'}
        </button>
      </div>
      {value != null && <Stepper value={value} onChange={onChange} step={step} min={min} max={max} unit={unit} decimals={decimals} />}
    </div>
  )
}

function Body() {
  const { bodyLogs, settings } = useApp()
  const last = bodyLogs[bodyLogs.length - 1]
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState<number | null>(last?.weight ?? settings.setup?.bodyWeight ?? 75)
  const [waist, setWaist] = useState<number | null>(null)
  const [hr, setHr] = useState<number | null>(null)
  const [sys, setSys] = useState<number | null>(null)
  const [dia, setDia] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const log: BodyLog = { date, weight, waist, restingHr: hr, systolic: sys, diastolic: sys != null ? dia ?? 80 : null }
    await db.bodyLogs.add(log)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const warnings = (b: BodyLog) => {
    const w: string[] = []
    if (b.systolic && b.systolic >= 140) w.push('Tansiyon yüksek')
    if (b.diastolic && b.diastolic >= 90) w.push('Küçük tansiyon yüksek')
    if (b.systolic && b.systolic < 90) w.push('Tansiyon düşük')
    if (b.restingHr && b.restingHr > 100) w.push('Dinlenik nabız yüksek')
    if (b.restingHr && b.restingHr < 50) w.push('Dinlenik nabız düşük')
    return w
  }

  const recent = bodyLogs.slice().reverse().slice(0, 30)

  return (
    <div>
      <Card className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tarih</span>
          <input
            type="date"
            className="h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
            value={date}
            max={todayStr()}
            min={addDays(todayStr(), -3650)}
            onChange={(e) => setDate(e.target.value || todayStr())}
          />
        </label>
        <OptionalStepper label="Vücut ağırlığı" unit="kg" value={weight} onChange={setWeight} step={0.1} def={75} min={30} max={250} decimals={1} />
        <OptionalStepper label="Bel çevresi (opsiyonel)" unit="cm" value={waist} onChange={setWaist} step={0.5} def={90} min={40} max={200} decimals={1} />
        <OptionalStepper label="Dinlenik nabız (opsiyonel)" unit="atım/dk" value={hr} onChange={setHr} step={1} def={70} min={30} max={200} />
        <OptionalStepper
          label="Tansiyon – büyük (opsiyonel)"
          unit="mmHg"
          value={sys}
          onChange={(v) => {
            setSys(v)
            if (v != null && dia == null) setDia(80)
            if (v == null) setDia(null)
          }}
          step={1}
          def={120}
          min={60}
          max={250}
        />
        {sys != null && (
          <div>
            <span className="mb-1 block text-sm font-medium">Tansiyon – küçük</span>
            <Stepper value={dia ?? 80} onChange={setDia} step={1} min={30} max={150} unit="mmHg" decimals={0} />
          </div>
        )}
        <Button className="w-full" onClick={save} disabled={weight == null && waist == null && hr == null && sys == null}>
          {saved ? '✓ Kaydedildi' : 'Kaydet'}
        </Button>
      </Card>

      <SectionTitle>Kayıtlar</SectionTitle>
      {recent.length === 0 && <Empty text="Henüz kayıt yok." />}
      <div className="space-y-2">
        {recent.map((b) => {
          const w = warnings(b)
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between">
                <div className="text-sm">
                  <p className="font-semibold">{longDate(b.date)}</p>
                  <p className="text-muted">
                    {[
                      b.weight != null && `${String(b.weight).replace('.', ',')} kg`,
                      b.waist != null && `bel ${b.waist} cm`,
                      b.restingHr != null && `nabız ${b.restingHr}`,
                      b.systolic != null && `TA ${b.systolic}/${b.diastolic ?? '?'}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {w.length > 0 && <p className="mt-1 text-danger">⚠️ {w.join(', ')} – tekrar ölç, devam ederse doktoruna danış.</p>}
                </div>
                <button className="h-10 px-2 text-sm text-danger" onClick={() => b.id != null && db.bodyLogs.delete(b.id)}>
                  Sil
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
