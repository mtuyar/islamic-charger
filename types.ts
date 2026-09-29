export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | any;
}

export interface QuranEdition {
  code: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  direction: string;
}

export interface SurahDetailResponse {
  number: number;
  name: string; // Arabic name
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
  edition: QuranEdition;
}

export interface DualSurahResponse {
  arabic: SurahDetailResponse;
  turkish: SurahDetailResponse;
  yazir?: SurahDetailResponse;
}

export interface Hadith {
  id: number;
  source: string;
  text: string;
  topic?: string;
  book?: string;
  number?: number;
}

export interface TevafukContent {
  type: 'ayah' | 'hadith';
  content: {
    arabic?: string;
    turkish: string;
    source: string; // Surah Name : Ayah No OR Hadith Source
  };
}

export interface Esma {
  id: number;
  name: string; // Arabic
  transliteration: string; // Turkish Char
  meaning: string;
}

export interface SearchResult {
  number: number;
  text: string;
  numberInSurah: number;
  arabicText?: string;
  turkishText?: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
}

export interface SavedAyah {
  id: string; // `${surahNumber}_${ayahNumber}`
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  turkish: string;
  savedAt: number;
}

export interface SavedHadith {
  id: string; // `${collectionId}_${hadithnumber}`
  collectionId: string;
  collectionName: string;
  chapterId: string;
  chapterName: string;
  hadithnumber: number | string;
  text: string;
  savedAt: number;
}

export interface ReadEntry {
  id: string; // `${collectionId}_${sectionId}`
  collectionId: string;
  collectionName: string;
  chapterId: string;
  chapterName: string;
  readAt: number;
  hadithNumber?: number | string;
}

export interface MemorizationEntry {
  id: string;
  surahNumber: number;
  surahName: string;
  surahArabicName: string;
  totalAyahs: number;
  ayahFrom: number;
  ayahTo: number;
  arabic?: string;
  turkish?: string;
  addedAt: number;
  status: 'learning' | 'reviewing' | 'memorized';
  level: number; // 0-5
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
  reviewCount: number;
}

export interface MemorizationSettings {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}