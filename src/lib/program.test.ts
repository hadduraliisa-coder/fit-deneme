import { describe, expect, it } from 'vitest'
import { getExercise } from '../data/exercises'
import { generateProgram, resolveDay, slotMinutes, swapOptions, warmupMinutes, cooldownMinutes } from './program'
import { DEFAULT_PROFILE, getLimits, isExerciseAllowed } from './safety'
import type { Equipment, Goal, HeartProfile, ProgramPlan, Severity, SetupAnswers } from './types'

const severities: Severity[] = ['hafif', 'orta', 'ciddi']
const equipments: Equipment[] = ['salon', 'ev', 'dambil']
const goals: Goal[] = ['saglik', 'kas', 'kilo']
const dayOptions: SetupAnswers['daysPerWeek'][] = [2, 3, 4, 5]
const sessions: SetupAnswers['sessionMin'][] = [30, 45, 60, 75]

function* allCombos() {
  for (const severity of severities)
    for (const equipment of equipments)
      for (const goal of goals)
        for (const daysPerWeek of dayOptions)
          for (const sessionMin of sessions)
            for (const hiit of [false, true]) {
              const profile: HeartProfile = { ...DEFAULT_PROFILE, severity, hiit }
              const setup: SetupAnswers = { daysPerWeek, sessionMin, equipment, goal, bodyWeight: 80 }
              yield { profile, setup }
            }
}

