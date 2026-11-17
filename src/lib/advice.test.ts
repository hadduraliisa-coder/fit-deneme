import { describe, expect, it } from 'vitest'
import {
  MAX_SAFE_WEEKLY_PCT,
  bodyWeightAdvice,
  evaluateProgress,
  expectedWeeklyPct,
  fluidAlert,
  planExerciseWarning,
  weeklyAverages,
  weeklyTarget,
} from './advice'
import { weekStart } from './dates'
import { allPlanExercises, customExercise, templatePlan } from './plan'
import { DEFAULT_PROFILE, getLimits } from './safety'
import { getExercise } from '../data/exercises'
import type { ExerciseLog, PlanExercise, Severity } from './types'

const upper: PlanExercise = { id: 'u', name: 'Göğüs Presi', bodyPart: 'upper', sets: 3, repMin: 8, repMax: 12 }
const lower: PlanExercise = { id: 'l', name: 'Leg Press', bodyPart: 'lower', sets: 3, repMin: 8, repMax: 12, libraryId: 'leg-press' }
const log = (week: string, weight: number, reps = 10, rpe: number | null = 6, id = 'u'): ExerciseLog => ({
  planExerciseId: id,
  week,
  date: week,
  sets: [{ weight, reps }, { weight, reps }, { weight, reps }],
  rpe,
})

describe('beklenen haftalık artış', () => {
  it('kalp profili ağırlaştıkça beklenti düşer', () => {
    const h = expectedWeeklyPct('baslangic', 'lower', 'hafif')
    const o = expectedWeeklyPct('baslangic', 'lower', 'orta')
    const c = expectedWeeklyPct('baslangic', 'lower', 'ciddi')
    expect(o[1]).toBeLessThan(h[1])
    expect(c[1]).toBeLessThan(o[1])
  })

  it('hiçbir durumda güvenli üst sınırı aşmaz; deneyim arttıkça yavaşlar', () => {
    for (const lvl of ['baslangic', 'orta', 'ileri'] as const)
      for (const sev of ['hafif', 'orta', 'ciddi'] as Severity[])
        for (const bp of ['upper', 'lower'] as const) expect(expectedWeeklyPct(lvl, bp, sev)[1]).toBeLessThanOrEqual(MAX_SAFE_WEEKLY_PCT)
    expect(expectedWeeklyPct('ileri', 'upper', 'hafif')[1]).toBeLessThan(expectedWeeklyPct('baslangic', 'upper', 'hafif')[0])
  })
})

describe('ilerleme değerlendirmesi', () => {
  it('tek kayıtla değerlendirme yapmaz', () => {
    expect(evaluateProgress([log('2026-11-02', 30)], upper, 'baslangic', 'hafif').status).toBe('veri-yok')
  })

  it('beklenen aralıktaki artışı "uygun" bulur ve beklenen kiloyu verir', () => {
    // 4 haftada 30 → 32,5 ≈ %2/hafta (başlangıç üst vücut %1,5–3)
    const e = evaluateProgress([log('2026-10-12', 30), log('2026-11-09', 32.5)], upper, 'baslangic', 'hafif')
    expect(e.status).toBe('uygun')
    expect(e.weeks).toBe(4)
    expect(e.expectedNow![0]).toBeGreaterThan(30)
    expect(e.message).toMatch(/olması beklenirdi/)
  })

  it('artış yoksa "geride"', () => {
    expect(evaluateProgress([log('2026-10-12', 30), log('2026-11-09', 30)], upper, 'baslangic', 'hafif').status).toBe('geride')
  })

  it('çok hızlı artışta uyarır', () => {
    expect(evaluateProgress([log('2026-11-02', 30), log('2026-11-09', 40)], upper, 'baslangic', 'hafif').status).toBe('cok-hizli')
  })

  it('ağırlıksız harekette kilo kıyaslaması yapmaz', () => {
    const e = evaluateProgress([log('2026-11-02', 0), log('2026-11-09', 0)], { ...upper, bodyweight: true }, 'orta', 'hafif')
    expect(e.status).toBe('veri-yok')
  })
})

