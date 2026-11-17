# Kararlar (DECISIONS)

Bu dosya, geliştirme sırasında belirsiz kalan konularda verilen kararları ve gerekçelerini listeler. İstediğin kararı değiştirebilirsin; ilgili dosya her maddede belirtilmiştir.

## Kalp güvenliği

1. **Profil limitleri** (`src/lib/safety.ts`)
   | Profil | Hedef RPE | En fazla RPE | Tekrar | Dinlenme (compound/izolasyon) | İzometrik en fazla |
   |---|---|---|---|---|---|
   | Hafif | 6–7 | 7 | 8–15 | 90 / 75 sn | 45 sn |
   | Orta | 5–6 | 6 | 10–15 | 105 / 90 sn | 30 sn |
   | Ciddi | 4–5 | 5 | 10–15 | 120 / 90 sn | 20 sn |

   Orta ve ciddi profillerde tekrar alt sınırı 10'a çekildi. Daha hafif yük ve daha fazla tekrar, kan basıncı yükünü azaltır.
2. **Mutlak RPE tavanı 7.** Hiçbir ayar bunu aşamaz. Tükenişe kadar set ve 1RM testi hiçbir yerde yoktur.
3. **"Ağır compound" tanımı:** Halter squat, trap bar deadlift ve ayakta halter omuz presi. Bu hareketler hafif profilde orta ağırlık ve 8–12 tekrarla yapılır. Orta ve ciddi profilde kapanır. Goblet squat ve dambıl RDL "ağır" sayılmadı, bu yüzden orta profilde açık kalır.
4. **"Ciddi" profilde makine/destekli kuralı:** `supported: true` olan hareketler (makine, oturarak, yatarak, tutunarak veya sehpa destekli) kalır. Kardiyo tarafında tempolu yürüyüş de kalır. Yürüyüş kardiyak rehabilitasyonun temel egzersizi olduğu için kapatılmadı.
5. **HIIT** yalnızca hafif profilde açılabilir. Profil orta veya ciddiye geçince otomatik kapanır. Semptom sonrası antrenmanda da kapalıdır. HIIT açıkken bile aralıklar "30 sn tempolu / 90 sn yavaş" şeklindedir ve RPE limiti geçilmez.
6. **Semptom sonrası "bir kademe düşürme":** Bir sonraki antrenmanda en fazla RPE −1 olur, hedef RPE −1 olur, dinlenme +15–30 sn uzar, izometrik süre −15 sn kısalır ve önerilen ağırlıklar ~%10 azalır. Ayrıca doktora danışma hatırlatması gösterilir. Bayrak, o antrenman semptomsuz tamamlanınca kalkar. Ayarlar'dan "Doktorumla görüştüm" ile elle de kaldırılabilir.
7. **Semptom listesine "göğüs ağrısı/baskı" eklendi.** Seçilirse 112'yi arama uyarısı gösterilir.
8. **Beta bloker:** Seçiliyse arayüzde nabız rehberi gösterilmez, sadece RPE ve konuşma testi esas alınır. Nabız limiti girilmişse ve beta bloker seçili değilse, nabız limiti DUR uyarısında ve yoğunluk rehberinde gösterilir.
9. **Isınma ve soğuma süreleri:** 30 dk seansta 5/5, 45 dk'da 7/5, 60 dk'da 10/7, 75 dk'da 10/10 dakika. Soğumada baş aşağı germe yoktur. Örneğin ayakta öne eğilme yerine oturarak arka bacak germe kullanılır.
10. **Baş aşağı / Valsalva filtresi:** Hareket verisinde `inverted` ve `valsalva` alanları var. Bu alanlar işaretli bir hareket eklenirse güvenlik filtresi onu her profilde otomatik olarak dışarıda bırakır. Testler de bunu kontrol eder.
11. Profildeki RPE limitinin üstünde bir RPE seçilirse sette kırmızı uyarı çıkar ve bir sonraki seans için ağırlık düşürme önerilir.

## Program

12. **Split'ler:** 2 gün için Tüm Vücut A/B, 3 gün için A/B/C, 4 gün için Üst A / Alt A / Üst B / Alt B, 5 gün için Üst A / Alt A / Kardiyo+Core / Üst B / Alt B.
13. **Hareket sayısı süreye göre belirlenir.** Her hareketin süresi şöyle hesaplanır: set × (45 sn çalışma + dinlenme) + 1,5 dk geçiş. Her günde en az 2 güç hareketi olur. Bu yüzden 30 dk seanslarda birkaç dakikalık taşma olabilir.
14. **Set sayısı:** 30 dk seansta 2, diğerlerinde 3.
15. **Hedefe göre kardiyo:** Kilo verme hedefinde 45 dk ve üzeri seanslara 15 dk (30 dk seansa 8 dk) kardiyo eklenir. Genel sağlık hedefinde 45 dk ve üzeri seanslara 10 dk eklenir. Kas hedefinde kardiyo eklenmez, sadece 5 günlük programın kardiyo gününde yer alır.
16. **Tekrar aralıkları:** Compound hareketlerde 8–12, izolasyon hareketlerinde 10–15. İkisi de profil limitlerinin içinde kalır.
17. **"Sıradaki antrenman" mantığı:** Program takvime değil sıraya bağlıdır. Antrenman tamamlanınca sıradaki güne geçilir, yani gün kaçırmak programı kaydırmaz. Program ekranından istenen gün "sıradaki" yapılabilir.
18. **Swap:** Bugün veya Program ekranından yapılan değişiklik kalıcıdır, o gün o slot için saklanır. Antrenman sırasında yapılan değişiklik sadece o seansa uygulanır (örneğin makine doluysa). Profil sonradan değişirse ve seçilen hareket yasaklı hale gelirse, aynı bölgedeki ilk güvenli harekete otomatik geçilir.
19. **Programı yeniden oluşturma** geçmiş kayıtları silmez. Sadece plan, swap'lar ve sıra sıfırlanır.

