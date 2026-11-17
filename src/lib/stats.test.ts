import { describe, expect, it } from 'vitest'
import { makeBackup, parseBackup } from './backup'
import { exerciseProgress, personalRecords, setsPerRegion, weekStreak, weeklyVolume, workoutVolume } from './stats'
import type { Workout } from './types'

const w = (date: string, weight: number, reps: number, done = true): Workout => ({
  date,
  startedAt: new Date(date).getTime(),
  finishedAt: new Date(date).getTime() + 3600_000,
  dayIndex: 0,
  dayName: 'A',
  reduced: false,
  entries: [{ exerciseId: 'leg-press', region: 'quadriceps', sets: [{ weight, reps, rpe: 6, done }, { weight, reps, rpe: 6, done }] }],
})

describe('istatistikler', () => {
  const data = [w('2026-11-02', 50, 10), w('2026-11-05', 55, 10), w('2026-11-10', 55, 12), w('2026-11-17', 60, 8)]

  it('hacim = set × tekrar × kg', () => {
    expect(workoutVolume(data[0])).toBe(1000)
    expect(workoutVolume(w('2026-11-02', 50, 10, false))).toBe(0)
  })

  it('haftalık hacim pazartesi bazlı gruplanır', () => {
    const v = weeklyVolume(data)
    expect(v.map((x) => x.week)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
    expect(v[0].volume).toBe(1000 + 1100)
  })

  it('kas grubu set sayısı', () => {
    expect(setsPerRegion(data, '2026-11-02')).toEqual([{ region: 'quadriceps', sets: 4 }])
  })

  it('PR: en ağır set, 1RM yok', () => {
    expect(personalRecords(data)).toEqual([{ exerciseId: 'leg-press', weight: 60, reps: 8, date: '2026-11-17' }])
  })

  it('ilerleme grafiği verisi', () => {
    expect(exerciseProgress(data, 'leg-press').map((p) => p.weight)).toEqual([50, 55, 55, 60])
  })

  it('haftalık seri', () => {
    expect(weekStreak(data, '2026-11-18')).toBe(3)
    expect(weekStreak(data, '2026-11-24')).toBe(3) // bu hafta henüz boş → geçen haftadan say
    expect(weekStreak(data, '2026-12-08')).toBe(0)
  })
})

describe('yedekleme', () => {
  it('dışa aktarılan dosya geri okunabilir', () => {
    const b = makeBackup(null, [w('2026-11-02', 50, 10)], [{ date: '2026-11-02', weight: 80 }])
    const parsed = parseBackup(JSON.stringify(b))
    expect(parsed.workouts).toHaveLength(1)
    expect(parsed.bodyLogs[0].weight).toBe(80)
  })

  it('hatalı dosyaları reddeder', () => {
    expect(() => parseBackup('xx')).toThrow(/JSON/)
    expect(() => parseBackup('{"format":"baska"}')).toThrow(/yedeği değil/)
    expect(() => parseBackup(JSON.stringify({ format: 'fit-deneme-backup', version: 99, workouts: [], bodyLogs: [] }))).toThrow(/daha yeni/)
  })
})
