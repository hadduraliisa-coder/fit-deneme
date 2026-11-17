import type { Symptom } from '../lib/types'

export const SYMPTOM_LABELS: Record<Symptom, string> = {
  carpinti: 'Çarpıntı',
  nefes: 'Nefes darlığı',
  basdonmesi: 'Baş dönmesi',
  sislik: 'Bacak/ayak bileği şişliği',
  gogusagrisi: 'Göğüs ağrısı / baskı',
}

export const FEELINGS = [
  { v: 1, e: '😣', t: 'Çok kötü' },
  { v: 2, e: '😕', t: 'Kötü' },
  { v: 3, e: '😐', t: 'Normal' },
  { v: 4, e: '🙂', t: 'İyi' },
  { v: 5, e: '😄', t: 'Harika' },
]
