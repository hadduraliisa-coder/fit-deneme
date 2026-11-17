import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, PageHeader, SectionTitle, Stepper } from '../components/ui'
import { BODY_GOAL_LABELS, bodyWeightAdvice, weeklyAverages } from '../lib/advice'
import { useApp } from '../lib/appContext'
import { db } from '../lib/db'
import { addDays, longDate, shortDate, todayStr, weekStart } from '../lib/dates'
import type { BodyLog } from '../lib/types'
import { weekLabel } from '../lib/weekly'

const axis = { stroke: 'var(--app-muted)', fontSize: 11 }
const tooltipStyle = {
  contentStyle: { background: 'var(--app-card)', border: '1px solid var(--app-line)', borderRadius: 12, color: 'var(--app-fg)' },
  labelStyle: { color: 'var(--app-muted)' },
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

function healthWarnings(b: BodyLog) {
  const w: string[] = []
  if (b.systolic && b.systolic >= 140) w.push('Tansiyon yüksek')
  if (b.diastolic && b.diastolic >= 90) w.push('Küçük tansiyon yüksek')
  if (b.systolic && b.systolic < 90) w.push('Tansiyon düşük')
  if (b.restingHr && b.restingHr > 100) w.push('Dinlenik nabız yüksek')
  if (b.restingHr && b.restingHr < 50) w.push('Dinlenik nabız düşük')
  return w
}

const fk = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`

export function BodyPage() {
  const { bodyLogs, settings, update } = useApp()
  const last = [...bodyLogs].reverse().find((b) => b.weight != null)
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState<number | null>(last?.weight ?? settings.bodyWeight)
  const [waist, setWaist] = useState<number | null>(null)
  const [hr, setHr] = useState<number | null>(null)
  const [sys, setSys] = useState<number | null>(null)
  const [dia, setDia] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const avgs = weeklyAverages(bodyLogs, weekStart)
  const advice = bodyWeightAdvice(avgs, settings.bodyGoal, bodyLogs)
  const chart = avgs.slice(-16).map((a) => ({ label: shortDate(a.week), kilo: a.avg }))

  const save = async () => {
    await db.bodyLogs.add({ date, weight, waist, restingHr: hr, systolic: sys, diastolic: sys != null ? (dia ?? 80) : null })
    if (weight != null && date >= (last?.date ?? '')) await update({ bodyWeight: weight })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const toneBox =
    advice.status === 'uygun' ? 'bg-accent/10' : advice.status === 'ters' ? 'bg-danger/10' : advice.status === 'veri-yok' ? 'bg-card2' : 'bg-warn/10'

  return (
    <div>
      <PageHeader title="Vücut" subtitle={`Hedef: ${BODY_GOAL_LABELS[settings.bodyGoal]}`} />

      {advice.alert && (
        <Card className="mb-3 border-danger/50 bg-danger/10">
          <p className="font-bold text-danger">❤️ Ani kilo artışı</p>
          <p className="mt-1 text-sm">{advice.alert}</p>
        </Card>
      )}

      <Card className={toneBox}>
        <p className="mb-1 font-bold">💡 Tavsiye</p>
        {advice.weeklyKg != null && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge tone="muted">Haftalık: {fk(advice.weeklyKg)}</Badge>
            <Badge tone="muted">%{advice.weeklyPct?.toLocaleString('tr-TR')}</Badge>
            {advice.targetKg && (
              <Badge>
                Hedef: {fk(advice.targetKg[0])} … {fk(advice.targetKg[1])}
              </Badge>
            )}
          </div>
        )}
        <p className="text-sm">{advice.message}</p>
      </Card>

      <SectionTitle>Haftalık ortalama kilo</SectionTitle>
      <Card>
        {chart.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Henüz tartı kaydı yok.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axis} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} {...axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, 'Haftalık ortalama']} />
                <Line type="monotone" dataKey="kilo" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {avgs.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 text-left">Hafta</th>
                <th className="text-right">Ortalama</th>
                <th className="text-right">Değişim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {avgs
                .slice()
                .reverse()
                .slice(0, 12)
                .map((a, i, arr) => {
                  const prev = arr[i + 1]
                  const d = prev ? Math.round((a.avg - prev.avg) * 100) / 100 : null
                  return (
                    <tr key={a.week}>
                      <td className="py-2">{weekLabel(a.week)}</td>
                      <td className="py-2 text-right">
                        {a.avg.toLocaleString('tr-TR')} kg <span className="text-xs text-muted">({a.count} tartı)</span>
                      </td>
                      <td className={`py-2 text-right ${d == null || d === 0 ? 'text-muted' : 'font-semibold'}`}>{d == null ? '—' : fk(d)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </Card>

      <SectionTitle>Yeni kayıt</SectionTitle>
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
        <OptionalStepper label="Vücut ağırlığı" unit="kg" value={weight} onChange={setWeight} step={0.1} def={settings.bodyWeight} min={30} max={250} decimals={1} />
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
        <p className="text-xs text-muted">İpucu: Haftada 2–3 kez, sabah tuvaletten sonra aç karnına tartıl. Haftalık ortalama günlük dalgalanmayı yok eder.</p>
      </Card>

      <SectionTitle>Son kayıtlar</SectionTitle>
      {bodyLogs.length === 0 && <p className="py-4 text-center text-sm text-muted">Henüz kayıt yok.</p>}
      <div className="space-y-2">
        {bodyLogs
          .slice()
          .reverse()
          .slice(0, 30)
          .map((b) => {
            const w = healthWarnings(b)
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
