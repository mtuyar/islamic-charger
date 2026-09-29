import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, detectDeviceLanguage, setLanguage } from '../i18n';

export type ThemeMode = 'system' | 'light' | 'dark';
/** App-wide appearance style; combined with light/dark it yields the palette (see theme/). */
export type ReadingTheme = 'default' | 'sepia' | 'amoled';
export type ArabicFont = 'MeQuran' | 'Amiri_400Regular' | 'ScheherazadeNew_400Regular' | 'NotoNaskhArabic_400Regular';

export interface TranslationEdition {
  id: string;
  name: string;
  lang: Language;
}

export const TRANSLATION_EDITIONS: TranslationEdition[] = [
  { id: 'tr.diyanet', name: 'Diyanet İşleri', lang: 'tr' },
  { id: 'tr.vakfi', name: 'Diyanet Vakfı', lang: 'tr' },
  { id: 'tr.yazir', name: 'Elmalılı Hamdi Yazır', lang: 'tr' },
  { id: 'tr.ates', name: 'Süleyman Ateş', lang: 'tr' },
  { id: 'tr.yildirim', name: 'Suat Yıldırım', lang: 'tr' },
  { id: 'tr.bulac', name: 'Ali Bulaç', lang: 'tr' },
  { id: 'en.sahih', name: 'Saheeh International', lang: 'en' },
  { id: 'en.itani', name: 'The Clear Quran (Itani)', lang: 'en' },
  { id: 'en.yusufali', name: 'Yusuf Ali', lang: 'en' },
  { id: 'en.pickthall', name: 'Pickthall', lang: 'en' },
];

export interface Reciter {
  id: string;
  name: string;
}

export const RECITERS: Reciter[] = [
  // Only reciters verified to stream from cdn.islamic.network (ayah-by-ayah, 128kbps).
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary' },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly' },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub' },
  { id: 'ar.ahmedajamy', name: 'Ahmed ibn Ali Al-Ajamy' },
  { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shaatree' },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify' },
];

interface SettingsState {
  themeMode: ThemeMode;
  language: Language;
  hapticsEnabled: boolean;
  onboardingDone: boolean;
  showPrayerTracker: boolean; // 'Bugünkü namazların' card on Home
  // Reading
  arabicFont: ArabicFont;
  fontScale: number;      // 0.8 – 1.6
  lineHeightScale: number; // 1.0 – 1.6
  readingTheme: ReadingTheme;
  showTranslation: boolean;
  translationEdition: string;
  reciterId: string;
  repeatCount: number;    // 0 = no repeat, 1..5
  // Actions
  setThemeMode: (m: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setHaptics: (v: boolean) => void;
  setOnboardingDone: (v: boolean) => void;
  setShowPrayerTracker: (v: boolean) => void;
  setArabicFont: (f: ArabicFont) => void;
  setFontScale: (v: number) => void;
  setLineHeightScale: (v: number) => void;
  setReadingTheme: (t: ReadingTheme) => void;
  setShowTranslation: (v: boolean) => void;
  setTranslationEdition: (id: string) => void;
  setReciter: (id: string) => void;
  setRepeatCount: (n: number) => void;
}

const initialLanguage = detectDeviceLanguage();

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      language: initialLanguage,
      hapticsEnabled: true,
      onboardingDone: false,
      showPrayerTracker: true,
      arabicFont: 'MeQuran',
      fontScale: 1,
      lineHeightScale: 1.2,
      readingTheme: 'default',
      showTranslation: true,
      translationEdition: initialLanguage === 'tr' ? 'tr.diyanet' : 'en.sahih',
      reciterId: 'ar.alafasy',
      repeatCount: 0,

      setThemeMode: (themeMode) => set({ themeMode }),
      setLanguage: (language) => {
        setLanguage(language);
        set((s) => ({
          language,
          // Keep the translation edition in the user's language unless they picked one explicitly of that language
          translationEdition: TRANSLATION_EDITIONS.find(e => e.id === s.translationEdition)?.lang === language
            ? s.translationEdition
            : language === 'tr' ? 'tr.diyanet' : 'en.sahih',
        }));
      },
      setHaptics: (hapticsEnabled) => set({ hapticsEnabled }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setShowPrayerTracker: (showPrayerTracker) => set({ showPrayerTracker }),
      setArabicFont: (arabicFont) => set({ arabicFont }),
      setFontScale: (fontScale) => set({ fontScale: Math.min(1.6, Math.max(0.8, fontScale)) }),
      setLineHeightScale: (lineHeightScale) => set({ lineHeightScale: Math.min(1.6, Math.max(1, lineHeightScale)) }),
      setReadingTheme: (readingTheme) => set({ readingTheme }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),
      setTranslationEdition: (translationEdition) => set({ translationEdition }),
      setReciter: (reciterId) => set({ reciterId }),
      setRepeatCount: (repeatCount) => set({ repeatCount: Math.min(5, Math.max(0, repeatCount)) }),
    }),
    {
      name: 'ruhnevaz.settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) setLanguage(state.language);
      },
    },
  ),
);
