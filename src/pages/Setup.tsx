import { useState } from 'react'
import { Button, Card, Chip, PageHeader, SectionTitle, Stepper } from '../components/ui'
import { useApp } from '../lib/appContext'
import { EQUIPMENT_LABELS, GOAL_LABELS, generateProgram } from '../lib/program'
import { SEVERITY_LABELS } from '../lib/safety'
import type { Equipment, Goal, SetupAnswers, Severity } from '../lib/types'

const DAYS: SetupAnswers['daysPerWeek'][] = [2, 3, 4, 5]
const MINS: SetupAnswers['sessionMin'][] = [30, 45, 60, 75]
const SPLIT_TEXT: Record<SetupAnswers['daysPerWeek'], string> = {
  2: '2 gün Tüm Vücut (A/B)',
  3: '3 gün Tüm Vücut (A/B/C)',
  4: '4 gün Üst/Alt (Upper/Lower)',
  5: '5 gün Üst/Alt + Kardiyo/Core',
}

export function SetupPage({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { settings, update } = useApp()
  const init = settings.setup
  const [days, setDays] = useState<SetupAnswers['daysPerWeek']>(init?.daysPerWeek ?? 3)
  const [mins, setMins] = useState<SetupAnswers['sessionMin']>(init?.sessionMin ?? 45)
  const [equipment, setEquipment] = useState<Equipment>(init?.equipment ?? 'salon')
  const [goal, setGoal] = useState<Goal>(init?.goal ?? 'saglik')
  const [bw, setBw] = useState<number>(init?.bodyWeight ?? 75)
  const [severity, setSeverity] = useState<Severity>(settings.profile.severity)

  const save = async () => {
    const setup: SetupAnswers = { daysPerWeek: days, sessionMin: mins, equipment, goal, bodyWeight: bw }
    const profile = { ...settings.profile, severity }
    const program = generateProgram(setup, profile)
    await update({ setup, profile, program, swaps: {}, nextDayIndex: 0 })
    onDone()
  }

  return (
    <main className="mx-auto max-w-lg px-3 pb-10">
      <PageHeader title={init ? 'Programı yeniden oluştur' : 'Hızlı kurulum'} subtitle="Birkaç soruyla sana uygun haftalık programı hazırlayalım." />

      <SectionTitle>Haftada kaç gün?</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {DAYS.map((d) => (
          <Chip key={d} active={days === d} onClick={() => setDays(d)}>
            {d} gün
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-sm text-muted">{SPLIT_TEXT[days]}</p>

      <SectionTitle>Seans süresi</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {MINS.map((m) => (
          <Chip key={m} active={mins === m} onClick={() => setMins(m)}>
            {m} dk
          </Chip>
        ))}
      </div>

      <SectionTitle>Ekipman</SectionTitle>
      <div className="grid gap-2">
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
          <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
            {EQUIPMENT_LABELS[e]}
          </Chip>
        ))}
      </div>

      <SectionTitle>Hedef</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
          <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
            {GOAL_LABELS[g]}
          </Chip>
        ))}
      </div>

      <SectionTitle>Vücut ağırlığı</SectionTitle>
      <Card>
        <Stepper value={bw} onChange={setBw} step={0.5} min={30} max={250} unit="kg" />
        <p className="mt-2 text-xs text-muted">Başlangıç ağırlık önerileri bu değere göre muhafazakâr hesaplanır.</p>
      </Card>

      <SectionTitle>Kalp profili – yetmezlik derecesi</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
          <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
            {SEVERITY_LABELS[s]}
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-sm text-muted">
        Hafif: RPE 6–7 · Orta: RPE ≤ 6, ağır compound yok · Ciddi: RPE ≤ 5, sadece makine/destekli. Ayarlardan değiştirebilirsin.
      </p>

      <div className="mt-8 grid gap-2">
        <Button onClick={save}>{init ? 'Yeni programı oluştur' : 'Programımı oluştur'}</Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
      </div>
    </main>
  )
}
