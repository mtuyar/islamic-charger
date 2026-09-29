# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Ruhnevâz** — Turkish Islamic life assistant (Expo 54, React Native 0.81, NativeWind v4). App name is `Ruhnevâz`, slug `ruhnevaz` (config lives in `app.config.js`, not `app.json`), bundle ID / package `com.mtuyarr.ruhnevaz`, EAS owner `mtuyarr`. Targets iOS and Android.

## Commands

```bash
npx expo start          # Dev server (scan QR with Expo Go)
npx expo start --ios    # iOS simulator
npx expo start --android
```

No test suite configured.

## Navigation Architecture

React Navigation v7 in `navigation/RootNavigator.tsx`: a single native stack (no tab bar — the user prefers the simple hub layout). First route is `Onboarding` (until `settings.onboardingDone`) or `Home`, a hub with module cards. Every other screen (Reader, Hadith flow, Dua, Imsakiye, Kaza, HolyDays, Settings, LocationPicker, ShareCard…) is a stack route — see `navigation/types.ts` for params. Hardware back / swipe-back come from the navigator.

Legacy components (`components/HadithChapters`, `HadithReader`, `HadithSearch` — `HadithLibrary` is already migrated to the ui kit, `MemorizationModule`, `QuranLearnModule`, `QiblaCompass`, `Tasbih`, `EsmaLibrary`, `SavedItems`, `QuranLibrary`) still take `darkMode` + `onBack` props; thin wrappers in `RootNavigator.tsx` adapt them. New screens live in `screens/` and use `useTheme()` + the `components/ui` kit instead.

## State (Zustand, persisted to AsyncStorage)

| Store | Key | Holds |
|---|---|---|
| `store/useSettingsStore` | `ruhnevaz.settings` | theme mode (system/light/dark), language (tr/en), reading prefs (font, scale, theme, translation edition, reciter, repeat), haptics, onboarding flag |
| `store/usePrayerStore` | `ruhnevaz.prayer` | location, method, cached monthly calendars, notification prefs/sound/pre-reminder, prayer log, kaza counts, fasting log |
| `store/useQuranStore` | `ruhnevaz.quran` | khatm pages read, daily goal, last page |
| `store/useLibraryStore` | (uses `services/favorites.ts` keys) | surah list, saved ayahs/hadiths, read history, last-read position |
| `services/quranAudio` | — | recitation queue / playback state |

`theme/index.ts` → `useTheme()` returns the palette: light/dark (system-following) × style (`default` / `sepia` / `amoled`, stored as `settings.readingTheme` but applied app-wide). Legacy components use `paletteFor(darkMode)`. i18n: `i18n/{tr,en}.ts`, `t('key')`.

## Services

| File | Purpose |
|------|---------|
| `services/api.ts` | Quran surah list/details/search/random ayah from the **embedded** content (see Offline content), prayer times (aladhan.com), 99 Names (hardcoded), basic hadith fallback |
| `services/hadith.ts` | `HadithService` for 6 Turkish collections. Buhârî + Müslim are read from embedded assets; the other 4 stream from the fawazahmed0/hadith-api CDN. Arabic hadith text is always a best-effort network fetch |
| `services/HadithMappings.ts` | Turkish translations of English hadith section names from the API |
| `services/notifications.ts` | expo-notifications: permission (ask in context, never on cold start), channels per sound, `scheduleAt` |
| `services/prayerTimes.ts` | Aladhan monthly calendar by coordinates (cached), next-prayer calc, GPS/geocoded city search, method-by-country, `rescheduleAllNotifications()` (≤60 pending: prayers for N days + pre-reminders + holy nights) |
| `services/hijri.ts` | Offline hijri conversion (Kuwaiti algorithm) + holy days (kandil, bayram) |
| `services/widgets.ts` | Writes daily content + prayer calendar to the iOS App Group (`group.com.mtuyarr.ruhnevaz`) and refreshes Android widgets |
| `services/quranAudio.ts` / `quranExtras.ts` | expo-audio ayah player (cdn.islamic.network), extra translation editions, per-ayah comparison, EN tafsir (quran.com) |
| `services/offlineContent.ts` | `readAssetJson(moduleId)` — reads a bundled `.jsondata` asset via expo-asset + expo-file-system `File.text()`, memoised per session |
| `services/backup.ts` | JSON export/import of AsyncStorage (no account) |
| `services/quranLearn.ts` | Word-learning progress + `getWordDepth()` AI explanations via the proxy in `proxy/` (URL from `AI_PROXY_URL`; feature hidden when unset — never bundle an Anthropic key) |

### External APIs

- **Quran**: core text is offline (see below). `https://api.alquran.cloud/v1` is still used by `quranExtras.ts` for extra translation editions / ayah comparison and by `quranAudio.ts` for audio URLs. Arabic edition is `quran-simple` (standard imlâ, matches Turkish mushaf spelling). **Never use `quran-indopak` with the MeQuran font** — it lacks Farsi yeh and open-tanwin glyphs, causing mixed-font hareke shifting
- **Prayer times**: `https://api.aladhan.com/v1` — method=13 is Diyanet İşleri Başkanlığı
- **Hadith**: `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{collection}` — streams tur-abudawud, tur-tirmidhi, tur-nasai, tur-ibnmajah (tur-bukhari and tur-muslim are embedded)

