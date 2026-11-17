import { useRef, useState } from 'react'
import { Button, Card, Chip, Modal, PageHeader, SectionTitle, Toggle } from '../components/ui'
import { useApp } from '../lib/appContext'
import { BODY_GOAL_LABELS, SOURCES } from '../lib/advice'
import { makeBackup, parseBackup } from '../lib/backup'
import { db, getSettings, wipeAll } from '../lib/db'
import { todayStr } from '../lib/dates'
import { SEVERITY_LABELS, getLimits } from '../lib/safety'
import type { BodyGoal, HeartProfile, Level, Severity } from '../lib/types'
import { DISCLAIMER_POINTS } from './Disclaimer'
import { LEVEL_LABELS } from './Setup'

const SEVERITY_INFO: Record<Severity, string> = {
  hafif: 'RPE 6–7, tekrar 8–15. Squat, trap bar deadlift, ayakta omuz presi gibi compound hareketler orta ağırlıkta yapılabilir.',
  orta: 'RPE en fazla 6. Ağır compound hareketler (halter squat, trap bar deadlift, ayakta omuz presi) kapanır.',
  ciddi: 'RPE en fazla 5. Sadece makine ve destekli (oturarak/yatarak/tutunarak) hareketler kalır. HIIT kapalı.',
}

