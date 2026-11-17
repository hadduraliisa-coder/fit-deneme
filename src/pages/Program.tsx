import { useState } from 'react'
import { DayView } from '../components/DayView'
import { Badge, Button, Card, PageHeader, SectionTitle } from '../components/ui'
import { useApp } from '../lib/appContext'
import { EQUIPMENT_LABELS, GOAL_LABELS, resolveDay } from '../lib/program'
import { SEVERITY_LABELS } from '../lib/safety'

export function ProgramPage() {
  const { settings, sessionLimits, update, openSetup } = useApp()
  const program = settings.program!
  const nextIdx = settings.nextDayIndex % program.days.length
  const [open, setOpen] = useState<number | null>(nextIdx)
  const setup = program.setup

  return (
    <div>
      <PageHeader title="Program" subtitle="Haftalık split ve günlerin içeriği" />
      <Card>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="muted">{setup.daysPerWeek} gün/hafta</Badge>
          <Badge tone="muted">{setup.sessionMin} dk</Badge>
          <Badge tone="muted">{EQUIPMENT_LABELS[setup.equipment]}</Badge>
          <Badge tone="muted">{GOAL_LABELS[setup.goal]}</Badge>
          <Badge tone="warn">Kalp profili: {SEVERITY_LABELS[settings.profile.severity]}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tekrar {sessionLimits.repMin}–{sessionLimits.repMax} · RPE {sessionLimits.targetRpe[0]}–{sessionLimits.targetRpe[1]} ·
          tükenişe kadar set ve 1RM testi yok.
        </p>
        <Button variant="secondary" className="mt-3 w-full" onClick={openSetup}>
          Programı yeniden oluştur
        </Button>
      </Card>

      <SectionTitle>Günler</SectionTitle>
      <div className="space-y-2">
        {program.days.map((d, i) => {
          const day = resolveDay(program, i, settings.swaps, sessionLimits)
          const isNext = i === nextIdx
          return (
            <Card key={i} className={isNext ? 'border-accent/60' : ''}>
              <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span>
                  <span className="block text-xs text-muted">Gün {i + 1}</span>
                  <span className="block text-lg font-bold">{d.name}</span>
                  <span className="block text-sm text-muted">{day.slots.length} hareket{day.cardio ? ` + ${day.cardio.minutes} dk kardiyo` : ''}</span>
                </span>
                <span className="flex items-center gap-2">
                  {isNext && <Badge>Sıradaki</Badge>}
                  <span className="text-xl text-muted">{open === i ? '▾' : '▸'}</span>
                </span>
              </button>
              {open === i && (
                <div className="mt-3">
                  <DayView day={day} showSuggestions={isNext} />
                  {!isNext && (
                    <Button variant="secondary" className="mt-3 w-full" onClick={() => update({ nextDayIndex: i })}>
                      Bu günü sıradaki yap
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
