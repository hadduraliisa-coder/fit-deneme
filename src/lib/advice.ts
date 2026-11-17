/**
 * TAVSİYE MOTORU
 * --------------
 * Spor bilimi kaynaklarına dayalı, internet gerektirmeyen kurallar.
 * Tüm öneriler kalp profilindeki limitlerle sınırlandırılır.
 * Kaynak listesi: SOURCES (Ayarlar → Kaynaklar ekranında gösterilir).
 */
import { getExercise } from '../data/exercises'
import { addDays, parseDate } from './dates'
import { suggestNext, type Suggestion } from './overload'
import type { BodyGoal, ExerciseLog, Level, Limits, PlanExercise, SetLog, Severity } from './types'

export interface Source {
  id: string
  title: string
  detail: string
  url?: string
}

export const SOURCES: Source[] = [
  {
    id: 'acsm2009',
    title: 'ACSM Position Stand: Progression Models in Resistance Training for Healthy Adults (2009)',
    detail:
      'Hedef tekrar aralığının üst sınırı rahatça aşılınca yükü %2–10 artırmayı önerir ("double progression"). Yeni başlayanlarda hızlı, deneyimlilerde yavaş ilerleme beklenir.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Progression%20models%20in%20resistance%20training%20for%20healthy%20adults',
  },
  {
    id: 'aha2007',
    title: 'AHA Scientific Statement: Resistance Exercise in Individuals With and Without Cardiovascular Disease (2007)',
    detail:
      'Kalp hastalarında orta yoğunluk, 10–15 tekrar, nefes tutmadan (Valsalva yok) ve yavaş, kademeli yük artışı önerir.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Resistance%20exercise%20in%20individuals%20with%20and%20without%20cardiovascular%20disease%3A%202007%20update',
  },
  {
    id: 'iraki2019',
    title: 'Iraki ve ark. – Nutrition Recommendations for Bodybuilders in the Off-Season (Sports, 2019)',
    detail: 'Kas kazanımı döneminde vücut ağırlığının haftada yaklaşık %0,25–0,5 artmasını önerir.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Nutrition%20Recommendations%20for%20Bodybuilders%20in%20the%20Off-Season%3A%20A%20Narrative%20Review',
  },
  {
    id: 'helms2014',
    title: 'Helms ve ark. – Evidence-based recommendations for natural bodybuilding contest preparation (JISSN, 2014)',
    detail: 'Kas kaybını en aza indirmek için kilo verirken haftada vücut ağırlığının %0,5–1’i kadar kayıp önerir.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Evidence-based%20recommendations%20for%20natural%20bodybuilding%20contest%20preparation%3A%20nutrition%20and%20supplementation',
  },
  {
    id: 'ahaHF',
    title: 'AHA – Kalp yetmezliğinde kilo takibi önerisi',
    detail:
      'Bir günde 1–1,5 kg veya bir haftada ~2,5 kg ani kilo artışı sıvı birikiminin (ödem) belirtisi olabilir; doktora haber verilmesi önerilir. Triküspit yetmezliğinde bacak/ayak bileği şişmesi ile birlikte izlenmelidir.',
    url: 'https://www.heart.org/en/health-topics/heart-failure',
  },
]

// ───────────── Hareket kilosu ─────────────

/**
 * Haftalık beklenen yük artışı (%) – seviye ve bölgeye göre.
 * ACSM 2009'daki "%2–10 artış, yeni başlayanda daha hızlı" ilkesinden türetilmiş yaklaşık değerler.
 */
const WEEKLY_PCT: Record<Level, Record<'upper' | 'lower', [number, number]>> = {
  baslangic: { upper: [1.5, 3], lower: [2.5, 5] },
  orta: { upper: [0.5, 1.5], lower: [1, 2] },
  ileri: { upper: [0.25, 0.5], lower: [0.25, 1] },
}

/** Kalp profiline göre çarpan: düşük RPE limitiyle ilerleme doğal olarak yavaşlar */
const SEVERITY_FACTOR: Record<Severity, number> = { hafif: 1, orta: 0.5, ciddi: 0.25 }

/** Kalp profili ne olursa olsun haftalık yük artışı bu yüzdeyi geçmemeli */
export const MAX_SAFE_WEEKLY_PCT = 5

