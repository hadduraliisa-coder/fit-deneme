import type { Equipment, Exercise, HeartProfile, Limits, Severity } from './types'

export const DEFAULT_PROFILE: HeartProfile = {
  severity: 'hafif',
  maxHr: null,
  betaBlocker: false,
  hiit: false,
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  hafif: 'Hafif',
  orta: 'Orta',
  ciddi: 'Ciddi',
}

/** Uygulamanın hiçbir koşulda aşmayacağı mutlak RPE tavanı */
export const ABSOLUTE_MAX_RPE = 7

const BASE: Record<Severity, Omit<Limits, 'reduced' | 'allowHiit'>> = {
  hafif: {
    severity: 'hafif',
    maxRpe: 7,
    targetRpe: [6, 7],
    repMin: 8,
    repMax: 15,
    restCompoundSec: 90,
    restIsolationSec: 75,
    maxIsometricSec: 45,
    allowHeavyCompound: true,
    onlySupported: false,
    allowFailure: false,
    allow1RmTest: false,
  },
  orta: {
    severity: 'orta',
    maxRpe: 6,
    targetRpe: [5, 6],
    repMin: 10,
    repMax: 15,
    restCompoundSec: 105,
    restIsolationSec: 90,
    maxIsometricSec: 30,
    allowHeavyCompound: false,
    onlySupported: false,
    allowFailure: false,
    allow1RmTest: false,
  },
  ciddi: {
    severity: 'ciddi',
    maxRpe: 5,
    targetRpe: [4, 5],
    repMin: 10,
    repMax: 15,
    restCompoundSec: 120,
    restIsolationSec: 90,
    maxIsometricSec: 20,
    allowHeavyCompound: false,
    onlySupported: true,
    allowFailure: false,
    allow1RmTest: false,
  },
}

/**
 * Kalp profiline göre yoğunluk limitleri.
 * `reduced` = son antrenmanda semptom bildirildi → bir kademe düşür.
 */
export function getLimits(profile: HeartProfile, opts: { reduced?: boolean } = {}): Limits {
  const base = BASE[profile.severity]
  const reduced = !!opts.reduced
  const maxRpe = reduced ? base.maxRpe - 1 : base.maxRpe
  const targetRpe: [number, number] = reduced
    ? [base.targetRpe[0] - 1, base.targetRpe[1] - 1]
    : [base.targetRpe[0], base.targetRpe[1]]
  return {
    ...base,
    maxRpe: Math.min(maxRpe, ABSOLUTE_MAX_RPE),
    targetRpe,
    restCompoundSec: reduced ? base.restCompoundSec + 30 : base.restCompoundSec,
    restIsolationSec: reduced ? base.restIsolationSec + 15 : base.restIsolationSec,
    maxIsometricSec: reduced ? Math.max(15, base.maxIsometricSec - 15) : base.maxIsometricSec,
    // HIIT yalnızca hafif profilde, kullanıcı açtıysa ve semptom yoksa
    allowHiit: profile.severity === 'hafif' && profile.hiit && !reduced,
    reduced,
  }
}

/** Hareket hiçbir profilde kabul edilemeyecek özellik taşıyor mu? */
export function isInherentlyUnsafe(ex: Exercise): boolean {
  return !!ex.inverted || !!ex.valsalva
}

/** Hareket bu profil + limitlerle yapılabilir mi? (ekipman hariç) */
export function isAllowedForLimits(ex: Exercise, limits: Limits): boolean {
  if (isInherentlyUnsafe(ex)) return false
  if (ex.heavyCompound && !limits.allowHeavyCompound) return false
  if (limits.onlySupported && !ex.supported) return false
  return true
}

export function isExerciseAllowed(ex: Exercise, limits: Limits, equipment?: Equipment): boolean {
  if (equipment && !ex.equipment.includes(equipment)) return false
  return isAllowedForLimits(ex, limits)
}

/** Neden kapalı olduğunu açıklar (kütüphane ekranı için) */
export function disallowReason(ex: Exercise, limits: Limits): string | null {
  if (isInherentlyUnsafe(ex)) return 'Baş aşağı pozisyon veya nefes tutma içerdiği için kapalı.'
  if (ex.heavyCompound && !limits.allowHeavyCompound) return 'Ağır compound hareket: bu kalp profilinde kapalı.'
  if (limits.onlySupported && !ex.supported) return 'Ciddi profilde yalnızca makine/destekli hareketler açık.'
  return null
}

/** RPE değeri profil limitini aşıyor mu? */
export function exceedsRpe(rpe: number | null | undefined, limits: Limits): boolean {
  return rpe != null && rpe > limits.maxRpe
}

/** Nabız rehberi metni (beta bloker varsa nabız yerine RPE) */
export function intensityGuide(profile: HeartProfile, limits: Limits): string {
  const rpe = `RPE ${limits.targetRpe[0]}–${limits.targetRpe[1]} (en fazla ${limits.maxRpe})`
  if (profile.betaBlocker) {
    return `Beta bloker kullandığın için nabız güvenilir değil: ${rpe} ve konuşma testi esas alınır.`
  }
  if (profile.maxHr) {
    return `${rpe}. Nabzın ${profile.maxHr} atım/dk’yı geçmesin.`
  }
  return `${rpe}. Konuşma testi: cümle kurabilmelisin.`
}

export const DUR_TEXT =
  'Göğüs ağrısı, baş dönmesi, çarpıntı, olağandışı nefes darlığı veya bacak/ayak bileği şişmesi olursa antrenmanı BIRAK ve doktoruna danış.'
