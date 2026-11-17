import type { AppSettings, BodyLog, Workout } from './types'

export const BACKUP_FORMAT = 'fit-deneme-backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  settings: AppSettings | null
  workouts: Workout[]
  bodyLogs: BodyLog[]
}

export function makeBackup(settings: AppSettings | null, workouts: Workout[], bodyLogs: BodyLog[]): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    workouts,
    bodyLogs,
  }
}

/** İçe aktarılan JSON'u doğrular; hatalıysa açıklayıcı Türkçe hata fırlatır */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Dosya geçerli bir JSON değil.')
  }
  if (!data || typeof data !== 'object') throw new Error('Yedek dosyası boş veya hatalı.')
  const d = data as Partial<BackupFile>
  if (d.format !== BACKUP_FORMAT) throw new Error('Bu dosya bir Fit Deneme yedeği değil.')
  if (typeof d.version !== 'number' || d.version > BACKUP_VERSION)
    throw new Error('Yedek dosyası bu uygulama sürümünden daha yeni.')
  if (!Array.isArray(d.workouts) || !Array.isArray(d.bodyLogs)) throw new Error('Yedek dosyasında veri eksik.')
  for (const w of d.workouts) {
    if (typeof w !== 'object' || typeof w.date !== 'string' || !Array.isArray(w.entries))
      throw new Error('Antrenman kayıtlarından biri bozuk.')
  }
  for (const b of d.bodyLogs) {
    if (typeof b !== 'object' || typeof b.date !== 'string') throw new Error('Vücut kayıtlarından biri bozuk.')
  }
  return {
    format: BACKUP_FORMAT,
    version: d.version,
    exportedAt: d.exportedAt ?? '',
    settings: d.settings ? { ...d.settings, id: 'main' } : null,
    workouts: d.workouts,
    bodyLogs: d.bodyLogs,
  }
}
