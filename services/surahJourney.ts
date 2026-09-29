import AsyncStorage from '@react-native-async-storage/async-storage';
import { QURAN_WORDS, QuranWord } from '../data/quranWords';

const STORAGE_KEY = '@surahjourney/v1';

// Each surah is divided into sections of ~7 ayahs
const SECTION_SIZE = 7;

export interface SurahSection {
  index: number;       // 0-based section index
  startAyah: number;   // first ayah number in section
  endAyah: number;     // last ayah number in section
  completed: boolean;
  score: number;       // best score 0-100
}

export interface SurahJourneyData {
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  currentSection: number; // which section user is currently on
  sections: SurahSection[];
  startedAt: number;
  lastStudiedAt: number;
}

export interface AllJourneys {
  [surahNumber: string]: SurahJourneyData;
}

// Surah total ayah counts for the surahs we support
const SURAH_AYAH_COUNTS: Record<number, { name: string; ayahs: number }> = {
  1: { name: 'Fatiha', ayahs: 7 },
  2: { name: 'Bakara', ayahs: 286 },
  3: { name: 'Âl-i İmrân', ayahs: 200 },
  4: { name: 'Nisâ', ayahs: 176 },
  5: { name: 'Mâide', ayahs: 120 },
  6: { name: 'En\'âm', ayahs: 165 },
  7: { name: 'A\'râf', ayahs: 206 },
  8: { name: 'Enfâl', ayahs: 75 },
  9: { name: 'Tevbe', ayahs: 129 },
  10: { name: 'Yûnus', ayahs: 109 },
  11: { name: 'Hûd', ayahs: 123 },
  12: { name: 'Yûsuf', ayahs: 111 },
  13: { name: 'Ra\'d', ayahs: 43 },
  14: { name: 'İbrâhîm', ayahs: 52 },
  16: { name: 'Nahl', ayahs: 128 },
  17: { name: 'İsrâ', ayahs: 111 },
  18: { name: 'Kehf', ayahs: 110 },
  19: { name: 'Meryem', ayahs: 98 },
  20: { name: 'Tâhâ', ayahs: 135 },
  21: { name: 'Enbiyâ', ayahs: 112 },
  22: { name: 'Hac', ayahs: 78 },
  23: { name: 'Mü\'minûn', ayahs: 118 },
  24: { name: 'Nûr', ayahs: 64 },
  25: { name: 'Furkân', ayahs: 77 },
  27: { name: 'Neml', ayahs: 93 },
  31: { name: 'Lokmân', ayahs: 34 },
  33: { name: 'Ahzâb', ayahs: 73 },
  35: { name: 'Fâtır', ayahs: 45 },
  36: { name: 'Yâsîn', ayahs: 83 },
  39: { name: 'Zümer', ayahs: 75 },
  40: { name: 'Mü\'min', ayahs: 85 },
  42: { name: 'Şûrâ', ayahs: 53 },
  48: { name: 'Fetih', ayahs: 29 },
  55: { name: 'Rahmân', ayahs: 78 },
  56: { name: 'Vâkıa', ayahs: 96 },
  57: { name: 'Hadîd', ayahs: 29 },
  67: { name: 'Mülk', ayahs: 30 },
  72: { name: 'Cin', ayahs: 28 },
  78: { name: 'Nebe', ayahs: 40 },
  112: { name: 'İhlâs', ayahs: 4 },
  113: { name: 'Felak', ayahs: 5 },
  114: { name: 'Nâs', ayahs: 6 },
};

export const getAvailableSurahsForJourney = () => {
  return Object.entries(SURAH_AYAH_COUNTS).map(([num, info]) => ({
    number: parseInt(num),
    name: info.name,
    ayahs: info.ayahs,
    sections: Math.ceil(info.ayahs / SECTION_SIZE),
  })).sort((a, b) => a.number - b.number);
};

// Create sections for a surah
const createSections = (totalAyahs: number): SurahSection[] => {
  const sections: SurahSection[] = [];
  for (let i = 0; i < totalAyahs; i += SECTION_SIZE) {
    sections.push({
      index: sections.length,
      startAyah: i + 1,
      endAyah: Math.min(i + SECTION_SIZE, totalAyahs),
      completed: false,
      score: 0,
    });
  }
  return sections;
};

// Get or create a journey for a surah
export const getJourney = async (surahNumber: number): Promise<SurahJourneyData | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const all: AllJourneys = raw ? JSON.parse(raw) : {};
    return all[String(surahNumber)] || null;
  } catch {
    return null;
  }
};