export function expectedWeeklyPct(level: Level, bodyPart: PlanExercise['bodyPart'], severity: Severity): [number, number] {
  const part = bodyPart === 'lower' ? 'lower' : 'upper'
  const [a, b] = WEEKLY_PCT[level][part]
  const f = SEVERITY_FACTOR[severity]
  return [round2(Math.min(a * f, MAX_SAFE_WEEKLY_PCT)), round2(Math.min(b * f, MAX_SAFE_WEEKLY_PCT))]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function topWeight(log: ExerciseLog): number {
  return log.sets.length ? Math.max(...log.sets.map((s) => s.weight)) : 0
}

export function logVolume(log: ExerciseLog): number {
  return log.sets.reduce((a, s) => a + s.weight * s.reps, 0)
}

export function weeksBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / (7 * 86400000))
}

export type ProgressStatus = 'veri-yok' | 'geride' | 'uygun' | 'hizli' | 'cok-hizli'

export interface ProgressEval {
  status: ProgressStatus
  /** Ölçülen ortalama haftalık artış (%) */
  actualPct: number | null
  expectedPct: [number, number]
  /** İlk kayda göre şu an olması beklenen aralık (kg) */
  expectedNow: [number, number] | null
  firstWeight: number | null
  currentWeight: number | null
  weeks: number
  message: string
}

export const STATUS_LABELS: Record<ProgressStatus, string> = {
  'veri-yok': 'Veri az',
  geride: 'Beklentinin gerisinde',
  uygun: 'Beklenen aralıkta',
  hizli: 'Beklenenden hızlı',
  'cok-hizli': 'Çok hızlı',
}

/**
 * Bir hareketin haftalık kayıtlarını beklenen artışla karşılaştırır.
 * Son en fazla 8 haftalık kayıt kullanılır; en az 2 farklı hafta gerekir.
 */
export function evaluateProgress(
  logs: ExerciseLog[],
  ex: PlanExercise,
  level: Level,
  severity: Severity,
): ProgressEval {
  const expectedPct = expectedWeeklyPct(level, ex.bodyPart, severity)
  const weighted = logs.filter((l) => topWeight(l) > 0).sort((a, b) => a.week.localeCompare(b.week))
  const base: ProgressEval = {
    status: 'veri-yok',
    actualPct: null,
    expectedPct,
    expectedNow: null,
    firstWeight: weighted[0] ? topWeight(weighted[0]) : null,
    currentWeight: weighted.length ? topWeight(weighted[weighted.length - 1]) : null,
    weeks: 0,
    message: '',
  }
  if (ex.bodyweight) {
    return { ...base, message: 'Ağırlıksız hareket: ilerlemeyi tekrar sayısı ve kontrolle takip et.' }
  }
  if (weighted.length < 2) {
    return { ...base, message: 'Karşılaştırma için en az 2 haftalık kayıt gerekiyor.' }
  }
  const last = weighted[weighted.length - 1]
  const windowStart = addDays(last.week, -7 * 8)
  const win = weighted.filter((l) => l.week >= windowStart)
  const first = win[0]
  const weeks = Math.max(1, weeksBetween(first.week, last.week))
  const w0 = topWeight(first)
  const w1 = topWeight(last)
  const actualPct = round2((Math.pow(w1 / w0, 1 / weeks) - 1) * 100)
  const expectedNow: [number, number] = [
    roundKg(w0 * Math.pow(1 + expectedPct[0] / 100, weeks)),
    roundKg(w0 * Math.pow(1 + expectedPct[1] / 100, weeks)),
  ]

  let status: ProgressStatus
  if (actualPct > MAX_SAFE_WEEKLY_PCT || actualPct > expectedPct[1] * 2) status = 'cok-hizli'
  else if (actualPct > expectedPct[1]) status = 'hizli'
  else if (actualPct >= expectedPct[0]) status = 'uygun'
  else status = 'geride'

  const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
  const range = `%${fmt(expectedPct[0])}–${fmt(expectedPct[1])}`
  const nowTxt = `${weeks} haftada ${kg(w0)} → şu an ~${kg(expectedNow[0])}–${kg(expectedNow[1])} olması beklenirdi`
  const messages: Record<ProgressStatus, string> = {
    'veri-yok': '',
    geride: `Haftalık ortalama artışın %${fmt(actualPct)}; beklenen ${range}. ${nowTxt}, sen ${kg(w1)}’dasın. Tekrarları üst sınıra taşımaya odaklan; uyku, beslenme ve düzenli katılım ilerlemeyi hızlandırır. Kalp profilin nedeniyle yavaş ilerleme normaldir, zorlamak için RPE limitini aşma.`,
    uygun: `Haftalık ortalama artışın %${fmt(actualPct)}; beklenen ${range}. ${nowTxt}. Böyle devam!`,
    hizli: `Haftalık ortalama artışın %${fmt(actualPct)}, beklenenden (${range}) hızlı. ${nowTxt}. Form ve nefesin bozulmuyorsa sorun yok; RPE’n limitin altında kalsın.`,
    'cok-hizli': `Haftalık ortalama artışın %${fmt(actualPct)} – çok hızlı (güvenli üst sınır %${MAX_SAFE_WEEKLY_PCT}). Kalp sağlığın için artışları yavaşlat, birkaç hafta aynı kiloda kal ve tekrarları sağlamlaştır.`,
  }
  return { ...base, status, actualPct, expectedNow, weeks, firstWeight: w0, currentWeight: w1, message: messages[status] }
}

