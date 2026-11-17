import { getExercise } from '../data/exercises'
import { useApp } from '../lib/appContext'
import { swapOptions } from '../lib/program'
import { Badge, Modal } from './ui'

export function SwapSheet({
  exerciseId,
  open,
  onClose,
  onPick,
  defaultId,
}: {
  exerciseId: string
  open: boolean
  onClose: () => void
  onPick: (id: string) => void
  defaultId?: string
}) {
  const { settings, sessionLimits } = useApp()
  const equipment = settings.setup?.equipment ?? 'salon'
  const opts = swapOptions(exerciseId, sessionLimits, equipment)
  const cur = getExercise(exerciseId)
  return (
    <Modal open={open} onClose={onClose} title="Hareketi değiştir">
      <p className="mb-3 text-sm text-muted">
        {cur?.nameTr} yerine aynı bölgedeki, kalp profiline ve ekipmanına uygun alternatifler:
      </p>
      {opts.length === 0 && <p className="text-sm">Bu bölgede başka güvenli alternatif yok.</p>}
      <ul className="space-y-2">
        {opts.map((o) => (
          <li key={o.id}>
            <button
              className="w-full rounded-xl border border-line bg-card2 p-3 text-left active:scale-[0.99]"
              onClick={() => {
                onPick(o.id)
                onClose()
              }}
            >
              <span className="block font-semibold">
                {o.nameTr} <span className="font-normal text-muted">({o.nameEn})</span>
              </span>
              <span className="mt-1 flex flex-wrap gap-1">
                {o.isBest && <Badge>★ En iyi seçim</Badge>}
                {o.id === defaultId && <Badge tone="muted">Programdaki</Badge>}
                <Badge tone="muted">{o.equipmentText}</Badge>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