## Ekipman

20. **"Ev" ekipmanı** vücut ağırlığı ve direnç lastiği olarak tanımlandı. **"Dambıl"** dambıl ile sağlam bir sehpa veya sandalye anlamına gelir. **"Salon"** tüm makineleri ve serbest ağırlıkları kapsar. Her bölgede her ekipman için en az bir hareket bulunur, bu da testle doğrulanır.
21. Bir bölgenin "en iyi seçim" hareketi kullanıcının ekipmanında yoksa, o ekipmana uygun ilk alternatif kullanılır.

## Ağırlık önerileri ve takip

22. **Başlangıç ağırlığı** vücut ağırlığı × hareket katsayısı olarak hesaplanır ve bilerek muhafazakâr tutulmuştur (örneğin leg press için 0,6 × VA). Katsayılar `exercises.ts` içindeki `startFactor` alanındadır. Dambıl hareketlerinde değer **tek dambılın** ağırlığıdır.
23. **Otomatik doldurma:** Ağırlık ve tekrar son seanstan gelir. Ağırlık düşürme önerisi, başlangıç önerisi veya semptom sonrası hafifletme varsa ağırlık otomatik olarak öneriye çekilir. Artış önerisi ise otomatik uygulanmaz, karta yazılır ve kullanıcı kendisi artırır. **RPE alanı bilerek boş gelir.** Önceki RPE'nin kopyalanması, overload kararını yanıltabilirdi.
24. **Artış eşiği** = min(6, profil en fazla RPE − 1). Hafif profilde bu, kuraldaki "RPE ≤ 6" ile aynıdır. Orta profilde 5, ciddi profilde 4 olur. RPE girilmemiş setlerde artış önerilmez.
25. **Vücut ağırlığı ile yapılan hareketlerde** (şınav, lastik vb.) artış önerisi kg yerine "zorluğu artır veya alternatif seç" şeklinde gösterilir.
26. **Kişisel rekor:** Hareket başına en yüksek ağırlık, eşitlikte en çok tekrar. 1RM tahmini yapılmaz.
27. **Seri (streak)** günlük değil **haftalık** sayılır: en az bir antrenman yapılan ardışık haftalar. Haftada 2–5 gün çalışan bir program için günlük seri anlamsızdı. Bu hafta henüz antrenman yoksa seri geçen haftadan sayılır ve bozulmaz.
28. **Vücut kayıtlarında** tansiyon 140/90 ve üstü veya 90'ın altı ile dinlenik nabız 100'ün üstü veya 50'nin altı olursa "tekrar ölç, devam ederse doktoruna danış" uyarısı gösterilir.

## Teknik

29. **React Router kullanılmadı.** Sekmeler state ile yönetiliyor. Böylece GitHub Pages alt yolunda (`/fit-deneme/`) yenileme veya derin bağlantı sorunu oluşmaz. Ek güvence olarak deploy sırasında `404.html` da kopyalanır.
30. **`base` yolu** dev, preview ve build modlarının hepsinde `/fit-deneme/` olarak ayarlandı. PWA `scope` ve `start_url` bu yola bağlıdır. Böylece service worker yerelde de üretimdeki gibi davranır.
31. **TypeScript 5.9 kullanıldı.** npm'deki son sürüm 7.x olsa da Vite ve tsconfig ekosisteminde en olgun sürüm olduğu için tercih edildi.
32. **İstatistik sayfası (Recharts) ayrı bir parça** olarak yükleniyor (lazy). Bu, ilk açılış paketini yaklaşık yarıya indirdi. Service worker tüm parçaları önbelleğe aldığı için uygulama offline da çalışır.
33. **Dışa aktarma:** Telefon destekliyorsa paylaş menüsü (Web Share) açılır. Desteklemiyorsa dosya indirilir. İçe aktarma mevcut kayıtların **yerine geçer**, birleştirme yapmaz. Bu, aynı antrenmanın iki kez kaydedilmesini önler.
34. **Tüm verileri silme**, kazara silmeyi önlemek için onay penceresinde `SİL` yazılmasını ister.
35. **Dinlenme sayacı** bittiğinde titreşim (Android) ve 3 kısa bip (Web Audio) ile uyarır. iOS Safari titreşimi desteklemez; orada sadece ses ve ekrandaki uyarı çalışır. Ekran kilitliyken tarayıcılar zamanlayıcıları durdurabilir.
36. **Uyarı ekranı** bir kez onaylanınca bir daha gösterilmez. Ayarlar → Hakkında bölümünden tekrar okunabilir. Yedekten geri yükleme sonrasında da tekrar gösterilmez.
