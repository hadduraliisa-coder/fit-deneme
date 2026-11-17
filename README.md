# fit-deneme – Kalp Dostu Antrenman Takibi

Hafif triküspit yetmezliği (tricuspid regurgitation) göz önünde bulundurularak hazırlanmış, **mobil öncelikli**, Türkçe bir fitness takip uygulaması. Tüm veriler telefonunda (IndexedDB) saklanır. Sunucu ve hesap yoktur, internet olmadan da çalışır (PWA).

> ⚠️ **Bu program kardiyolog önerisinin yerine geçmez.** Göğüs ağrısı, baş dönmesi, çarpıntı, olağandışı nefes darlığı veya bacak/ayak bileği şişmesi olursa antrenmanı bırak ve doktoruna danış.

**Uygulama adresi:** https://hadduraliisa-coder.github.io/fit-deneme/
(GitHub Pages açıldıktan ve ilk deploy bittikten sonra çalışır, aşağıya bak.)

## Özellikler

- **Kalp profili:** hafif / orta / ciddi. Seçime göre RPE limiti, tekrar aralığı, dinlenme süresi, izometrik süre ve izin verilen hareketler otomatik değişir. Opsiyonel nabız limiti ve "beta bloker kullanıyorum" seçeneği var. HIIT varsayılan olarak kapalıdır.
- **Hareket kütüphanesi:** 11 bölgede 44 hareket bulunur. Her bölgede 1 "en iyi seçim" ve 3 alternatif var. Salon, ev ve dambıl varyasyonları mevcut. Her kartta adım adım anlatım, sık yapılan hatalar, nefes talimatı ve kalp güvenliği notu yer alır. Veriler `src/data/exercises.ts` dosyasındadır, istediğin gibi düzenleyebilirsin.
- **Program oluşturucu:** Haftada 2–5 gün, 30–75 dk seans, ekipman ve hedef seçilir. 2–3 gün için Tüm Vücut, 4 gün için Üst/Alt, 5 gün için Üst/Alt + Kardiyo/Core programı oluşur. Her antrenman ısınma ile başlar, soğuma ile biter. Hareket değiştirme (swap) özelliği var. Bir günü kaçırırsan program kaymaz.
- **Antrenman takibi:** Büyük +/− butonlarıyla ağırlık, tekrar ve RPE girilir. Son seansın değerleri otomatik dolar. Dinlenme sayacı titreşim ve sesle uyarır. Ekranda her zaman bir **DUR** uyarısı görünür.
- **Progressive overload:** Tüm setlerde üst tekrar sınırına RPE ≤ 6 ile ulaşırsan artış önerilir (üst vücut +1–2,5 kg, alt vücut +2,5–5 kg). RPE 7'de ağırlık aynı kalır. Limit aşılırsa ağırlığı düşürmen önerilir.
- **Sağlık takibi:** Vücut ağırlığı, bel çevresi, dinlenik nabız ve tansiyon kaydedilebilir. Antrenman sonrası "nasıl hissettim" notu ve semptom işaretleme yapılır. Semptom girersen bir sonraki antrenman bir kademe hafifletilir.
- **İstatistikler:** Hareket bazında ilerleme grafiği, haftalık hacim, kas grubu başına set sayısı, vücut ağırlığı grafiği, haftalık seri, takvim, geçmiş ve kişisel rekorlar (1RM hesaplanmaz).
- **Ayarlar:** Kalp profili, programı yeniden oluşturma, koyu/açık tema, JSON yedek alma ve geri yükleme, tüm verileri silme.

## GitHub Pages'i açma (bir kerelik)

1. GitHub'da repoyu aç: `https://github.com/hadduraliisa-coder/fit-deneme`
2. Üst menüden **Settings** (Ayarlar) sekmesine gir.
3. Sol menüde **Pages**'e tıkla.
4. **Build and deployment** bölümünde **Source** olarak **GitHub Actions**'ı seç. Kaydet butonu yoktur, seçim otomatik kaydedilir.
5. Üst menüden **Actions** sekmesine geç. **"GitHub Pages'e deploy"** iş akışını seç ve **Run workflow → Run workflow** ile elle başlat. Bundan sonra `main` dalına yapılan her push'ta otomatik çalışır.
6. İş akışı yeşil tik ile bitince (1–2 dk) uygulama şu adreste açılır:
   **https://hadduraliisa-coder.github.io/fit-deneme/**

> Repo adını değiştirirsen ek bir ayar gerekmez: iş akışı yeni adı `REPO_NAME` olarak otomatik iletir. Yerel derlemede ise `vite.config.ts` içindeki varsayılan adı güncelle.

## Telefona uygulama olarak ekleme (PWA)

**Android (Chrome):**
1. Uygulama adresini Chrome'da aç.
2. Sağ üstteki **⋮** menüsüne dokun, ardından **Ana ekrana ekle** veya **Uygulamayı yükle**'yi seç.
3. Ana ekrandaki **Fit** simgesiyle tam ekran açılır.

**iPhone (Safari):**
1. Adresi **Safari**'de aç (Chrome'da bu seçenek yoktur).
2. Alttaki **Paylaş** (kare ve ok) butonuna dokun.
3. **Ana Ekrana Ekle**'yi seç, ardından **Ekle**'ye dokun.

Uygulama bir kez açıldıktan sonra internet olmadan da çalışır. Yeni sürümler, internete bağlıyken uygulamayı açtığında otomatik yüklenir.

## Verileri yedekleme ve geri yükleme

Veriler **sadece o telefonun tarayıcısında** saklanır. Tarayıcı verilerini silersen, uygulamayı kaldırırsan veya telefon değiştirirsen kaybolur. Bu yüzden düzenli olarak yedek al.

**Yedek alma:**
1. **Ayarlar → Veri → Dışa aktar (JSON yedek)**'e dokun.
2. Telefonda paylaş menüsü açılır. Dosyayı **Dosyalar / Google Drive / iCloud Drive**'a kaydet ya da kendine e-postayla gönder. Paylaşım desteklenmiyorsa `fit-yedek-YYYY-AA-GG.json` dosyası indirilir.

**Geri yükleme:**
1. **Ayarlar → Veri → İçe aktar (yedekten geri yükle)**'ye dokun.
2. Yedek `.json` dosyasını seç.
3. Kaç antrenman ve kayıt bulunduğu gösterilir. **Geri yükle** dersen bu cihazdaki mevcut kayıtların yerine yedektekiler gelir.

**Tüm verileri silme:** **Ayarlar → Veri → Tüm verileri sil**'e dokun. Onay için `SİL` yazman gerekir.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173/fit-deneme/
npm test           # Vitest unit testleri
npm run build      # dist/ klasörüne üretim derlemesi
npm run preview    # derlemeyi yerelde dene
```

Teknolojiler: Vite, React, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), Recharts ve vite-plugin-pwa.

Önemli dosyalar:
- `src/data/exercises.ts`: hareket kütüphanesi (düzenlenebilir)
- `src/lib/safety.ts`: kalp profili limitleri ve hareket filtreleri
- `src/lib/program.ts`: program oluşturucu
- `src/lib/overload.ts`: progressive overload kuralları
- `DECISIONS.md`: geliştirme sırasında verilen kararlar
