import type { DuaCategory } from '../data/duas';
import type { HadithCollection, HadithChapter } from '../services/hadith';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Quran: undefined;
  Prayer: undefined;
  Dhikr: undefined;
  Reader: { surahId: number; startAyah?: number };
  HadithLibrary: undefined;
  HadithChapters: { collection: HadithCollection };
  HadithReader: { collection: HadithCollection; chapter: HadithChapter; initialHadithNumber?: string | number };
  Esma: undefined;
  Saved: undefined;
  Memorization: undefined;
  Words: undefined;
  Qibla: undefined;
  Tasbih: undefined;
  Tasbihat: undefined;
  DuaList: { category: DuaCategory };
  DuaDetail: { duaId: string };
  HolyDays: undefined;
  Imsakiye: undefined;
  Kaza: undefined;
  Settings: undefined;
  About: undefined;
  ShareCard: { arabic?: string; text: string; source: string; kind: 'ayah' | 'hadith' | 'wisdom' | 'dua' };
  PrayerSettings: undefined;
  LocationPicker: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