describe('program oluşturucu', () => {
  it('gün sayısına göre split oluşturur', () => {
    const p = (d: SetupAnswers['daysPerWeek']) =>
      generateProgram({ daysPerWeek: d, sessionMin: 60, equipment: 'salon', goal: 'kas', bodyWeight: 80 }, DEFAULT_PROFILE)
    expect(p(2).days.map((d) => d.kind)).toEqual(['full', 'full'])
    expect(p(3).days.map((d) => d.kind)).toEqual(['full', 'full', 'full'])
    expect(p(4).days.map((d) => d.kind)).toEqual(['upper', 'lower', 'upper', 'lower'])
    expect(p(5).days.map((d) => d.kind)).toEqual(['upper', 'lower', 'cardio-core', 'upper', 'lower'])
  })

  it('tüm kombinasyonlarda: yasaklı hareket yok, RPE limiti aşılmıyor, ısınma/soğuma 5–10 dk', () => {
    let count = 0
    for (const { profile, setup } of allCombos()) {
      const limits = getLimits(profile)
      const plan = generateProgram(setup, profile)
      for (const day of plan.days) {
        expect(day.warmup.minutes).toBeGreaterThanOrEqual(5)
        expect(day.warmup.minutes).toBeLessThanOrEqual(10)
        expect(day.cooldown.minutes).toBeGreaterThanOrEqual(5)
        expect(day.cooldown.minutes).toBeLessThanOrEqual(10)
        expect(day.slots.length).toBeGreaterThanOrEqual(2)
        for (const slot of day.slots) {
          const ex = getExercise(slot.exerciseId)!
          expect(isExerciseAllowed(ex, limits, setup.equipment)).toBe(true)
          if (profile.severity !== 'hafif') expect(ex.heavyCompound).toBe(false)
          if (profile.severity === 'ciddi') expect(ex.supported).toBe(true)
          expect(ex.inverted ?? false).toBe(false)
          expect(ex.valsalva ?? false).toBe(false)
          expect(slot.targetRpe[1]).toBeLessThanOrEqual(limits.maxRpe)
          expect(slot.restSec).toBeGreaterThanOrEqual(60)
          if (slot.holdSec != null) {
            expect(slot.holdSec).toBeLessThanOrEqual(45)
            expect(slot.holdSec).toBeLessThanOrEqual(limits.maxIsometricSec)
          } else {
            expect(slot.repMin).toBeGreaterThanOrEqual(8)
            expect(slot.repMax).toBeLessThanOrEqual(15)
          }
        }
        if (day.cardio) {
          if (!limits.allowHiit) expect(day.cardio.mode).toBe('orta')
          expect(isExerciseAllowed(getExercise(day.cardio.exerciseId)!, limits, setup.equipment)).toBe(true)
        }
        // aynı gün aynı hareket iki kez yok
        const ids = day.slots.map((s) => s.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
        count++
      }
    }
    expect(count).toBeGreaterThan(1000)
  })

  it('kardiyo varsayılan orta yoğunlukta; HIIT sadece açılırsa', () => {
    const setup: SetupAnswers = { daysPerWeek: 3, sessionMin: 60, equipment: 'salon', goal: 'kilo', bodyWeight: 80 }
    const off = generateProgram(setup, DEFAULT_PROFILE)
    expect(off.days.every((d) => d.cardio?.mode === 'orta')).toBe(true)
    const on = generateProgram(setup, { ...DEFAULT_PROFILE, hiit: true })
    expect(on.days.every((d) => d.cardio?.mode === 'hiit')).toBe(true)
  })

  it('seans süresi aşılmıyor (yaklaşık)', () => {
    for (const { profile, setup } of allCombos()) {
      const plan = generateProgram(setup, profile)
      for (const d of plan.days) {
        const total =
          d.warmup.minutes + d.cooldown.minutes + (d.cardio?.minutes ?? 0) + d.slots.reduce((a, s) => a + slotMinutes(s), 0)
        // en az 2 hareket zorunlu olduğundan 30 dk seanslarda küçük taşma tolere edilir
        expect(total).toBeLessThanOrEqual(setup.sessionMin + 12)
      }
    }
  })

  it('ısınma/soğuma süreleri seans süresine göre ölçeklenir', () => {
    expect(warmupMinutes(30)).toBe(5)
    expect(warmupMinutes(75)).toBe(10)
    expect(cooldownMinutes(30)).toBe(5)
    expect(cooldownMinutes(75)).toBe(10)
  })
})

describe('profil değişince kayıtlı program güvenli kalır', () => {
  const setup: SetupAnswers = { daysPerWeek: 4, sessionMin: 75, equipment: 'salon', goal: 'kas', bodyWeight: 80 }
  const plan: ProgramPlan = generateProgram(setup, DEFAULT_PROFILE)

  it('hafif programda ağır compound olabilir ama ortaya geçince çıkarılır', () => {
    const all = plan.days.flatMap((d) => d.slots.map((s) => getExercise(s.exerciseId)!))
    expect(all.some((e) => e.heavyCompound)).toBe(true)
    for (const sev of ['orta', 'ciddi'] as Severity[]) {
      const limits = getLimits({ ...DEFAULT_PROFILE, severity: sev })
      for (let i = 0; i < plan.days.length; i++) {
        const day = resolveDay(plan, i, {}, limits)
        for (const s of day.slots) {
          const ex = getExercise(s.exerciseId)!
          expect(ex.heavyCompound).toBe(false)
          if (sev === 'ciddi') expect(ex.supported).toBe(true)
          expect(s.targetRpe[1]).toBeLessThanOrEqual(limits.maxRpe)
        }
      }
    }
  })

  it('swap ile seçilen yasaklı hareket uygulanmaz', () => {
    const limits = getLimits({ ...DEFAULT_PROFILE, severity: 'orta' })
    const day = resolveDay(plan, 1, { '1-0': 'back-squat' }, limits)
    expect(day.slots.map((s) => s.exerciseId)).not.toContain('back-squat')
  })

  it('swap seçenekleri aynı bölgeden ve güvenli', () => {
    const limits = getLimits({ ...DEFAULT_PROFILE, severity: 'orta' })
    const opts = swapOptions('leg-press', limits, 'salon')
    expect(opts.length).toBeGreaterThan(0)
    for (const o of opts) {
      expect(o.region).toBe('quadriceps')
      expect(o.heavyCompound).toBe(false)
      expect(o.id).not.toBe('leg-press')
    }
  })

  it('geçerli swap uygulanır', () => {
    const limits = getLimits(DEFAULT_PROFILE)
    const day0 = plan.days[0]
    const slot = day0.slots[0]
    const alt = swapOptions(slot.exerciseId, limits, 'salon')[0]
    const day = resolveDay(plan, 0, { [`0-0`]: alt.id }, limits)
    expect(day.slots[0].exerciseId).toBe(alt.id)
  })
})

describe('kardiyo yoğunluğu profil limitini aşmaz', () => {
  it('kardiyo metnindeki RPE üst değeri maxRpe’yi geçmez', () => {
    for (const sev of ['hafif', 'orta', 'ciddi'] as Severity[]) {
      for (const reduced of [false, true]) {
        const profile = { ...DEFAULT_PROFILE, severity: sev }
        const limits = getLimits(profile, { reduced })
        const plan = generateProgram({ daysPerWeek: 3, sessionMin: 60, equipment: 'salon', goal: 'kilo', bodyWeight: 80 }, profile)
        const day = resolveDay(plan, 0, {}, limits)
        const m = day.cardio!.detail.match(/RPE (\d+)–(\d+)/)!
        expect(Number(m[2])).toBeLessThanOrEqual(limits.maxRpe)
      }
    }
  })
})