`TURKISH_SURAH_NAMES` in `api.ts` is a complete 1–114 mapping; `scripts/buildOfflineContent.py` parses it to name surahs in the embedded data.

### Offline content (`assets/content/`)

Quran Arabic + Diyanet meal and the Buhârî/Müslim hadith collections ship inside the app (~20 MB) so the reader, search and daily ayah work with no network.

- Generated by `python3 scripts/buildOfflineContent.py` (downloads cached in gitignored `scripts/_cache/`). It writes `assets/content/quran/NNN.jsondata` (per surah, both editions), `quran/surahs.json`, `hadith/<col>/meta.json` + `hadith/<col>/sections/N.jsondata`, and regenerates `data/offlineAssets.ts` (the `require()` maps — never edit by hand).
- `.jsondata` is registered as a Metro **asset** extension in `metro.config.js`, so the files are copied as raw assets and read lazily at runtime instead of being inlined into the Hermes bundle (Turkish/Arabic strings would double in size as UTF-16).
- To embed more collections, add ids to `HADITH_COLLECTIONS` in the script and re-run it. Audio is intentionally not embedded (~1 GB per reciter).
- `me_quran.ttf` is licensed for non-commercial use only; kept deliberately because the app is non-commercial.

## Key Data Flows

**TevafukCard** (home screen rotating content): `loadTevafuk()` randomly fetches either a Quran ayah (60% probability) or a hadith (40%), producing a `TevafukContent` object with `type`, `arabic?`, `turkish`, and `source`.

**Opening a Surah**: `ReaderScreen` calls `getSurahDetails(id)`, which reads the embedded per-surah asset (`DualSurahResponse` with `arabic` + `turkish`), then renders `Reader`. Non-Diyanet translations are fetched lazily by `Reader` via `getSurahEdition`.

**Hadith chapters**: `HadithService.getChapters()` checks in-memory cache → embedded `meta.json` (Buhârî/Müslim) → AsyncStorage cache → network. Streamed collections cache chapters to `hadith_chapters_{collectionId}` in AsyncStorage.

## Styling

New code: `useTheme()` palette + `components/ui` (Screen, Header, Card, Row, SwitchRow, Chip, Button, StateView, Skeleton, haptic). Accent `#0f8a5f`.

Legacy: 
NativeWind v4 (className-based) and `StyleSheet.create` are **mixed throughout**. Most components use `StyleSheet.create` for layout/structure and className for utility tweaks. Dark mode colors are computed as local variables from the `darkMode` boolean prop (e.g. `const bgColor = darkMode ? '#020617' : '#fcfbf9'`).

Accent color: `#10b981` (emerald-500). Dark background: `#020617`. Light background: `#fcfbf9`.

## Fonts

Loaded via `useFonts` in App.tsx. App blocks rendering until all fonts resolve.

- **Arabic text**: `ScheherazadeNew_400Regular`, `NotoNaskhArabic_400Regular`, `Amiri_400Regular`, `MeQuran` (local TTF at `assets/fonts/me_quran.ttf`)
- **UI text**: `PlusJakartaSans_*` (300/400/500/600/700)

## Persistence

AsyncStorage keys used across the app:
- `theme` — `'dark'` or `'light'`
- `lastReadSurahId` — number as string
- `hadith_chapters_{collectionId}` — JSON-serialized `HadithChapter[]`
- Prayer notification preferences (in `PrayerTimesWidget`)

## Widgets

- iOS: `targets/widget/RuhnevazWidgets.swift` (WidgetKit, iOS 17+). Two widgets: `RuhnevazPrayer` (small/medium + lock-screen circular/rectangular/inline, live countdown via `Text(timerInterval:)`) and `RuhnevazDaily` (small/medium/large + lock-screen). Data comes from App Group UserDefaults keys `lang`, `labels`, `daily`, `prayer`. Requires `ios.appleTeamId` (set) and a dev build — not Expo Go.
- Android: `widgets/render.tsx` + `widgets/widgetTaskHandler.tsx` registered in `index.ts`; widget config in `app.config.js` plugin block. Reads the persisted Zustand JSON straight from AsyncStorage in the headless task.
- `data/dailyContent.ts` is generated by `scripts/buildDailyContent.py` (ayahs fetched from alquran.cloud + hand-written hadith/wisdom). `dailyItemFor(date)` uses a UTC day number so app and widgets agree.

## `proxy/`

Standalone Vercel edge function (`proxy/api/word-depth.ts`) that holds the Anthropic key server-side. Not part of the Expo bundle. See `proxy/README.md`.

## `web_backup/`

A previous Vite + React web version of the app. Not part of the active mobile codebase — ignore it.
