# Ruhnevâz Gizlilik Politikası

**Son güncelleme:** 30 Eylül 2026
**Geliştirici:** Mehmet Taha Uyar
**İletişim:** mehmettahauyarr@gmail.com

Ruhnevâz ("Uygulama"), iOS ve Android için geliştirilmiş bir İslami yaşam asistanıdır. Bu politika, Uygulamayı kullanırken hangi verilerin işlendiğini ve nasıl korunduğunu açıklar.

## 1. Hesap ve kişisel veri

Uygulama hesap açmanızı, kayıt olmanızı veya ad, e-posta, telefon gibi kişisel bilgiler girmenizi istemez. Kullanıcıları tanımlayan hiçbir veri toplanmaz, saklanmaz veya üçüncü taraflara aktarılmaz.

## 2. Cihazda saklanan veriler

Aşağıdaki veriler **yalnızca cihazınızda** (uygulamanın yerel depolama alanında) tutulur ve geliştiriciye ya da başka bir sunucuya gönderilmez:

- Tema tercihi (aydınlık / karanlık)
- Son okunan sure ve ayet
- Kaydettiğiniz ayetler, hadisler ve okuma geçmişi
- Zikir sayaçları
- Hafızlık ve kelime öğrenme ilerlemeniz
- Seçtiğiniz şehir ve namaz hatırlatma tercihleri
- Çevrimdışı kullanım için önbelleğe alınan hadis ve Kur'an verisi

Uygulamayı sildiğinizde bu veriler cihazınızdan kaldırılır.

## 3. Konum bilgisi

Uygulama konumunuzu iki amaçla ve yalnızca **siz izin verdiğinizde**, **yalnızca uygulama açıkken** ("Uygulamayı Kullanırken") kullanır. Arka planda konum okunmaz.

- **Kıble pusulası:** Kıble yönü tamamen cihaz üzerinde hesaplanır; bu amaçla konum hiçbir sunucuya gönderilmez.
- **Namaz vakitleri (isteğe bağlı):** "Konumumu kullan" seçeneğini kullanırsanız, iki ondalık basamağa yuvarlanmış enlem/boylam (yaklaşık 1 km hassasiyet) yalnızca vakit hesaplaması için Aladhan servisine gönderilir. Bu bilgi sizinle ilişkilendirilmez ve geliştirici tarafından saklanmaz. Dilerseniz şehrinizi elle seçebilirsiniz.
- İzni cihaz ayarlarından istediğiniz zaman kaldırabilirsiniz; kıble pusulası dışındaki tüm özellikler konum izni olmadan çalışır.

### Widget'lar

Ana ekran ve kilit ekranı widget'ları, uygulamanın cihaz üzerinde tuttuğu namaz takvimi ve günlük içerik listesini okur. Bu veri cihazdan çıkmaz.

## 4. Bildirimler

Namaz vakti hatırlatmalarını açarsanız bildirimler cihazınızda **yerel olarak** planlanır. Push bildirim sunucusu veya cihaz kimliği (push token) kullanılmaz.

## 5. Üçüncü taraf içerik servisleri

Kur'an-ı Kerîm'in Arapça metni, Diyanet meali ile Buhârî ve Müslim hadis koleksiyonları uygulamanın içinde gelir ve internetsiz okunur. Bunların dışındaki içerikler için uygulama aşağıdaki açık servislere internet üzerinden istek gönderir. Bu isteklerde yalnızca istenen içerik parametreleri (sure numarası, hadis koleksiyonu, şehir adı gibi) ve standart ağ bilgileri (IP adresi) iletilir; kimlik bilgisi paylaşılmaz.

| Servis | Amaç |
|---|---|
| api.alquran.cloud | Ek meal seçenekleri ve meal karşılaştırma |
| api.aladhan.com | Diyanet İşleri Başkanlığı yöntemine göre namaz vakitleri |
| cdn.jsdelivr.net (fawazahmed0/hadith-api) | Ebû Dâvûd, Tirmizî, Nesâî, İbn Mâce koleksiyonları ve hadislerin Arapça metni |
| api.quran.com, api.acikkuran.com, acikkaynakkuran-dev.diyanet.gov.tr | Kelime kelime Kur'an verisi |
| raw.githubusercontent.com (QuranHub) | Mushaf sayfa görselleri |
| cdn.islamic.network | Sesli Kur'an (ayet ayet mp3 akışı) |
| api.quran.com | Tefsir metinleri (İngilizce) |
| Apple / Google konum servisleri | Şehir aramasında yer adı ↔ koordinat dönüşümü (cihaz geocoder) |

Bu servislerin kendi gizlilik politikaları geçerlidir.

## 6. Yapay zekâ destekli açıklamalar (isteğe bağlı)

Kelime öğrenme modülündeki "AI ile Derinlemesine Öğren" özelliği etkinse, seçtiğiniz kelimenin Arapça yazımı, kökü ve Türkçe anlamı geliştiriciye ait bir aracı sunucu üzerinden bir yapay zekâ servisine (Anthropic) gönderilir ve açıklama üretilir. Bu istekte kişisel veri, konum veya cihaz kimliği yer almaz. Üretilen açıklama cihazınızda önbelleğe alınır.

## 7. Analitik, reklam ve takip

Uygulama analitik SDK'sı, reklam ağı veya kullanıcı takip aracı içermez.

## 8. Çocukların gizliliği

Uygulama kişisel veri toplamadığı için her yaştan kullanıcı tarafından güvenle kullanılabilir.

## 9. Değişiklikler

Bu politika güncellendiğinde yeni sürüm bu sayfada yayınlanır ve "Son güncelleme" tarihi değiştirilir.

## 10. İletişim

Sorularınız için: **mehmettahauyarr@gmail.com**