export const getAllJourneys = async (): Promise<AllJourneys> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const startJourney = async (surahNumber: number): Promise<SurahJourneyData> => {
  const info = SURAH_AYAH_COUNTS[surahNumber];
  if (!info) throw new Error('Surah not found');

  const existing = await getJourney(surahNumber);
  if (existing) return existing;

  const journey: SurahJourneyData = {
    surahNumber,
    surahName: info.name,
    totalAyahs: info.ayahs,
    currentSection: 0,
    sections: createSections(info.ayahs),
    startedAt: Date.now(),
    lastStudiedAt: Date.now(),
  };

  const all = await getAllJourneys();
  all[String(surahNumber)] = journey;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return journey;
};

export const completeSection = async (
  surahNumber: number,
  sectionIndex: number,
  score: number,
): Promise<SurahJourneyData> => {
  const all = await getAllJourneys();
  const journey = all[String(surahNumber)];
  if (!journey) throw new Error('Journey not found');

  // Update section
  const section = journey.sections[sectionIndex];
  if (section) {
    section.completed = score >= 60; // Need 60% to pass
    section.score = Math.max(section.score, score);
  }

  // Advance current section if this one was completed
  if (section?.completed && sectionIndex === journey.currentSection) {
    // Find next incomplete section
    const next = journey.sections.findIndex((s, i) => i > sectionIndex && !s.completed);
    journey.currentSection = next >= 0 ? next : journey.sections.length; // all done
  }

  journey.lastStudiedAt = Date.now();
  all[String(surahNumber)] = journey;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return journey;
};

// Get words for a specific section of a surah dynamically from API
export const getWordsForSection = async (surahNumber: number, section: SurahSection): Promise<QuranWord[]> => {
  const { fetchAllSurahWords, getUniqueWords, normalizeArabic, isComplexWord, getWordDifficulty } = await import('./quranWordApi');
  const surahInfo = SURAH_AYAH_COUNTS[surahNumber];
  if (!surahInfo) return [];

  // Fetch ALL surah words (parallel batching + 7-day cache from Açık Kuran API)
  const allApiWords = await fetchAllSurahWords(surahNumber, surahInfo.ayahs);

  // Filter to this section's ayah range
  const apiWords = allApiWords.filter(w => {
    const ayah = parseInt(w.verseKey.split(':')[1]);
    return ayah >= section.startAyah && ayah <= section.endAyah;
  });

  // Apply complexity filter (cognates, basic verbs, particles → out)
  const complexApiWords = apiWords.filter(isComplexWord);
  const uniqueApiWords = getUniqueWords(complexApiWords);

  // Sort by difficulty score (higher = more pedagogically valuable) — pick top 15
  const ranked = uniqueApiWords
    .map(w => ({ w, score: getWordDifficulty(w) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(x => x.w);

  // Map to QuranWord structure so the quiz can use it directly
  const sectionWords: QuranWord[] = ranked.map(aw => {
    const rawRoot = normalizeArabic(aw.arabic);
    return {
      id: `api_${rawRoot}`,
      arabic: aw.arabic,
      turkish: aw.translation,
      root: rawRoot,
      level: 3,
      frequency: 1,
      sureList: [surahNumber],
      verseKey: aw.verseKey,
    };
  });

  // If we couldn't find enough strong words in this section, fall back to looser filter (drop difficulty floor)
  // — but still avoid the static "easy" DB which is what we want to move past
  if (sectionWords.length < 4) {
    const looserUnique = getUniqueWords(apiWords.filter(w => {
      const norm = normalizeArabic(w.arabic);
      return norm.length >= 3 && (w.translation || '').length >= 3;
    }));
    const ids = new Set(sectionWords.map(w => w.id));
    const extras: QuranWord[] = looserUnique
      .filter(aw => !ids.has(`api_${normalizeArabic(aw.arabic)}`))
      .map(aw => ({
        id: `api_${normalizeArabic(aw.arabic)}`,
        arabic: aw.arabic,
        turkish: aw.translation,
        root: normalizeArabic(aw.arabic),
        level: 3,
        frequency: 1,
        sureList: [surahNumber],
        verseKey: aw.verseKey,
      }));
    sectionWords.push(...extras.slice(0, Math.max(4, 10) - sectionWords.length));
  }

  // Light shuffle (preserve some difficulty ordering)
  return sectionWords.sort(() => Math.random() - 0.4).slice(0, 15);
};