describe('haftalık hedef (bu hafta ne kaldırayım)', () => {
  const hafif = getLimits(DEFAULT_PROFILE)
  it('geçen hafta üst sınıra RPE ≤ 6 ile ulaşıldıysa artırır', () => {
    const t = weeklyTarget(lower, log('2026-11-02', 60, 12, 6, 'l'), hafif, 80)
    expect(t.action).toBe('increase')
    expect(t.weight).toBeGreaterThan(60)
    expect(t.weight - 60).toBeLessThanOrEqual(5)
  })
  it('RPE limitin üstündeyse düşürür', () => {
    expect(weeklyTarget(upper, log('2026-11-02', 30, 10, 8), hafif, 80).action).toBe('decrease')
  })
  it('profil değişince aynı kayıt için artış yerine sabit kalır', () => {
    const orta = getLimits({ ...DEFAULT_PROFILE, severity: 'orta' })
    expect(weeklyTarget(upper, log('2026-11-02', 30, 12, 6), hafif, 80).action).toBe('increase')
    expect(weeklyTarget(upper, log('2026-11-02', 30, 12, 6), orta, 80).action).toBe('keep')
  })
  it('RPE girilmediyse artış önermez', () => {
    expect(weeklyTarget(upper, log('2026-11-02', 30, 12, null), hafif, 80).action).toBe('keep')
  })
})

describe('plan güvenlik uyarıları', () => {
  it('düşük tekrar aralığında uyarır', () => {
    expect(planExerciseWarning({ ...upper, repMin: 3, repMax: 5 }, getLimits(DEFAULT_PROFILE))).toMatch(/en az 8/)
  })
  it('ağır compound orta profilde önerilmez', () => {
    const sq: PlanExercise = { ...lower, libraryId: 'back-squat', name: 'Halter Squat' }
    expect(planExerciseWarning(sq, getLimits({ ...DEFAULT_PROFILE, severity: 'orta' }))).toMatch(/önerilmiyor/)
  })
  it('kütüphane dışı riskli isimlerde uyarır', () => {
    expect(planExerciseWarning(customExercise('Amuda kalkış şınavı'), getLimits(DEFAULT_PROFILE))).toBeTruthy()
    expect(planExerciseWarning(customExercise('Kablo curl'), getLimits(DEFAULT_PROFILE))).toBeNull()
  })
  it('hazır şablon her profil için güvenli hareketlerden oluşur', () => {
    for (const sev of ['hafif', 'orta', 'ciddi'] as Severity[]) {
      const prof = { ...DEFAULT_PROFILE, severity: sev }
      const limits = getLimits(prof)
      for (const d of [2, 3, 4, 5] as const) {
        const plan = templatePlan(d, 'salon', prof)
        expect(plan.days).toHaveLength(d)
        for (const ex of allPlanExercises(plan)) {
          const lib = getExercise(ex.libraryId!)!
          if (sev !== 'hafif') expect(lib.heavyCompound).toBe(false)
          if (sev === 'ciddi') expect(lib.supported).toBe(true)
          expect(ex.repMin).toBeGreaterThanOrEqual(8)
          expect(planExerciseWarning(ex, limits) ?? '').not.toMatch(/önerilmiyor|önerilir/)
        }
      }
    }
  })
})

describe('vücut ağırlığı tavsiyesi', () => {
  const entries = (vals: [string, number][]) => vals.map(([date, weight]) => ({ date, weight }))
  it('haftalık ortalamaları hesaplar', () => {
    const avgs = weeklyAverages(entries([['2026-11-02', 80], ['2026-11-04', 81], ['2026-11-10', 81]]), weekStart)
    expect(avgs).toEqual([
      { week: '2026-11-02', avg: 80.5, count: 2 },
      { week: '2026-11-09', avg: 81, count: 1 },
    ])
  })
  it('kas hedefinde haftada %0,25–0,5 artış uygundur', () => {
    const e = entries([['2026-10-12', 80], ['2026-11-09', 81.2]]) // 4 haftada +1,2 kg ≈ %0,375/hafta
    const a = bodyWeightAdvice(weeklyAverages(e, weekStart), 'kas', e)
    expect(a.status).toBe('uygun')
    expect(a.targetKg![0]).toBeCloseTo(0.2, 1)
  })
  it('kilo verme hedefinde kilo alınıyorsa "ters" der', () => {
    const e = entries([['2026-10-12', 80], ['2026-11-09', 81]])
    expect(bodyWeightAdvice(weeklyAverages(e, weekStart), 'kilo', e).status).toBe('ters')
  })
  it('ani kilo artışında sıvı birikimi uyarısı verir', () => {
    expect(fluidAlert(entries([['2026-11-08', 80], ['2026-11-09', 81.2]]))).toMatch(/sıvı birikimi/)
    expect(fluidAlert(entries([['2026-11-02', 80], ['2026-11-07', 82.5]]))).toMatch(/sıvı birikimi/)
    expect(fluidAlert(entries([['2026-11-02', 80], ['2026-11-09', 80.4]]))).toBeNull()
  })
})
