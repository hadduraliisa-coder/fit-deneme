import { describe, expect, it } from 'vitest'
import { getExercise } from '../data/exercises'
import { incrementFor, increaseRpeThreshold, personalRecord, startingWeight, suggestNext } from './overload'
import { DEFAULT_PROFILE, getLimits } from './safety'
import type { SetLog } from './types'

const hafif = getLimits(DEFAULT_PROFILE)
const orta = getLimits({ ...DEFAULT_PROFILE, severity: 'orta' })
const chest = getExercise('machine-chest-press')! // üst vücut
const leg = getExercise('leg-press')! // alt vücut
const sets = (w: number, reps: number, rpe: number, n = 3): SetLog[] =>
  Array.from({ length: n }, () => ({ weight: w, reps, rpe, done: true }))

describe('progressive overload', () => {
  it('tüm setlerde üst sınıra RPE ≤ 6 ile ulaşılırsa üst vücutta +1–2,5 kg', () => {
    const s = suggestNext(chest, sets(30, 12, 6), 12, hafif, 80)
    expect(s.action).toBe('increase')
    const inc = s.weight - 30
    expect(inc).toBeGreaterThanOrEqual(1)
    expect(inc).toBeLessThanOrEqual(2.5)
  })

  it('alt vücutta +2,5–5 kg', () => {
    const s = suggestNext(leg, sets(60, 12, 5), 12, hafif, 80)
    expect(s.action).toBe('increase')
    const inc = s.weight - 60
    expect(inc).toBeGreaterThanOrEqual(2.5)
    expect(inc).toBeLessThanOrEqual(5)
    const s2 = suggestNext(leg, sets(20, 12, 5), 12, hafif, 80)
    expect(s2.weight - 20).toBeGreaterThanOrEqual(2.5)
    expect(s2.weight - 20).toBeLessThanOrEqual(5)
  })

  it('RPE 7’ye ulaşıldıysa aynı ağırlıkta kalır', () => {
    const s = suggestNext(chest, sets(30, 12, 7), 12, hafif, 80)
    expect(s.action).toBe('keep')
    expect(s.weight).toBe(30)
  })

  it('üst sınıra ulaşılmadıysa aynı ağırlıkta kalır', () => {
    const s = suggestNext(chest, [...sets(30, 12, 6, 2), { weight: 30, reps: 10, rpe: 6, done: true }], 12, hafif, 80)
    expect(s.action).toBe('keep')
    expect(s.weight).toBe(30)
  })

  it('profil RPE limiti aşıldıysa ağırlığı düşürür', () => {
    const s = suggestNext(chest, sets(30, 10, 8), 12, hafif, 80)
    expect(s.action).toBe('decrease')
    expect(s.weight).toBeLessThan(30)
    // orta profilde RPE 7 zaten limit aşımıdır
    const s2 = suggestNext(chest, sets(30, 12, 7), 12, orta, 80)
    expect(s2.action).toBe('decrease')
  })

  it('orta profilde artış eşiği daha düşüktür (RPE 6 artık artış getirmez)', () => {
    expect(increaseRpeThreshold(hafif)).toBe(6)
    expect(increaseRpeThreshold(orta)).toBe(5)
    expect(suggestNext(chest, sets(30, 15, 6), 15, orta, 80).action).toBe('keep')
    expect(suggestNext(chest, sets(30, 15, 5), 15, orta, 80).action).toBe('increase')
  })

  it('RPE girilmemiş setlerde artış önerilmez', () => {
    const s = suggestNext(chest, sets(30, 12, 0).map((x) => ({ ...x, rpe: null })), 12, hafif, 80)
    expect(s.action).toBe('keep')
  })

  it('semptom sonrası öneri ~%10 hafifler', () => {
    const reduced = getLimits(DEFAULT_PROFILE, { reduced: true })
    const s = suggestNext(leg, sets(60, 10, 5), 12, reduced, 80)
    expect(s.weight).toBeLessThan(60)
  })

  it('geçmiş yoksa muhafazakâr başlangıç önerir', () => {
    const s = suggestNext(leg, null, 12, hafif, 80)
    expect(s.action).toBe('start')
    expect(s.weight).toBe(startingWeight(leg, 80))
    expect(s.weight).toBeLessThan(80)
  })

  it('artış miktarları sınırlar içinde', () => {
    for (const w of [5, 15, 25, 50]) {
      expect(incrementFor(chest, w)).toBeGreaterThanOrEqual(1)
      expect(incrementFor(chest, w)).toBeLessThanOrEqual(2.5)
    }
    for (const w of [10, 39, 40, 120]) {
      expect(incrementFor(leg, w)).toBeGreaterThanOrEqual(2.5)
      expect(incrementFor(leg, w)).toBeLessThanOrEqual(5)
    }
  })

  it('kişisel rekor ağırlık × tekrar olarak hesaplanır', () => {
    expect(
      personalRecord([
        { weight: 40, reps: 10, rpe: 6, done: true },
        { weight: 40, reps: 12, rpe: 7, done: true },
        { weight: 50, reps: 8, rpe: 7, done: false },
      ]),
    ).toEqual({ weight: 40, reps: 12 })
  })
})