function roundKg(n: number) {
  return Math.round(n * 2) / 2
}

function kg(n: number) {
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg`
}

/** Plan hareketi için kütüphane bilgilerini (artış adımı vb.) birleştirir */
export function progressionTargetFor(ex: PlanExercise) {
  const lib = ex.libraryId ? getExercise(ex.libraryId) : undefined
  return {
    bodyPart: ex.bodyPart,
    bodyweight: ex.bodyweight ?? lib?.bodyweight,
    minIncrement: lib?.minIncrement,
    startFactor: lib?.startFactor,
  }
}

export function logToSetLogs(log: ExerciseLog | null | undefined): SetLog[] | null {
  if (!log) return null
  return log.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: log.rpe, done: true }))
}

/** Bu hafta için hedef kilo/tekrar (geçen haftanın kaydına göre) */
export function weeklyTarget(
  ex: PlanExercise,
  lastLog: ExerciseLog | null | undefined,
  limits: Limits,
  bodyWeight: number,
): Suggestion {
  return suggestNext(progressionTargetFor(ex), logToSetLogs(lastLog), ex.repMax, limits, bodyWeight)
}

/** Kullanıcının yazdığı hareket için kalp güvenliği uyarısı */
export function planExerciseWarning(ex: PlanExercise, limits: Limits): string | null {
  if (!ex.bodyweight && ex.repMin < 8) return 'Tekrar aralığı en az 8 olmalı (ağır, düşük tekrarlı setler kan basıncını çok yükseltir).'
  const lib = ex.libraryId ? getExercise(ex.libraryId) : undefined
  if (lib) {
    if (lib.heavyCompound && !limits.allowHeavyCompound) return 'Ağır compound hareket: kalp profilinde önerilmiyor. Destekli bir alternatif seç.'
    if (limits.onlySupported && !lib.supported) return 'Ciddi profilde yalnızca makine/destekli hareketler önerilir.'
    if (lib.heavyCompound) return 'Ağır compound: orta ağırlıkta kal, nefesini tutma, maksimuma yaklaşma.'
    return null
  }
  const n = ex.name.toLocaleLowerCase('tr')
  const risky = ['amuda', 'baş aşağı', 'headstand', 'handstand', 'decline', '1rm', 'max', 'deadlift', 'squat', 'overhead', 'military']
  if (risky.some((k) => n.includes(k))) {
    return 'Bu hareket yüksek kan basıncı veya baş aşağı pozisyon içerebilir. Orta ağırlıkta kal, nefesini tutma; emin değilsen doktoruna sor.'
  }
  return null
}

// ───────────── Vücut ağırlığı ─────────────

export const BODY_GOAL_LABELS: Record<BodyGoal, string> = {
  kas: 'Kas kazanmak (kilo almak)',
  kilo: 'Kilo vermek',
  koru: 'Kiloyu korumak',
}

/** Haftalık vücut ağırlığı değişim hedefi (% vücut ağırlığı) */
export const BODY_WEEKLY_PCT: Record<BodyGoal, [number, number]> = {
  kas: [0.25, 0.5], // Iraki 2019
  kilo: [-1, -0.5], // Helms 2014
  koru: [-0.25, 0.25],
}

export interface WeeklyAvg {
  week: string
  avg: number
  count: number
}

export function weeklyAverages(entries: { date: string; weight?: number | null }[], weekOf: (d: string) => string): WeeklyAvg[] {
  const map = new Map<string, number[]>()
  for (const e of entries) {
    if (e.weight == null) continue
    const w = weekOf(e.date)
    map.set(w, [...(map.get(w) ?? []), e.weight])
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, arr]) => ({ week, avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10, count: arr.length }))
}

export interface BodyAdvice {
  status: 'veri-yok' | 'geride' | 'uygun' | 'hizli' | 'ters'
  weeklyKg: number | null
  weeklyPct: number | null
  targetKg: [number, number] | null
  message: string
  /** Kalp açısından acil uyarı (ani kilo artışı) */
  alert: string | null
}

/** Ani kilo artışı (ödem/sıvı birikimi şüphesi) kontrolü */
export function fluidAlert(entries: { date: string; weight?: number | null }[]): string | null {
  const list = entries.filter((e) => e.weight != null).sort((a, b) => a.date.localeCompare(b.date)) as { date: string; weight: number }[]
  if (list.length < 2) return null
  const last = list[list.length - 1]
  for (let i = list.length - 2; i >= 0; i--) {
    const prev = list[i]
    const days = Math.round((parseDate(last.date).getTime() - parseDate(prev.date).getTime()) / 86400000)
    if (days > 7) break
    const diff = last.weight - prev.weight
    if (days <= 1 && diff >= 1) return `Son ${days || 1} günde +${diff.toFixed(1)} kg. Ani kilo artışı sıvı birikimi (ödem) belirtisi olabilir. Bacak/ayak bileği şişmesi veya nefes darlığı varsa doktoruna hemen haber ver.`
    if (diff >= 2) return `Son ${days} günde +${diff.toFixed(1)} kg. Bu hız yağ/kas artışıyla açıklanamaz; sıvı birikimi olabilir. Şişlik, nefes darlığı varsa doktoruna haber ver.`
  }
  return null
}

export function bodyWeightAdvice(avgs: WeeklyAvg[], goal: BodyGoal, entries: { date: string; weight?: number | null }[]): BodyAdvice {
  const alert = fluidAlert(entries)
  if (avgs.length < 2) {
    return {
      status: 'veri-yok',
      weeklyKg: null,
      weeklyPct: null,
      targetKg: null,
      alert,
      message: 'Haftalık değişimi görmek için en az 2 haftalık tartı kaydı gerekli. Haftada 2–3 kez, sabah aç karnına tartılmak en doğru ortalamayı verir.',
    }
  }
  const window = avgs.slice(-4)
  const a = window[0]
  const b = window[window.length - 1]
  const weeks = Math.max(1, weeksBetween(a.week, b.week))
  const weeklyKg = Math.round(((b.avg - a.avg) / weeks) * 100) / 100
  const weeklyPct = Math.round((weeklyKg / a.avg) * 10000) / 100
  const [lo, hi] = BODY_WEEKLY_PCT[goal]
  const targetKg: [number, number] = [Math.round(b.avg * lo) / 100, Math.round(b.avg * hi) / 100]
  const fk = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`
  const tgt = `Hedefin için önerilen: haftada ${fk(targetKg[0])} ile ${fk(targetKg[1])} arası`
  let status: BodyAdvice['status']
  let message: string
  if (weeklyPct >= lo && weeklyPct <= hi) {
    status = 'uygun'
    message = `Son ${weeks} haftada ortalama ${fk(weeklyKg)}/hafta. ${tgt}. Tam aralıktasın.`
  } else if (goal === 'kas') {
    if (weeklyPct < 0) {
      status = 'ters'
      message = `Kilo veriyorsun (${fk(weeklyKg)}/hafta) ama hedefin kas kazanmak. ${tgt}. Günlük ~200–300 kcal ve yeterli protein (kg başına ~1,6 g) ekle.`
    } else if (weeklyPct < lo) {
      status = 'geride'
      message = `Ortalama ${fk(weeklyKg)}/hafta. ${tgt}. Günlük ~100–200 kcal artırabilirsin.`
    } else {
      status = 'hizli'
      message = `Ortalama ${fk(weeklyKg)}/hafta – önerilenden hızlı; fazlası büyük ihtimalle yağ (veya sıvı). ${tgt}.`
    }
  } else if (goal === 'kilo') {
    if (weeklyPct > 0) {
      status = 'ters'
      message = `Kilo alıyorsun (${fk(weeklyKg)}/hafta) ama hedefin kilo vermek. ${tgt}. Günlük ~300–500 kcal açık hedefle.`
    } else if (weeklyPct > hi) {
      status = 'geride'
      message = `Ortalama ${fk(weeklyKg)}/hafta. ${tgt}. Biraz daha kalori açığı veya günlük yürüyüş ekleyebilirsin.`
    } else {
      status = 'hizli'
      message = `Ortalama ${fk(weeklyKg)}/hafta – önerilenden hızlı; kas kaybı riski artar. ${tgt}. Kaloriyi biraz artır.`
    }
  } else {
    status = weeklyPct > hi ? 'hizli' : 'geride'
    message = `Ortalama ${fk(weeklyKg)}/hafta. Korumak için haftalık değişim ±%0,25 içinde kalmalı (${fk(targetKg[0])} ile ${fk(targetKg[1])}).`
  }
  return { status, weeklyKg, weeklyPct, targetKg, message, alert }
}
