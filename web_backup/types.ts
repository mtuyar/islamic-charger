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
}

export interface Hadith {
  id: number;
  source: 'Bukhari' | 'Muslim' | 'Riyad as-Salihin' | 'Tirmidhi';
  text: string;
  topic?: string;
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