# fit-deneme – Kalp Dostu Antrenman Takibi

Planını kendin yazdığın, her hareketin kilosunu ve vücut ağırlığını **haftalık** takip ettiğin, **mobil öncelikli** Türkçe bir uygulama. Hafif triküspit yetmezliği (tricuspid regurgitation) göz önünde bulundurularak hazırlandı. Tüm veriler telefonunda (IndexedDB) saklanır. Sunucu ve hesap yoktur, internet olmadan da çalışır (PWA).

> ⚠️ **Bu program kardiyolog önerisinin yerine geçmez.** Göğüs ağrısı, baş dönmesi, çarpıntı, olağandışı nefes darlığı veya bacak/ayak bileği şişmesi olursa antrenmanı bırak ve doktoruna danış.

**Uygulama adresi:** https://hadduraliisa-coder.github.io/fit-deneme/
(## Özellikler

- **Planım:** Günlerini (ör. "Pazartesi – Üst") ve hareketlerini kendin yazarsın. Hareketleri 44 hareketlik kütüphaneden seçebilir ya da kendi hareketini ekleyebilirsin. Her hareket için set sayısı, tekrar aralığı ve not girilir; sıralama değiştirilebilir. İstersen kalp profiline uygun hazır bir şablonla başlayıp onu düzenleyebilirsin.
- **Bu Hafta:** Her hareket için kilo, setlerdeki tekrar sayıları ve en zor setin RPE'si girilir. Önceki haftanın kaydı ve bu haftanın hedefi (artır, aynı kal ya da azalt) gerekçesiyle birlikte gösterilir. Geçmiş haftalara geri dönüp kayıt girilebilir. Hafta sonunda nasıl hissettiğini ve varsa semptomları not edersin.
- **İlerleme:** Her hareket için haftalık kilo değişimi (kg ve %) ve "olması gereken" kilo aralığı gösterilir. Durum beklentinin gerisinde, aralıkta, hızlı ya da çok hızlı olarak etiketlenir. Grafikte senin kilon ile beklenen alt ve üst sınır çizgileri birlikte görünür. Haftalık toplam hacim ve haftalık seri de bu ekranda.
- **Vücut:** Tartı, bel çevresi, dinlenik nabız ve tansiyon kaydedilir. Haftalık ortalama kilo ve haftalık değişim gösterilir. Hedefine göre (kas kazanmak, kilo vermek, korumak) haftada kaç kg değişmen gerektiği söylenir. Ani kilo artışında sıvı birikimi (ödem) uyarısı çıkar.
- **Tavsiyeler:** İnternet gerektirmez; ACSM, AHA ve spor beslenmesi literatürüne dayalı kurallardan üretilir. Kaynak listesi **Ayarlar → Tavsiyelerin kaynakları** bölümündedir. Tavsiyeler kalp profilindeki RPE ve hareket limitlerini asla aşmaz.
- **Kalp güvenliği:** Hafif, orta ve ciddi profil seçilebilir. Ekranda her zaman DUR uyarısı görünür. Riskli hareketlerde uyarı çıkar. Semptom bildirirsen hedefler bir kademe hafifler.
- **Ayarlar:** Hedef, deneyim seviyesi, kalp profili, koyu/açık tema, JSON yedek alma ve geri yükleme, tüm verileri silme.

şturma, koyu/açık tema, JSON yedek alma ve geri yükleme, tüm verileri silme.

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
