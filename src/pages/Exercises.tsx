import { useMemo, useState } from 'react'
import { ExerciseDetail } from '../components/ExerciseDetail'
import { Badge, Card, Chip, PageHeader } from '../components/ui'
import { EXERCISES, REGIONS, REGION_LABELS } from '../data/exercises'
import { useApp } from '../lib/appContext'
import { EQUIPMENT_LABELS } from '../lib/program'
import { disallowReason } from '../lib/safety'
import type { Equipment, Region } from '../lib/types'

export function ExercisesPage() {
  const { settings, limits } = useApp()
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [equip, setEquip] = useState<Equipment | 'all'>(settings.setup?.equipment ?? 'all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const list = useMemo(() => {
    const qq = q.trim().toLocaleLowerCase('tr')
    return EXERCISES.filter(
      (e) =>
        (region === 'all' || e.region === region) &&
        (equip === 'all' || e.equipment.includes(equip)) &&
        (!qq || e.nameTr.toLocaleLowerCase('tr').includes(qq) || e.nameEn.toLowerCase().includes(qq)),
    ).sort((a, b) => REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) || Number(b.isBest) - Number(a.isBest))
  }, [region, equip, q])

  return (
    <div>
      <PageHeader title="Hareketler" subtitle={`${EXERCISES.length} hareket · her bölgede 1 en iyi seçim + alternatifler`} />
      <input
        type="search"
        placeholder="Ara (ör. squat, göğüs presi)"
        className="mb-3 h-12 w-full rounded-xl border border-line bg-card px-4 text-base"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto px-3 pb-1">
        <Chip active={region === 'all'} onClick={() => setRegion('all')}>
          Tümü
        </Chip>
        {REGIONS.map((r) => (
          <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
            {REGION_LABELS[r]}
          </Chip>
        ))}
      </div>
      <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1">
        <Chip active={equip === 'all'} onClick={() => setEquip('all')}>
          Tüm ekipman
        </Chip>
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
          <Chip key={e} active={equip === e} onClick={() => setEquip(e)}>
            {EQUIPMENT_LABELS[e]}
          </Chip>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((ex) => {
          const reason = disallowReason(ex, limits)
          const isOpen = open === ex.id
          return (
            <Card key={ex.id} className={reason ? 'opacity-70' : ''}>
              <button className="w-full text-left" onClick={() => setOpen(isOpen ? null : ex.id)} aria-expanded={isOpen}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">{REGION_LABELS[ex.region]}</p>
                    <p className="font-semibold leading-tight">
                      {ex.nameTr} <span className="font-normal text-muted">({ex.nameEn})</span>
                    </p>
                  </div>
                  <span className="text-xl text-muted">{isOpen ? '▾' : '▸'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ex.isBest && <Badge>★ En iyi seçim</Badge>}
                  {reason && <Badge tone="danger">Profilinde kapalı</Badge>}
                  {ex.equipment.map((e) => (
                    <Badge key={e} tone="muted">
                      {e === 'salon' ? 'Salon' : e === 'ev' ? 'Ev' : 'Dambıl'}
                    </Badge>
                  ))}
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 border-t border-line pt-3">
                  <ExerciseDetail ex={ex} disabledReason={reason} />
                </div>
              )}
            </Card>
          )
        })}
        {list.length === 0 && <p className="p-4 text-center text-muted">Sonuç yok.</p>}
      </div>
    </div>
  )
}
