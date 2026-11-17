import { useState } from 'react'
import { Button, Card } from '../components/ui'

export const DISCLAIMER_POINTS = [
  'Bu uygulama genel bilgi amaçlıdır; tanı veya tedavi sunmaz.',
  'Triküspit yetmezliği dahil her kalp durumunda egzersiz planını kardiyoloğunla konuşmalısın.',
  'Antrenman sırasında göğüs ağrısı, baş dönmesi, çarpıntı, olağandışı nefes darlığı veya bacak/ayak bileği şişmesi olursa hemen dur ve doktoruna danış.',
  'Program; nefes tutmayı (ıkınma), tükenişe kadar setleri, 1RM testlerini ve baş aşağı pozisyonları içermez. Yine de vücudunu dinle.',
  'Tüm veriler sadece bu cihazda saklanır. Düzenli olarak yedek (JSON) almanı öneririz.',
]

export function Disclaimer({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false)
  return (
    <main className="pt-safe mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <div className="text-5xl" aria-hidden>
          ❤️
        </div>
        <h1 className="mt-2 text-2xl font-bold">Önemli Uyarı</h1>
      </div>
      <Card className="border-danger/40">
        <p className="mb-4 text-lg font-bold text-danger">Bu program kardiyolog önerisinin yerine geçmez.</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {DISCLAIMER_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>
      <label className="mt-5 flex min-h-12 items-center gap-3 rounded-xl bg-card p-3">
        <input
          type="checkbox"
          className="h-6 w-6 accent-[var(--app-accent)]"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span className="font-medium">Okudum, anladım.</span>
      </label>
      <Button className="mt-4 w-full" disabled={!checked} onClick={onAccept}>
        Devam et
      </Button>
    </main>
  )
}
