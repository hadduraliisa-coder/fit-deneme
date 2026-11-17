import { useState } from 'react'
import { Button, Card, Chip, PageHeader, SectionTitle, Stepper } from '../components/ui'
import { BODY_GOAL_LABELS } from '../lib/advice'
import { useApp } from '../lib/appContext'
import { emptyPlan, templatePlan } from '../lib/plan'
import { EQUIPMENT_LABELS } from '../lib/program'
import { SEVERITY_LABELS } from '../lib/safety'
import type { BodyGoal, Equipment, Level, SetupAnswers, Severity } from '../lib/types'

export const LEVEL_LABELS: Record<Level, string> = {
  baslangic: 'Yeni başlıyorum (0–6 ay)',
  orta: 'Bir süredir çalışıyorum (6 ay–2 yıl)',
  ileri: 'Deneyimliyim (2+ yıl)',
}

export function SetupPage({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { settings, update } = useApp()
  const editing = !!settings.plan
  const [level, setLevel] = useState<Level>(settings.level)
  const [goal, setGoal] = useState<BodyGoal>(settings.bodyGoal)
  const [bw, setBw] = useState<number>(settings.bodyWeight)
  const [severity, setSeverity] = useState<Severity>(settings.profile.severity)
  const [start, setStart] = useState<'bos' | 'sablon'>('bos')
  const [days, setDays] = useState<SetupAnswers['daysPerWeek']>(3)
  const [equipment, setEquipment] = useState<Equipment>('salon')

  const save = async () => {
    const profile = { ...settings.profile, severity, hiit: severity === 'hafif' ? settings.profile.hiit : false }
    const plan = start === 'bos' ? emptyPlan() : templatePlan(days, equipment, profile)
    await update({ level, bodyGoal: goal, bodyWeight: bw, profile, plan })
    onDone()
  }

  return (
    <main className="mx-auto max-w-lg px-3 pb-10">
      <PageHeader
        title={editing ? 'Planı baştan kur' : 'Hoş geldin'}
        subtitle={editing ? 'Yeni bir plan oluşturulur. Geçmiş kayıtların silinmez.' : 'Birkaç bilgiyle başlayalım; planını sonra kendin yazacaksın.'}
      />

      <SectionTitle>Antrenman deneyimin</SectionTitle>
      <div className="grid gap-2">
        {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {LEVEL_LABELS[l]}
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-sm text-muted">Haftalık "ne kadar artmalıydı" hesabı buna göre yapılır.</p>

      <SectionTitle>Vücut ağırlığı hedefin</SectionTitle>
      <div className="grid gap-2">
        {(Object.keys(BODY_GOAL_LABELS) as BodyGoal[]).map((g) => (
          <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
            {BODY_GOAL_LABELS[g]}
          </Chip>
        ))}
      </div>

      <SectionTitle>Şu anki kilon</SectionTitle>
      <Card>
        <Stepper value={bw} onChange={setBw} step={0.5} min={30} max={250} unit="kg" />
      </Card>

      <SectionTitle>Kalp profili – yetmezlik derecesi</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
          <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
            {SEVERITY_LABELS[s]}
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-sm text-muted">Tavsiyeler bu profilin RPE ve hareket limitlerini aşmaz. Ayarlardan değiştirebilirsin.</p>

      <SectionTitle>Planın</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Chip active={start === 'bos'} onClick={() => setStart('bos')}>
          ✍️ Kendim yazacağım
        </Chip>
        <Chip active={start === 'sablon'} onClick={() => setStart('sablon')}>
          📋 Şablonla başla
        </Chip>
      </div>
      {start === 'sablon' && (
        <Card className="mt-3 space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">Haftada kaç gün?</p>
            <div className="grid grid-cols-4 gap-2">
              {([2, 3, 4, 5] as const).map((d) => (
                <Chip key={d} active={days === d} onClick={() => setDays(d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Ekipman</p>
            <div className="grid gap-2">
              {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
                <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
                  {EQUIPMENT_LABELS[e]}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">Şablon, kalp profiline uygun hareketlerle doldurulur; her şeyi sonra değiştirebilirsin.</p>
        </Card>
      )}

      <div className="mt-8 grid gap-2">
        <Button onClick={save}>{start === 'bos' ? 'Planımı yazmaya başla' : 'Şablonu oluştur'}</Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
      </div>
    </main>
  )
}
