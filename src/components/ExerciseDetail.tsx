import { REGION_LABELS } from '../data/exercises'
import type { Exercise } from '../lib/types'
import { Badge } from './ui'

export function ExerciseDetail({ ex, disabledReason }: { ex: Exercise; disabledReason?: string | null }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {ex.isBest && <Badge>★ En iyi seçim</Badge>}
        <Badge tone="muted">{REGION_LABELS[ex.region]}</Badge>
        {ex.supported && <Badge tone="muted">Destekli / makine</Badge>}
        {ex.heavyCompound && <Badge tone="warn">Ağır compound</Badge>}
        {ex.isometric && <Badge tone="warn">İzometrik</Badge>}
      </div>
      {disabledReason && <p className="rounded-lg bg-danger/10 p-2 text-danger">{disabledReason}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted">Hedef kas</dt>
        <dd>{ex.targetMuscles}</dd>
        <dt className="text-muted">Ekipman</dt>
        <dd>{ex.equipmentText}</dd>
      </dl>
      {ex.isBest && ex.bestReason && (
        <div className="rounded-lg bg-accent/10 p-3">
          <p className="font-semibold text-accent">Neden en iyi seçim?</p>
          <p>{ex.bestReason}</p>
        </div>
      )}
      <div>
        <p className="mb-1 font-semibold">Nasıl yapılır?</p>
        <ol className="list-decimal space-y-1 pl-5">
          {ex.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
      <div>
        <p className="mb-1 font-semibold">Sık yapılan hatalar</p>
        <ul className="list-disc space-y-1 pl-5">
          {ex.mistakes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg bg-card2 p-3">
        <p className="font-semibold">🫁 Nefes</p>
        <p>{ex.breathing}</p>
      </div>
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
        <p className="font-semibold">❤️ Kalp güvenliği</p>
        <p>{ex.heartNote}</p>
      </div>
    </div>
  )
}
