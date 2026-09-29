# Ruhnevâz 🌙
### Günlük Manevi Rehberiniz

![Expo](https://img.shields.io/badge/Expo_54-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Ruhnevâz**, namaz vakitlerinden Kur'an-ı Kerim okumaya, zikirden hafızlığa kadar günlük ibadet hayatını tek bir sade ve huzurlu arayüzde toplayan İslami yaşam asistanıdır. Türkçe ve İngilizce. iOS ve Android.

---

## ✨ Özellikler

**Namaz**
- GPS veya dünya geneli şehir aramasıyla konum; ülkeye göre otomatik hesaplama yöntemi (Türkiye: Diyanet)
- Aylık takvim önbelleği → çevrimdışı çalışır; **12 güne kadar** önceden planlanmış bildirimler
- Vakit başı bildirim ayarı, ses seçimi (Ruhnevâz çanı / sistem / sessiz), "X dk önce hatırlat"
- Namaz takibi (günlük 5 vakit, seri, haftalık grafik) ve **kaza namazı sayacı**
- Aylık **imsakiye** (görsel olarak paylaşılabilir)
- **Ramazan modu**: iftar/imsak geri sayımı, oruç takibi
- Hicri takvim, kandil ve bayram bildirimleri

**Kur'an-ı Kerim**
- Meal, Hafız (mushaf akışı), Sayfa (KFGQPC görselleri) ve Kırık Meal (kelime kelime) modları
- 7 Türkçe + 4 İngilizce meal; ayet bazında **meal karşılaştırma** ve tefsir (EN)
- **Sesli okuma**: 8 hafız, ayet ayet takip, A-B tekrar
- Okuma ayarları: 4 Arapça font, boyut, satır aralığı; sepya / siyah stil tüm uygulamaya uygulanır
- **Hatim takibi**: sayfa işaretleme, günlük hedef, tahmini bitiş
- Ayet paylaşım kartı (Instagram-hazır görsel)

**Zikir & Dua**
- Zikirmatik, rehberli **namaz sonrası tesbihat** akışı (33-33-33)
- 46 dua/zikir: sabah-akşam, namaz sonrası, günlük, Kur'an ve Peygamber duaları (Arapça, okunuş, TR/EN anlam, kaynak)
- Esmâ-ül Hüsnâ

**Diğer**
- Hadis kütüphanesi (6 Türkçe koleksiyon), hafızlık modülü (aralıklı tekrar), Kur'an kelimeleri
- Kıble pusulası (yumuşatılmış heading, kalibrasyon bilgisi)
- **Widget'lar**: iOS ana ekran + kilit ekranı (günün ayeti/hadisi, sıradaki vakit canlı geri sayım), Android ana ekran
- Hesapsız yedekleme (JSON dışa/içe aktarma), sistem temasını izleyen karanlık mod, haptik geri bildirim

---

## 🛠 Mimari

```
App.tsx                 Font yükleme, hydrate, AppState → refresh
navigation/             React Navigation (native stack; Home is a card hub)
screens/                Yeni ekranlar (Home, Prayer, Dhikr, More, Settings, Onboarding, …)
components/             Reader, legacy modüller (Hadith*, Memorization*, QuranLearn*), ui/ kit
store/                  Zustand: settings · prayer · quran · library
services/               prayerTimes · notifications · hijri · widgets · quranAudio · quranExtras · backup · api · hadith
i18n/                   tr / en
data/                   dailyContent (103 öğe, offline) · duas · prayerMessages · turkeyCities · quranWords
targets/widget/         iOS WidgetKit (Swift) — @bacons/apple-targets
widgets/                Android widget render (react-native-android-widget)
proxy/                  Vercel edge fonksiyonu (AI kelime açıklaması; anahtar sunucuda)
```

---

## 🚀 Kurulum

```bash
npm install
npx expo start            # Expo Go (widget'lar ve ses hariç çoğu özellik çalışır)
npx expo prebuild --clean # native proje (widget'lar için gerekli)
npx expo run:ios          # veya: eas build --platform ios --profile development
```

İsteğe bağlı AI özelliği için `proxy/README.md`.

---

## 📦 Yayın

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```

Gizlilik politikası: [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md)

---

Geliştirici: **Mehmet Taha Uyar** · *Ruhnevâz — Maneviyatınızı cebinizde taşıyın.*
