import type { Exercise, Limits, SetLog } from './types'

export type OverloadAction = 'start' | 'increase' | 'keep' | 'decrease'

export interface Suggestion {
  weight: number
  reps: number
  action: OverloadAction
  reason: string
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/** Ağırlık artış miktarı: üst vücut +1–2,5 kg, alt vücut +2,5–5 kg */
export function incrementFor(ex: Exercise, currentWeight: number): number {
  const lower = ex.bodyPart === 'lower'
  if (lower) {
    const inc = currentWeight >= 40 ? 5 : 2.5
    return Math.max(inc, Math.min(ex.minIncrement ?? 2.5, 5))
  }
  const inc = currentWeight >= 20 ? 2.5 : 1
  return Math.min(Math.max(inc, ex.minIncrement ?? 1), 2.5)
}

/** Artış önerisi için gereken RPE eşiği: kural "RPE ≤ 6", profil limiti daha düşükse limit − 1 */
export function increaseRpeThreshold(limits: Limits): number {
  return Math.min(6, limits.maxRpe - 1)
}

/** İlk seans için muhafazakâr başlangıç ağırlığı */
export function startingWeight(ex: Exercise, bodyWeight: number): number {
  if (ex.bodyweight || !ex.startFactor) return 0
  const step = ex.minIncrement ?? 2.5
  return Math.max(step, roundTo(bodyWeight * ex.startFactor, step))
}

/**
 * Bir sonraki seans için ağırlık önerisi.
 *  - Profil RPE limiti aşıldıysa → ağırlığı düşür.
 *  - Tüm setlerde üst tekrar sınırına RPE ≤ 6 ile ulaşıldıysa → artır.
 *  - RPE 7'ye ulaşıldıysa (veya üst sınıra ulaşılmadıysa) → aynı ağırlıkta kal.
 *  - `reduced` (semptom sonrası) → önerinin %90'ı.
 */
export function suggestNext(
  ex: Exercise,
  lastSets: SetLog[] | null | undefined,
  repMax: number,
  limits: Limits,
  bodyWeight: number,
): Suggestion {
  const done = (lastSets ?? []).filter((s) => s.done)
  let s: Suggestion

  if (done.length === 0) {
    const w = startingWeight(ex, bodyWeight)
    s = {
      weight: w,
      reps: Math.max(limits.repMin, repMax - 4),
      action: 'start',
      reason: ex.bodyweight
        ? 'İlk seans: kontrollü tempo, hedef RPE’de kal.'
        : 'Başlangıç önerisi: hafif başla, RPE hedefine göre ayarla.',
    }
  } else {
    const weight = Math.max(...done.map((d) => d.weight))
    const topSets = done.filter((d) => d.weight === weight)
    const maxRpeSeen = Math.max(...done.map((d) => d.rpe ?? 0))
    const allTop = topSets.every((d) => d.reps >= repMax)
    const allEasy = done.every((d) => d.rpe != null && d.rpe <= increaseRpeThreshold(limits))
    const step = incrementFor(ex, weight)
    const lastReps = Math.min(...topSets.map((d) => d.reps))

    if (maxRpeSeen > limits.maxRpe) {
      const dec = ex.bodyweight || weight === 0 ? 0 : Math.max(step, roundTo(weight * 0.1, ex.minIncrement ?? 1))
      s = {
        weight: Math.max(0, weight - dec),
        reps: Math.max(limits.repMin, Math.min(lastReps, repMax)),
        action: 'decrease',
        reason: `Geçen seans RPE ${maxRpeSeen} ile profil limitin (${limits.maxRpe}) aşıldı → ${
          dec > 0 ? `${dec} kg azalt` : 'tekrarı azalt / daha kolay varyasyon seç'
        }.`,
      }
    } else if (allTop && allEasy) {
      if (ex.bodyweight || weight === 0) {
        s = {
          weight,
          reps: repMax,
          action: 'increase',
          reason: 'Tüm setlerde üst tekrar sınırına rahat ulaştın → biraz zorlaştır (lastik/daha alçak yüzey) veya alternatif hareket seç.',
        }
      } else {
        s = {
          weight: weight + step,
          reps: Math.max(limits.repMin, repMax - 4),
          action: 'increase',
          reason: `Tüm setlerde ${repMax} tekrara RPE ≤ ${increaseRpeThreshold(limits)} ile ulaştın → +${step} kg.`,
        }
      }
    } else {
      s = {
        weight,
        reps: Math.min(repMax, lastReps + (allTop ? 0 : 1)),
        action: 'keep',
        reason:
          maxRpeSeen >= 7
            ? 'RPE 7’ye ulaştın → aynı ağırlıkta kal.'
            : allTop
              ? 'Aynı ağırlıkta kal; RPE düştükçe artış gelecek.'
              : `Aynı ağırlıkta kal, tekrarları ${repMax}’e taşımayı hedefle.`,
      }
    }
  }

  if (limits.reduced && s.weight > 0) {
    const step = ex.minIncrement ?? 1
    s = {
      ...s,
      weight: Math.max(step, roundTo(s.weight * 0.9, step)),
      reason: s.reason + ' Semptom bildirdiğin için bugün ~%10 hafifletildi.',
    }
  }
  return s
}

/** Kişisel rekor: en yüksek ağırlık, eşitlikte en çok tekrar (1RM hesaplanmaz) */
export function personalRecord(sets: SetLog[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null
  for (const s of sets) {
    if (!s.done) continue
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = { weight: s.weight, reps: s.reps }
    }
  }
  return best
}