export function SettingsPage() {
  const { settings, update, openSetup } = useApp()
  const p = settings.profile
  const setProfile = (patch: Partial<HeartProfile>) => update({ profile: { ...p, ...patch } })
  const limits = getLimits(p)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [wipeText, setWipeText] = useState('')
  const [importData, setImportData] = useState<ReturnType<typeof parseBackup> | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [hrText, setHrText] = useState(p.maxHr ? String(p.maxHr) : '')

  const doExport = async () => {
    const [s, workouts, bodyLogs, exerciseLogs, weekNotes] = await Promise.all([
      getSettings(),
      db.workouts.toArray(),
      db.bodyLogs.toArray(),
      db.exerciseLogs.toArray(),
      db.weekNotes.toArray(),
    ])
    const blob = new Blob([JSON.stringify(makeBackup(s, workouts, bodyLogs, exerciseLogs, weekNotes), null, 2)], { type: 'application/json' })
    const name = `fit-yedek-${todayStr()}.json`
    const file = new File([blob], name, { type: 'application/json' })
    // Telefonda paylaş menüsü (Dosyalara kaydet, Drive, e-posta…) varsa onu kullan
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: 'Fit yedek' })
        setMsg({ ok: true, text: 'Yedek paylaşıldı.' })
        return
      } catch {
        /* kullanıcı iptal etti → indirme ile devam */
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg({ ok: true, text: `${name} indirildi.` })
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const data = parseBackup(await f.text())
      setImportData(data)
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const doImport = async () => {
    if (!importData) return
    await db.transaction('rw', [db.settings, db.workouts, db.bodyLogs, db.exerciseLogs, db.weekNotes], async () => {
      await db.workouts.clear()
      await db.bodyLogs.clear()
      await db.exerciseLogs.clear()
      await db.weekNotes.clear()
      await db.workouts.bulkAdd(importData.workouts.map(({ id: _id, ...w }) => w))
      await db.bodyLogs.bulkAdd(importData.bodyLogs.map(({ id: _id, ...b }) => b))
      await db.exerciseLogs.bulkAdd(importData.exerciseLogs.map(({ id: _id, ...l }) => l))
      await db.weekNotes.bulkPut(importData.weekNotes)
      if (importData.settings) await db.settings.put({ ...importData.settings, disclaimerAccepted: true, id: 'main' })
    })
    setImportData(null)
    setMsg({ ok: true, text: 'Yedek geri yüklendi.' })
  }

  return (
    <div>
      <PageHeader title="Ayarlar" />

      <SectionTitle>❤️ Kalp profili</SectionTitle>
      <Card>
        <p className="mb-2 text-sm font-medium">Triküspit yetmezliği derecesi</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
            <Chip key={s} active={p.severity === s} onClick={() => setProfile({ severity: s, hiit: s === 'hafif' ? p.hiit : false })}>
              {SEVERITY_LABELS[s]}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{SEVERITY_INFO[p.severity]}</p>

        <div className="mt-4 rounded-xl bg-card2 p-3 text-sm">
          <p className="font-semibold">Aktif limitler</p>
          <p className="text-muted">
            RPE {limits.targetRpe[0]}–{limits.targetRpe[1]} (en fazla {limits.maxRpe}) · {limits.repMin}–{limits.repMax} tekrar · dinlenme{' '}
            {limits.restIsolationSec}–{limits.restCompoundSec} sn · izometrik en fazla {limits.maxIsometricSec} sn
          </p>
        </div>

        <label className="mt-4 block">
          <span className="block font-medium">Maksimum nabız limiti (opsiyonel)</span>
          <span className="block text-sm text-muted">Doktorun bir limit verdiyse gir; boş bırakabilirsin.</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="ör. 130"
            className="mt-2 h-12 w-full rounded-xl border border-line bg-bg px-3 text-lg"
            value={hrText}
            onChange={(e) => setHrText(e.target.value)}
            onBlur={() => {
              const n = parseInt(hrText, 10)
              const v = Number.isFinite(n) && n >= 60 && n <= 220 ? n : null
              setHrText(v ? String(v) : '')
              void setProfile({ maxHr: v })
            }}
          />
        </label>

        <div className="mt-2 divide-y divide-line">
          <Toggle
            label="Beta bloker kullanıyorum"
            hint="Seçiliyse nabız yerine RPE (algılanan zorluk) esas alınır."
            checked={p.betaBlocker}
            onChange={(v) => setProfile({ betaBlocker: v })}
          />
          <Toggle
            label="HIIT (aralıklı yüksek yoğunluk)"
            hint={p.severity === 'hafif' ? 'Varsayılan kapalı. Açmadan önce doktoruna danış.' : 'Sadece hafif profilde açılabilir.'}
            checked={p.hiit && p.severity === 'hafif'}
            disabled={p.severity !== 'hafif'}
            onChange={(v) => setProfile({ hiit: v })}
          />
        </div>
        {settings.symptomFlag && (
          <div className="mt-3 rounded-xl bg-warn/10 p-3 text-sm">
            <p className="text-warn">Semptom bayrağı aktif: sıradaki antrenman hafifletilecek.</p>
            <button className="mt-1 text-accent underline" onClick={() => update({ symptomFlag: null })}>
              Doktorumla görüştüm, bayrağı kaldır
            </button>
          </div>
        )}
      </Card>

      <SectionTitle>🎯 Hedef ve deneyim</SectionTitle>
      <Card className="space-y-3">
        <div>
          <p className="mb-2 text-sm font-medium">Vücut ağırlığı hedefi</p>
          <div className="grid gap-2">
            {(Object.keys(BODY_GOAL_LABELS) as BodyGoal[]).map((g) => (
              <Chip key={g} active={settings.bodyGoal === g} onClick={() => update({ bodyGoal: g })}>
                {BODY_GOAL_LABELS[g]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Antrenman deneyimi</p>
          <div className="grid gap-2">
            {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
              <Chip key={l} active={settings.level === l} onClick={() => update({ level: l })}>
                {LEVEL_LABELS[l]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Haftalık beklenen kilo artışı buna göre hesaplanır.</p>
        </div>
        <Button variant="secondary" className="w-full" onClick={openSetup}>
          Planı baştan kur
        </Button>
      </Card>

      <SectionTitle>🎨 Görünüm</SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Chip active={settings.theme === 'dark'} onClick={() => update({ theme: 'dark' })}>
            🌙 Koyu
          </Chip>
          <Chip active={settings.theme === 'light'} onClick={() => update({ theme: 'light' })}>
            ☀️ Açık
          </Chip>
        </div>
      </Card>

      <SectionTitle>💾 Veri</SectionTitle>
      <Card className="space-y-2">
        <p className="text-sm text-muted">Tüm veriler sadece bu cihazda (IndexedDB) tutulur. Düzenli yedek al.</p>
        <Button className="w-full" onClick={doExport}>
          Dışa aktar (JSON yedek)
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
          İçe aktar (yedekten geri yükle)
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {msg && <p className={`text-sm ${msg.ok ? 'text-ok' : 'text-danger'}`}>{msg.text}</p>}
        <Button variant="danger" className="w-full" onClick={() => setWipeOpen(true)}>
          Tüm verileri sil
        </Button>
      </Card>

      <SectionTitle>ℹ️ Hakkında</SectionTitle>
      <Card>
        <Button variant="ghost" className="w-full" onClick={() => setSourcesOpen(true)}>
          Tavsiyelerin kaynakları
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setAboutOpen(true)}>
          Sağlık uyarısını göster
        </Button>
      </Card>

      <Modal open={!!importData} onClose={() => setImportData(null)} title="Yedek geri yüklensin mi?">
        {importData && (
          <>
            <p className="mb-2 text-sm">
              {importData.exerciseLogs.length} hareket kaydı, {importData.bodyLogs.length} vücut kaydı ve {importData.workouts.length} eski antrenman bulundu
              {importData.exportedAt ? ` (${new Date(importData.exportedAt).toLocaleString('tr-TR')})` : ''}.
            </p>
            <p className="mb-4 text-sm text-danger">Bu cihazdaki mevcut kayıtların yerine geçecek.</p>
            <div className="grid gap-2">
              <Button onClick={doImport}>Geri yükle</Button>
              <Button variant="secondary" onClick={() => setImportData(null)}>
                Vazgeç
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={wipeOpen}
        onClose={() => {
          setWipeOpen(false)
          setWipeText('')
        }}
        title="Tüm veriler silinsin mi?"
      >
        <p className="mb-2 text-sm">
          Hareket kayıtları, vücut kayıtları, plan ve ayarlar <b>kalıcı olarak</b> silinecek. Önce yedek almanı öneririz.
        </p>
        <p className="mb-2 text-sm">Onaylamak için <b>SİL</b> yaz:</p>
        <input
          className="mb-4 h-12 w-full rounded-xl border border-line bg-bg px-3 text-lg"
          value={wipeText}
          onChange={(e) => setWipeText(e.target.value)}
          autoCapitalize="characters"
        />
        <div className="grid gap-2">
          <Button
            variant="danger"
            disabled={!['SİL', 'SIL'].includes(wipeText.trim().toLocaleUpperCase('tr'))}
            onClick={async () => {
              await wipeAll()
              await getSettings()
              setWipeOpen(false)
              setWipeText('')
            }}
          >
            Kalıcı olarak sil
          </Button>
          <Button variant="secondary" onClick={() => setWipeOpen(false)}>
            Vazgeç
          </Button>
        </div>
      </Modal>

      <Modal open={sourcesOpen} onClose={() => setSourcesOpen(false)} title="Kaynaklar">
        <p className="mb-3 text-sm text-muted">
          Tavsiyeler bu kaynaklardaki ilkelerden türetilmiş, internet gerektirmeyen kurallardır. Haftalık beklenen aralıklar yaklaşık değerlerdir ve kalp profiline göre düşürülür.
        </p>
        <ul className="space-y-3 text-sm">
          {SOURCES.map((src) => (
            <li key={src.id} className="rounded-xl bg-card2 p-3">
              <p className="font-semibold">{src.title}</p>
              <p className="mt-1 text-muted">{src.detail}</p>
              {src.url && (
                <a className="mt-1 inline-block text-accent underline" href={src.url} target="_blank" rel="noreferrer">
                  Kaynağa git
                </a>
              )}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="Sağlık uyarısı">
        <p className="mb-3 font-bold text-danger">Bu program kardiyolog önerisinin yerine geçmez.</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {DISCLAIMER_POINTS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
