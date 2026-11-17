import { DayView } from '../components/DayView'
import { DurBanner } from '../components/DurBanner'
import { Button, Card, PageHeader, SectionTitle } from '../components/ui'
import { useApp } from '../lib/appContext'
import { db } from '../lib/db'
import { longDate, todayStr, weekStart } from '../lib/dates'
import { resolveDay } from '../lib/program'
import { intensityGuide } from '../lib/safety'
import { finished } from '../lib/stats'
import { createWorkout } from '../lib/workoutFlow'
import { SYMPTOM_LABELS } from './symptoms'

export function TodayPage() {
  const { settings, workouts, sessionLimits, openWorkout } = useApp()
  const program = settings.program!
  const nextIdx = settings.nextDayIndex % program.days.length
  const day = resolveDay(program, nextIdx, settings.swaps, sessionLimits)
  const active = workouts.find((w) => w.finishedAt == null)
  const today = todayStr()
  const thisWeek = finished(workouts).filter((w) => weekStart(w.date) === weekStart(today)).length
  const doneToday = finished(workouts).some((w) => w.date === today)

  const start = async () => {
    const w = createWorkout(day, workouts, sessionLimits, settings.setup?.bodyWeight ?? 75)
    await db.workouts.add(w)
    openWorkout()
  }

  return (
    <div>
      <PageHeader title="Bugün" subtitle={longDate(today)} />
      <DurBanner maxHr={settings.profile.maxHr} betaBlocker={settings.profile.betaBlocker} />

      {settings.symptomFlag && (
        <Card className="mt-3 border-warn/50 bg-warn/10">
          <p className="font-bold text-warn">⚠️ Son antrenmanda semptom bildirdin</p>
          <p className="mt-1 text-sm">
            {settings.symptomFlag.symptoms.map((s) => SYMPTOM_LABELS[s]).join(', ')}. Bu antrenmanın yoğunluğu bir kademe
            düşürüldü (RPE en fazla {sessionLimits.maxRpe}, ağırlıklar ~%10 hafif). Lütfen doktoruna danış; semptom devam
            ediyorsa antrenman yapma.
          </p>
        </Card>
      )}

      {active ? (
        <Card className="mt-4 border-accent/50">
          <p className="text-sm text-muted">Devam eden antrenman</p>
          <p className="text-lg font-bold">{active.dayName}</p>
          <Button className="mt-3 w-full" onClick={openWorkout}>
            Antrenmana devam et
          </Button>
        </Card>
      ) : (
        <>
          <SectionTitle right={<span className="text-sm text-muted">Bu hafta: {thisWeek}/{program.setup.daysPerWeek}</span>}>
            Sıradaki antrenman
          </SectionTitle>
          <Card className="mb-3">
            <p className="text-xl font-bold">{day.name}</p>
            <p className="text-sm text-muted">
              Gün {nextIdx + 1}/{program.days.length} · ~{program.setup.sessionMin} dk
              {doneToday ? ' · Bugün zaten bir antrenman yaptın, dinlenmek de antrenmanın parçası.' : ''}
            </p>
            <p className="mt-2 text-sm">{intensityGuide(settings.profile, sessionLimits)}</p>
            <Button className="mt-3 w-full text-lg" onClick={start}>
              ▶ Antrenmana başla
            </Button>
          </Card>
          <DayView day={day} />
          <p className="mt-3 px-1 text-xs text-muted">
            Bir günü kaçırırsan program kaymaz: her zaman sıradaki antrenman gösterilir.
          </p>
        </>
      )}
    </div>
  )
}
