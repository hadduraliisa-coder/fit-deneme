import { describe, expect, it } from 'vitest'
import { EXERCISES, REGIONS } from '../data/exercises'
import { ABSOLUTE_MAX_RPE, DEFAULT_PROFILE, getLimits, isAllowedForLimits, isExerciseAllowed } from './safety'
import type { Exercise, HeartProfile, Severity } from './types'

const prof = (severity: Severity, extra: Partial<HeartProfile> = {}): HeartProfile => ({ ...DEFAULT_PROFILE, severity, ...extra })

describe('kalp profili limitleri', () => {
  it('varsayılan profil hafiftir, HIIT kapalı, nabız limiti boş', () => {
    expect(DEFAULT_PROFILE.severity).toBe('hafif')
    expect(DEFAULT_PROFILE.hiit).toBe(false)
    expect(DEFAULT_PROFILE.maxHr ?? null).toBeNull()
    expect(DEFAULT_PROFILE.betaBlocker).toBe(false)
  })

  it('hafif: RPE 6–7, tekrar 8–15, dinlenme ≥ 60 sn, izometrik ≤ 45 sn', () => {
    const l = getLimits(prof('hafif'))
    expect(l.targetRpe).toEqual([6, 7])
    expect(l.maxRpe).toBe(7)
    expect(l.repMin).toBe(8)
    expect(l.repMax).toBe(15)
    expect(l.restIsolationSec).toBeGreaterThanOrEqual(60)
    expect(l.restCompoundSec).toBeGreaterThanOrEqual(90)
    expect(l.maxIsometricSec).toBeLessThanOrEqual(45)
    expect(l.allowFailure).toBe(false)
    expect(l.allow1RmTest).toBe(false)
  })

  it('profil değişince limitler değişir: orta → RPE ≤ 6 ve ağır compound kapalı', () => {
    const h = getLimits(prof('hafif'))
    const o = getLimits(prof('orta'))
    expect(o.maxRpe).toBe(6)
    expect(o.maxRpe).toBeLessThan(h.maxRpe)
    expect(o.allowHeavyCompound).toBe(false)
    expect(h.allowHeavyCompound).toBe(true)
  })

  it('ciddi → RPE ≤ 5 ve sadece makine/destekli', () => {
    const c = getLimits(prof('ciddi'))
    expect(c.maxRpe).toBe(5)
    expect(c.onlySupported).toBe(true)
    expect(c.allowHeavyCompound).toBe(false)
  })

  it('hiçbir profilde RPE mutlak tavanı (7) aşılmaz', () => {
    for (const s of ['hafif', 'orta', 'ciddi'] as Severity[]) {
      for (const reduced of [false, true]) {
        const l = getLimits(prof(s), { reduced })
        expect(l.maxRpe).toBeLessThanOrEqual(ABSOLUTE_MAX_RPE)
        expect(l.targetRpe[1]).toBeLessThanOrEqual(l.maxRpe)
      }
    }
  })

  it('semptom sonrası (reduced) yoğunluk bir kademe düşer', () => {
    const n = getLimits(prof('hafif'))
    const r = getLimits(prof('hafif'), { reduced: true })
    expect(r.maxRpe).toBe(n.maxRpe - 1)
    expect(r.targetRpe[1]).toBe(n.targetRpe[1] - 1)
    expect(r.restCompoundSec).toBeGreaterThan(n.restCompoundSec)
  })

  it('HIIT varsayılan kapalı; sadece hafif profilde açılabilir', () => {
    expect(getLimits(prof('hafif')).allowHiit).toBe(false)
    expect(getLimits(prof('hafif', { hiit: true })).allowHiit).toBe(true)
    expect(getLimits(prof('orta', { hiit: true })).allowHiit).toBe(false)
    expect(getLimits(prof('ciddi', { hiit: true })).allowHiit).toBe(false)
    expect(getLimits(prof('hafif', { hiit: true }), { reduced: true }).allowHiit).toBe(false)
  })
})

describe('hareket filtresi', () => {
  it('baş aşağı veya nefes tutma gerektiren hareket hiçbir profilde açılmaz', () => {
    const bad: Exercise = { ...EXERCISES[0], id: 'x', inverted: true }
    const bad2: Exercise = { ...EXERCISES[0], id: 'y', valsalva: true }
    for (const s of ['hafif', 'orta', 'ciddi'] as Severity[]) {
      expect(isAllowedForLimits(bad, getLimits(prof(s)))).toBe(false)
      expect(isAllowedForLimits(bad2, getLimits(prof(s)))).toBe(false)
    }
  })

  it('ağır compound: hafifte açık, orta/ciddide kapalı', () => {
    const heavy = EXERCISES.filter((e) => e.heavyCompound)
    expect(heavy.length).toBeGreaterThan(0)
    for (const e of heavy) {
      expect(isAllowedForLimits(e, getLimits(prof('hafif')))).toBe(true)
      expect(isAllowedForLimits(e, getLimits(prof('orta')))).toBe(false)
      expect(isAllowedForLimits(e, getLimits(prof('ciddi')))).toBe(false)
    }
  })

  it('ciddi profilde sadece destekli hareketler', () => {
    const l = getLimits(prof('ciddi'))
    for (const e of EXERCISES) if (isAllowedForLimits(e, l)) expect(e.supported).toBe(true)
  })

  it('ekipman filtresi uygulanır', () => {
    const l = getLimits(prof('hafif'))
    const legPress = EXERCISES.find((e) => e.id === 'leg-press')!
    expect(isExerciseAllowed(legPress, l, 'ev')).toBe(false)
    expect(isExerciseAllowed(legPress, l, 'salon')).toBe(true)
  })
})

describe('hareket verisi', () => {
  it('her bölgede tam 1 en iyi seçim ve 2–3 alternatif var', () => {
    for (const r of REGIONS) {
      const list = EXERCISES.filter((e) => e.region === r)
      expect(list.filter((e) => e.isBest), r).toHaveLength(1)
      expect(list.length - 1, r).toBeGreaterThanOrEqual(2)
      expect(list.length - 1, r).toBeLessThanOrEqual(3)
    }
  })

  it('her hareketin nefes talimatı ve kalp notu var; en iyi seçimin gerekçesi var', () => {
    for (const e of EXERCISES) {
      expect(e.breathing.length, e.id).toBeGreaterThan(10)
      expect(e.heartNote.length, e.id).toBeGreaterThan(10)
      expect(e.steps.length, e.id).toBeGreaterThan(0)
      expect(e.mistakes.length, e.id).toBeGreaterThan(0)
      expect(e.inverted ?? false, e.id).toBe(false)
      expect(e.valsalva ?? false, e.id).toBe(false)
      if (e.isBest) expect(e.bestReason, e.id).toBeTruthy()
    }
  })

  it('id’ler benzersiz', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('her ekipman ortamı için her bölgede (hafif profilde) en az bir hareket var', () => {
    const l = getLimits(prof('hafif'))
    for (const eq of ['salon', 'ev', 'dambil'] as const) {
      for (const r of REGIONS) {
        expect(
          EXERCISES.some((e) => e.region === r && isExerciseAllowed(e, l, eq)),
          `${eq}/${r}`,
        ).toBe(true)
      }
    }
  })
})
