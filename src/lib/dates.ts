/** Yerel saate göre YYYY-MM-DD */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Haftanın pazartesi gününü YYYY-MM-DD olarak döndürür */
export function weekStart(s: string): string {
  const d = parseDate(s)
  const dow = (d.getDay() + 6) % 7 // pazartesi = 0
  d.setDate(d.getDate() - dow)
  return todayStr(d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const fmtLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

export function shortDate(s: string): string {
  return fmt.format(parseDate(s))
}

export function longDate(s: string): string {
  return fmtLong.format(parseDate(s))
}
