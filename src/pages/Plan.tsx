import { useMemo, useState } from 'react'
import { ExerciseDetail } from '../components/ExerciseDetail'
import { Badge, Button, Card, Chip, Modal, PageHeader, Stepper, Toggle } from '../components/ui'
import { EXERCISES, REGIONS, REGION_LABELS, getExercise } from '../data/exercises'
import { planExerciseWarning } from '../lib/advice'
import { useApp } from '../lib/appContext'
import { customExercise, emptyDay, fromLibrary } from '../lib/plan'
import { disallowReason } from '../lib/safety'
import type { BodyPart, Plan, PlanDay, PlanExercise, Region } from '../lib/types'

const BODY_PART_LABELS: Record<BodyPart, string> = {
  upper: 'Üst vücut',
  lower: 'Alt vücut',
  core: 'Core',
  cardio: 'Kardiyo',
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = arr.slice()
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export function PlanPage() {
  const { settings, update, limits, openSetup } = useApp()
  const plan = settings.plan!
  const [addTo, setAddTo] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ dayId: string; ex: PlanExercise } | null>(null)
  const [delDay, setDelDay] = useState<PlanDay | null>(null)

  const save = (p: Plan) => update({ plan: p })
  const setDay = (dayId: string, fn: (d: PlanDay) => PlanDay) => save({ days: plan.days.map((d) => (d.id === dayId ? fn(d) : d)) })

  const totalEx = plan.days.reduce((a, d) => a + d.exercises.length, 0)

  return (
    <div>
      <PageHeader title="Planım" subtitle={`${plan.days.length} gün · ${totalEx} hareket. İstediğin gibi yaz ve düzenle.`} />

      <div className="space-y-3">
        {plan.days.map((day, di) => (
          <Card key={day.id}>
            <div className="mb-3 flex items-center gap-2">
              <input
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-lg font-bold"
                value={day.name}
                aria-label="Gün adı"
                onChange={(e) => setDay(day.id, (d) => ({ ...d, name: e.target.value }))}
              />
              <button className="h-12 w-11 rounded-xl bg-card2 text-lg" aria-label="Günü yukarı taşı" onClick={() => save({ days: move(plan.days, di, -1) })}>
                ↑
              </button>
              <button className="h-12 w-11 rounded-xl bg-card2 text-lg" aria-label="Günü aşağı taşı" onClick={() => save({ days: move(plan.days, di, 1) })}>
                ↓
              </button>
            </div>

            {day.exercises.length === 0 && <p className="mb-2 text-sm text-muted">Henüz hareket yok.</p>}
            <ul className="space-y-2">
              {day.exercises.map((ex, ei) => {
                const warn = planExerciseWarning(ex, limits)
                return (
                  <li key={ex.id} className="rounded-xl border border-line bg-card2/50 p-3">
                    <div className="flex items-start gap-2">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setEdit({ dayId: day.id, ex })}>
                        <p className="font-semibold leading-tight">{ex.name}</p>
                        <p className="text-sm text-muted">
                          {ex.sets} set × {ex.repMin}–{ex.repMax} {ex.bodyPart === 'cardio' ? 'dk' : 'tekrar'} · {BODY_PART_LABELS[ex.bodyPart]}
                          {ex.bodyweight ? ' · ağırlıksız' : ''}
                        </p>
                        {ex.note && <p className="text-xs italic text-muted">{ex.note}</p>}
                      </button>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button className="h-9 w-10 rounded-lg bg-card2" aria-label="Yukarı" onClick={() => setDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, -1) }))}>
                          ↑
                        </button>
                        <button className="h-9 w-10 rounded-lg bg-card2" aria-label="Aşağı" onClick={() => setDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, 1) }))}>
                          ↓
                        </button>
                      </div>
                    </div>
                    {warn && <p className="mt-2 rounded-lg bg-warn/10 p-2 text-xs text-warn">⚠️ {warn}</p>}
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Button variant="secondary" onClick={() => setAddTo(day.id)}>
                + Hareket ekle
              </Button>
              <Button variant="ghost" className="text-danger!" onClick={() => setDelDay(day)}>
                Günü sil
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button className="mt-4 w-full" onClick={() => save({ days: [...plan.days, emptyDay(`${plan.days.length + 1}. Gün`)] })}>
        + Gün ekle
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={openSetup}>
        Planı baştan kur (şablon / boş)
      </Button>

      <AddExerciseModal
        key={addTo ?? 'kapali'}
        open={!!addTo}
        onClose={() => setAddTo(null)}
        onAdd={(ex) => {
          if (addTo) void setDay(addTo, (d) => ({ ...d, exercises: [...d.exercises, ex] }))
          setAddTo(null)
          if (addTo && !ex.libraryId) setEdit({ dayId: addTo, ex })
        }}
        disabledReasonFor={(id) => disallowReason(getExercise(id)!, limits)}
      />

      {edit && (
        <EditExerciseModal
          ex={edit.ex}
          onClose={() => setEdit(null)}
          onSave={(ex) => {
            void setDay(edit.dayId, (d) => ({ ...d, exercises: d.exercises.map((x) => (x.id === ex.id ? ex : x)) }))
            setEdit(null)
          }}
          onDelete={() => {
            void setDay(edit.dayId, (d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== edit.ex.id) }))
            setEdit(null)
          }}
        />
      )}

      <Modal open={!!delDay} onClose={() => setDelDay(null)} title="Gün silinsin mi?">
        <p className="mb-4 text-sm">
          “{delDay?.name}” ve içindeki {delDay?.exercises.length ?? 0} hareket plandan çıkarılacak. Geçmiş kayıtlar silinmez ama artık bu haftalık listede görünmez.
        </p>
        <div className="grid gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (delDay) void save({ days: plan.days.filter((d) => d.id !== delDay.id) })
              setDelDay(null)
            }}
          >
            Sil
          </Button>
          <Button variant="secondary" onClick={() => setDelDay(null)}>
            Vazgeç
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function AddExerciseModal({
  open,
  onClose,
  onAdd,
  disabledReasonFor,
}: {
  open: boolean
  onClose: () => void
  onAdd: (ex: PlanExercise) => void
  disabledReasonFor: (id: string) => string | null
}) {
  const [mode, setMode] = useState<'lib' | 'custom'>('lib')
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [name, setName] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  const list = useMemo(() => {
    const qq = q.trim().toLocaleLowerCase('tr')
    return EXERCISES.filter(
      (e) =>
        (region === 'all' || e.region === region) &&
        (!qq || e.nameTr.toLocaleLowerCase('tr').includes(qq) || e.nameEn.toLowerCase().includes(qq)),
    )
  }, [q, region])
  const infoEx = info ? getExercise(info) : undefined

  return (
    <Modal open={open} onClose={onClose} title={infoEx ? `${infoEx.nameTr} (${infoEx.nameEn})` : 'Hareket ekle'}>
      {infoEx ? (
        <>
          <ExerciseDetail ex={infoEx} disabledReason={disabledReasonFor(infoEx.id)} />
          <div className="mt-4 grid gap-2">
            <Button onClick={() => { onAdd(fromLibrary(infoEx)); setInfo(null) }}>Plana ekle</Button>
            <Button variant="secondary" onClick={() => setInfo(null)}>
              ← Listeye dön
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Chip active={mode === 'lib'} onClick={() => setMode('lib')}>
              📖 Kütüphaneden
            </Chip>
            <Chip active={mode === 'custom'} onClick={() => setMode('custom')}>
              ✍️ Kendi hareketim
            </Chip>
          </div>
          {mode === 'custom' ? (
            <div>
              <input
                className="h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
                placeholder="Hareket adı (ör. Smith Machine Bench)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <Button
                className="mt-3 w-full"
                disabled={!name.trim()}
                onClick={() => {
                  onAdd(customExercise(name.trim()))
                  setName('')
                }}
              >
                Ekle ve ayarla
              </Button>
            </div>
          ) : (
            <>
              <input
                type="search"
                className="mb-2 h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
                placeholder="Ara (ör. press, curl)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <div className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1">
                <Chip active={region === 'all'} onClick={() => setRegion('all')}>
                  Tümü
                </Chip>
                {REGIONS.map((r) => (
                  <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                    {REGION_LABELS[r].split(' (')[0]}
                  </Chip>
                ))}
              </div>
              <ul className="space-y-2">
                {list.map((e) => {
                  const reason = disabledReasonFor(e.id)
                  return (
                    <li key={e.id} className="flex items-center gap-2 rounded-xl border border-line bg-card2 p-2">
                      <button className="min-w-0 flex-1 p-1 text-left" onClick={() => setInfo(e.id)}>
                        <span className="block font-semibold leading-tight">{e.nameTr}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          <Badge tone="muted">{REGION_LABELS[e.region].split(' (')[0]}</Badge>
                          {e.isBest && <Badge>★ En iyi</Badge>}
                          {reason && <Badge tone="danger">Profilinde önerilmez</Badge>}
                        </span>
                      </button>
                      <button
                        className="h-11 shrink-0 rounded-lg bg-accent px-3 font-bold text-accent-fg"
                        onClick={() => onAdd(fromLibrary(e))}
                        aria-label={`${e.nameTr} ekle`}
                      >
                        +
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </>
      )}
    </Modal>
  )
}

function EditExerciseModal({
  ex,
  onClose,
  onSave,
  onDelete,
}: {
  ex: PlanExercise
  onClose: () => void
  onSave: (ex: PlanExercise) => void
  onDelete: () => void
}) {
  const { limits } = useApp()
  const [d, setD] = useState<PlanExercise>(ex)
  const lib = d.libraryId ? getExercise(d.libraryId) : undefined
  const [showLib, setShowLib] = useState(false)
  const warn = planExerciseWarning(d, limits)
  const set = (patch: Partial<PlanExercise>) => setD((cur) => ({ ...cur, ...patch }))
  return (
    <Modal open onClose={onClose} title="Hareketi düzenle">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ad</span>
          <input className="h-12 w-full rounded-xl border border-line bg-bg px-3 text-base" value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div>
          <p className="mb-1 text-sm font-medium">Bölge (kilo artış adımı buna göre)</p>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(BODY_PART_LABELS) as BodyPart[]).map((b) => (
              <Chip key={b} active={d.bodyPart === b} onClick={() => set({ bodyPart: b, bodyweight: b === 'cardio' ? true : d.bodyweight })}>
                {BODY_PART_LABELS[b].replace(' vücut', '')}
              </Chip>
            ))}
          </div>
        </div>
        <Stepper label="Set sayısı" value={d.sets} onChange={(v) => set({ sets: Math.round(v) })} min={1} max={10} decimals={0} />
        <div className="grid grid-cols-1 gap-3">
          <Stepper
            label={d.bodyPart === 'cardio' ? 'En az süre (dk)' : 'En az tekrar'}
            value={d.repMin}
            onChange={(v) => set({ repMin: Math.round(v), repMax: Math.max(Math.round(v), d.repMax) })}
            min={1}
            max={60}
            decimals={0}
          />
          <Stepper
            label={d.bodyPart === 'cardio' ? 'En fazla süre (dk)' : 'En fazla tekrar'}
            value={d.repMax}
            onChange={(v) => set({ repMax: Math.round(v), repMin: Math.min(Math.round(v), d.repMin) })}
            min={1}
            max={60}
            decimals={0}
          />
        </div>
        <Toggle label="Ağırlıksız hareket" hint="Vücut ağırlığı, lastik veya kardiyo – kilo yerine tekrar/süre takip edilir." checked={!!d.bodyweight} onChange={(v) => set({ bodyweight: v })} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Not (isteğe bağlı)</span>
          <input className="h-12 w-full rounded-xl border border-line bg-bg px-3 text-base" value={d.note ?? ''} onChange={(e) => set({ note: e.target.value || undefined })} placeholder="ör. koltuk 4. kademe" />
        </label>
        {warn && <p className="rounded-lg bg-warn/10 p-2 text-sm text-warn">⚠️ {warn}</p>}
        {lib && (
          <div>
            <button className="text-sm font-semibold text-accent" onClick={() => setShowLib(!showLib)}>
              {showLib ? '▾' : '▸'} Nasıl yapılır, nefes ve kalp notu
            </button>
            {showLib && (
              <div className="mt-2">
                <ExerciseDetail ex={lib} />
              </div>
            )}
          </div>
        )}
        <div className="grid gap-2">
          <Button disabled={!d.name.trim()} onClick={() => onSave({ ...d, name: d.name.trim() })}>
            Kaydet
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Plandan çıkar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
