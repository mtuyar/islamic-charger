/**
 * Quran Word-by-Word API Service
 * Fetches real words from Quran ayahs and creates quiz-ready data
 * Uses api.quran.com v4 for word-by-word data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://api.quran.com/api/v4';
const ACIK_KURAN_BASE = 'https://api.acikkuran.com';
const CACHE_KEY = '@quranwords/cache';
const CACHE_TTL = 7 * 86_400_000; // 7 days

export interface QuranApiWord {
  id: string;          // unique: "7:3:2" (surah:ayah:wordPos)
  arabic: string;      // Arabic text (uthmani)
  transliteration: string;
  translation: string; // English meaning (used as fallback)
  position: number;
  verseKey: string;    // "7:3"
  charType: 'word' | 'end';  // filter out end markers
}

export interface SurahWordCache {
  surahNumber: number;
  words: QuranApiWord[];
  fetchedAt: number;
}

interface ApiWordResponse {
  words: Array<{
    id: number;
    position: number;
    audio_url: string | null;
    char_type_name: string; // "word" or "end"
    text_uthmani: string;
    translation: { text: string; language_name: string };
    transliteration: { text: string };
  }>;
  pagination: {
    per_page: number;
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_records: number;
  };
}

// ---- Cache ----

const getCache = async (): Promise<Record<string, SurahWordCache>> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setCache = async (surahNumber: number, words: QuranApiWord[]) => {
  try {
    const cache = await getCache();
    cache[String(surahNumber)] = { surahNumber, words, fetchedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

// ---- Fetch words for ayah range ----

export const fetchWordsForAyahRange = async (
  surahNumber: number,
  startAyah: number,
  endAyah: number,
): Promise<QuranApiWord[]> => {
  // Check cache first
  const cache = await getCache();
  const cached = cache[String(surahNumber)];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    // Filter cached words for the ayah range
    return cached.words.filter(w => {
      const ayahNum = parseInt(w.verseKey.split(':')[1]);
      return ayahNum >= startAyah && ayahNum <= endAyah;
    });
  }

  // Fetch from API - get all words for the ayah range
  const allWords: QuranApiWord[] = [];
  
  for (let ayah = startAyah; ayah <= endAyah; ayah++) {
    try {
      const url = `${API_BASE}/verses/by_key/${surahNumber}:${ayah}?language=tr&words=true&word_fields=text_uthmani&translation_fields=text`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const verse = data.verse;
      
      if (verse?.words) {
        for (const w of verse.words) {
          if (w.char_type_name === 'word') {
            allWords.push({
              id: `${surahNumber}:${ayah}:${w.position}`,
              arabic: w.text_uthmani || w.text,
              transliteration: w.transliteration?.text || '',
              translation: w.translation?.text || '',
              position: w.position,
              verseKey: `${surahNumber}:${ayah}`,
              charType: 'word',
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch words for ${surahNumber}:${ayah}`, e);
    }
  }

  return allWords;
};

// ---- Fetch ALL words for a surah via Açık Kuran API (Turkish word-by-word) ----
// acikkuran.com provides proper Turkish word meanings, unlike quran.com which is English-only

export const fetchAllSurahWords = async (
  surahNumber: number,
  totalAyahs: number,
): Promise<QuranApiWord[]> => {
  // Check cache
  const cache = await getCache();
  const cached = cache[String(surahNumber)];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.words;
  }

  const allWords: QuranApiWord[] = [];
  const BATCH = 20;

  // Fetch in parallel batches to avoid sequential slowness on long surahs
  for (let start = 1; start <= totalAyahs; start += BATCH) {
    const end = Math.min(start + BATCH - 1, totalAyahs);
    const ayahNums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const results = await Promise.allSettled(
      ayahNums.map(async (ayah) => {
        const url = `${ACIK_KURAN_BASE}/surah/${surahNumber}/verse/${ayah}/words`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        const words: Array<{
          id: number;
          arabic: string;
          transcription: string;
          turkish: string;
          sort_number: number;
        }> = data.data || [];
        return words
          .filter(w => w.arabic)
          .map(w => ({
            id: `${surahNumber}:${ayah}:${w.sort_number}`,
            arabic: w.arabic,
            transliteration: w.transcription || '',
            translation: w.turkish || '',
            position: w.sort_number,
            verseKey: `${surahNumber}:${ayah}`,
            charType: 'word' as const,
          }));
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') allWords.push(...r.value);
    }
  }

  // Cache the result
  if (allWords.length > 0) {
    await setCache(surahNumber, allWords);
  }

  return allWords;
};

// ---- Deduplicate words (same Arabic root = same word) ----

export const getUniqueWords = (words: QuranApiWord[]): QuranApiWord[] => {
  const seen = new Map<string, QuranApiWord>();
  
  for (const w of words) {
    // Normalize: remove harakat for dedup
    const normalized = w.arabic.replace(/[\u064B-\u0652\u0670]/g, '').trim();
    if (!seen.has(normalized) && normalized.length > 1) {
      seen.set(normalized, w);
    }
  }

  return [...seen.values()];
};

// ---- Arabic normalization (handles alef variants + diacritics) ----
export const normalizeArabic = (s: string): string =>
  s
    .replace(/[ً-ْٰ]/g, '') // remove diacritics (harakat)
    .replace(/[آأإٱ]/g, 'ا') // normalize alef variants → plain alef
    .replace(/ـ/g, '') // remove tatweel
    .trim();

// ---- Filtering Simple Words ----
// Blacklist of common prepositions, pronouns, particles, and basic nouns
export const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'الى', 'عن', 'ب', 'ل', 'ك', 'و', 'ف', 'ثم', 'او', 'ام', 'اما', 'بل', 'لكن',
  'ان', 'كان', 'لعل', 'ليت', 'الا', 'غير', 'سوى', 'هو', 'هي', 'هما', 'هم', 'هن', 'انت', 'انتم', 'انا', 'نحن',
  'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'ما', 'متى', 'اين', 'كيف', 'كم', 'اي',
  'هذا', 'هذه', 'هذان', 'هاتان', 'هؤلاء', 'ذلك', 'تلك', 'اولئك', 'يا', 'ايا', 'هيا', 'الله', 'رب', 'اللهم',
  'بهم', 'بها', 'به', 'لهم', 'لها', 'له', 'منهم', 'منها', 'منه', 'فيهم', 'فيها', 'فيه', 'عليهم', 'عليها', 'عليه',
  'اليهم', 'اليها', 'اليه', 'عنهم', 'عنها', 'عنه'
]);

// Normalize Turkish text: lowercase + strip diacritics → ASCII
const normalizeTurkish = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[â]/g, 'a')
    .replace(/[î]/g, 'i')
    .replace(/[û]/g, 'u')
    .trim();

// Particles to skip when looking for the primary meaning word
const SKIP_PREFIX_PARTICLES = new Set([
  've', 'ile', 'de', 'da', 'ki', 'icin', 'gibi', 'kadar', 'o', 'bu', 'su',
  'mi', 'mu', 'hic', 'hep', 'cok', 'az', 'pek', 'daha', 'en', 'yine', 'zaten',
  'iste', 'sade', 'sadece', 'ancak', 'yalniz', 'fakat', 'lakin', 'ama',
  'belki', 'sanki', 'eger', 'sayet', 'su', 'her', 'tum', 'butun', 'bazi',
  'hangi', 'gibi', 'olan', 'bir',
]);

// Get the primary content word — skip leading particles like "hiç", "ve", "çok"
const firstTurkishWord = (s: string): string => {
  const tokens = normalizeTurkish(s).split(/[\s/,\-()]+/).filter(Boolean);
  for (const t of tokens) {
    if (!SKIP_PREFIX_PARTICLES.has(t)) return t;
  }
  return tokens[0] || '';
};

// Particles/conjunctions/articles
const TURKISH_PARTICLES = [
  've', 'ile', 'de', 'da', 'ki', 'icin', 'gibi', 'kadar', 'olan', 'o', 'bu', 'su',
  'onlar', 'biz', 'siz', 'ben', 'sen', 'ne', 'hangi', 'kim', 'nasil', 'neden', 'nicin',
  'mi', 'mu', 'ise', 'ya', 'veya', 'yahut', 'belki', 'sanki', 'gore', 'dogru', 'karsi',
  'ragmen', 'beri', 'evvel', 'once', 'sonra', 'diye', 'uzere', 'dolayi', 'ancak', 'yalniz',
  'fakat', 'lakin', 'ama', 'cunku', 'zira', 'meger', 'halbuki', 'oysa', 'madem', 'sayet',
  'eger', 'velev', 'hani', 'bari', 'hic', 'hep', 'asla', 'zaten', 'henuz', 'daha', 'artik',
  'gene', 'yine', 'bir', 'iki', 'uc', 'kendi', 'degil', 'var', 'yok', 'evet', 'hayir',
];

// Turkish-Arabic cognates: words that are Arabic loanwords already familiar to Turkish speakers
// These don't teach anything new — they're already known via Turkish religious/cultural vocabulary
const TURKISH_ARABIC_COGNATES = [
  // Divine names + religious core
  'allah', 'rab', 'rabbim', 'rabbin', 'rabbi', 'ilah', 'tanri', 'rahman', 'rahim', 'mevla',
  // Worship / pillars
  'ibadet', 'ibadeti', 'salat', 'namaz', 'oruc', 'zekat', 'sadaka', 'hac', 'umre', 'fitre',
  'kurban', 'iftar', 'sahur', 'mihrab', 'mescit', 'mescid', 'cami', 'kabe', 'kible', 'kibla',
  'imam', 'muezzin', 'hafiz',
  // Faith concepts
  'iman', 'takva', 'kufur', 'kufr', 'sirk', 'nifak', 'fisk', 'fasik', 'mumin', 'kafir',
  'musrik', 'munafik', 'muvahhid', 'ehli', 'ehl',
  // Quranic concepts
  'ayet', 'ayeti', 'sure', 'suresi', 'kuran', 'kur\'an', 'mushaf', 'vahiy', 'tenzil',
  'tilavet', 'kelam', 'kitap', 'kitab', 'sayfalar', 'levhi', 'kalem',
  // Eschatology
  'ahiret', 'dunya', 'cennet', 'cehennem', 'kiyamet', 'mahser', 'sirat', 'mizan',
  'kabir', 'mezar', 'haşr', 'hasr', 'ba\'s',
  // Spiritual states
  'ruh', 'nefis', 'nefs', 'kalp', 'kalb', 'kalbi', 'fitrat', 'akil', 'idrak', 'sezgi',
  // Prophets / messengers
  'peygamber', 'nebi', 'resul', 'rasul', 'risalet', 'sahabe', 'sahabi', 'vahiy',
  'mucize', 'keramet',
  // Beings
  'melek', 'meleklerin', 'cin', 'cinler', 'seytan', 'iblis', 'huri', 'gilman',
  // Rewards / states
  'rahmet', 'magfiret', 'gazab', 'gazap', 'azap', 'azab', 'azabi', 'hidayet', 'hadi',
  'dalalet', 'dalal', 'ibret', 'mizan', 'sevap', 'ecir', 'mukafat',
  // Religious texts/practices
  'sunnet', 'hadis', 'fikih', 'fikh', 'tefsir', 'hatim', 'icma', 'kiyas', 'ictihad',
  // Halal/haram
  'helal', 'haram', 'mubah', 'mekruh', 'vacip', 'farz', 'sunet',
  // Virtues / vices
  'sukur', 'sabir', 'sabri', 'tevbe', 'tovbe', 'duâ', 'dua', 'niyet', 'yemin', 'ahd',
  'misak', 'biat', 'fitne', 'riya', 'gibet', 'iftira', 'bukal',
  // Knowledge / wisdom (loanwords)
  'ilim', 'ilm', 'hikmet', 'marifet', 'irfan', 'edeb', 'adab', 'fazilet', 'kemal',
  'cehalet', 'cahil', 'alim',
  // Common loanwords
  'din', 'dini', 'dinin', 'inanc', 'mezhep', 'tarikat', 'ummet', 'kavim', 'kabile',
  'millet', 'sehit', 'gazi', 'mucahid', 'mucahit',
  // Time/place loanwords
  'mevt', 'olum', 'hayat', 'omur', 'ezel', 'ebed', 'devir', 'asir',
  'gece', 'gunduz', 'sabah', 'aksam', 'gun', 'leyl', 'nehar', 'yevm',
  // Light/dark/justice
  'nur', 'zulmet', 'adalet', 'adl', 'zulum', 'hak', 'batil', 'hakikat',
  // Morality
  'hayir', 'ser', 'iyi', 'kotu', 'merhamet', 'sefkat', 'muhabbet', 'sevgi',
  // Body / soul (loan)
  'ten', 'beden', 'cisim', 'maddi', 'manevi',
  // Covenants / laws
  'emir', 'hukum', 'kanun', 'sart', 'kayit', 'isaret',
  // Common simple Quran-translation cognates
  'gunah', 'cezasi', 'ceza', 'mukafat', 'nimet', 'lutuf', 'lutf', 'minnet',
  // Numbers as Arabic loanwords (often)
  'sayisiz', 'bircok', 'pekcok',
  // Specific user-mentioned simples
  'soyle', 'soylendi', 'nitekim', 'iste',
];

// Basic Turkish verbs (in past tense common in API translations + infinitive in static DB)
const BASIC_TURKISH_VERBS = [
  // Past tense (3rd person sing)
  'dedi', 'soyledi', 'dedik', 'dediler', 'denildi', 'denilen', 'denir', 'denildi',
  'geldi', 'geldiler', 'gelir', 'gelen', 'gelmek',
  'gitti', 'gittiler', 'gider', 'giden', 'gitmek',
  'gordu', 'gorur', 'goren', 'gormek', 'gorulen', 'gorunur',
  'isitti', 'isitir', 'duyar', 'duydu', 'duyma', 'isitmek',
  'oldu', 'olur', 'olan', 'olmak', 'olmus', 'olacak',
  'yapti', 'yapar', 'yapan', 'yaptilar', 'yapilan',
  'bildi', 'bilir', 'bilen', 'bilmek', 'bildim',
  'yedi', 'icer', 'ictiler', 'icti', 'yer', 'yiyen',
  'yasadi', 'yasayan', 'yasayanlar',
  'cikti', 'girdi', 'kaldi', 'buldu', 'atti',
  'koydu', 'aldi', 'verdi', 'soyledigi',
  // Common adjectives that are very basic Turkish
  'buyuk', 'kucuk', 'cok', 'az', 'iyi', 'kotu', 'guzel', 'cirkin', 'yeni', 'eski',
  'genc', 'yasli', 'uzun', 'kisa', 'agir', 'hafif',
  'diri', 'olu', 'canli', 'yasayan',
  // Very common nouns
  'kisi', 'kimse', 'sey', 'kimse', 'herkes', 'kimseyi', 'butun', 'tum', 'hepsi',
  'baska', 'diger', 'baz', 'bazisi', 'birsey',
  // Body parts (Turkish native)
  'el', 'ayak', 'goz', 'kulak', 'agiz', 'dil', 'bas',
  // Family (native Turkish)
  'baba', 'anne', 'oglu', 'kizi', 'kardes', 'es', 'cocuk', 'cocuklar',
  // Place (native Turkish)
  'yer', 'yeri', 'yere', 'yere', 'ev', 'evi', 'su', 'sular', 'topraga', 'toprak',
  // Generic verbs in infinitive (static DB style)
  'yapmak', 'etmek', 'eylemek', 'kilmak',
];

export const TURKISH_STOP_WORDS = new Set([
  ...TURKISH_PARTICLES,
  ...TURKISH_ARABIC_COGNATES,
  ...BASIC_TURKISH_VERBS,
]);

// Returns true if word's first Turkish translation is a "known/easy" word
const isEasyTurkish = (translation: string): boolean => {
  const first = firstTurkishWord(translation);
  if (!first) return true;
  if (TURKISH_STOP_WORDS.has(first)) return true;
  // strip simple suffixes (-i, -in, -e, -ler, -dir, -dur)
  const stem = first.replace(/(lar|ler|inden|undan|undan|nin|nun|nun|sin|sun|sun|dir|dur|tur|i|u|e|a|in|un|i)$/i, '');
  if (stem.length >= 3 && TURKISH_STOP_WORDS.has(stem)) return true;
  return false;
};

export const isComplexWord = (w: QuranApiWord): boolean => {
  const normAr = normalizeArabic(w.arabic);
  if (normAr.length < 3) return false; // usually particles/prepositions are 1-2 letters
  if (ARABIC_STOP_WORDS.has(normAr)) return false;

  const tr = (w.translation || '').trim();
  if (tr.length < 3) return false;

  // Reject if first Turkish meaning is a known/easy word
  if (isEasyTurkish(tr)) return false;

  return true;
};

// ---- Difficulty scoring (0–10) ----
// Higher = better candidate for learning (longer/distinctive word, multi-word translation)
export const getWordDifficulty = (w: QuranApiWord): number => {
  const normAr = normalizeArabic(w.arabic);
  const tr = (w.translation || '').trim();
  const trWords = tr.split(/\s+/).filter(Boolean);

  let score = 0;
  // Arabic length: 4 = 1pt, 5+ = 2pt, 6+ = 3pt
  if (normAr.length >= 6) score += 3;
  else if (normAr.length >= 5) score += 2;
  else if (normAr.length >= 4) score += 1;

  // Multi-word Turkish translation (often a nuanced concept)
  if (trWords.length >= 3) score += 2;
  else if (trWords.length === 2) score += 1;

  // Long Turkish meaning (8+ chars)
  if (tr.length >= 12) score += 2;
  else if (tr.length >= 8) score += 1;

  // Bonus: Turkish meaning has a parenthetical clarification (e.g. "döndü (tövbe etti)")
  if (tr.includes('(')) score += 1;

  // Penalty: cognate / basic verb in primary meaning
  if (isEasyTurkish(tr)) score -= 5;

  return Math.max(0, Math.min(10, score));
};

// ---- Verse data structure ----
export interface VerseWordData {
  arabic: string;      // full verse text (uthmani)
  turkish: string;     // Diyanet Turkish meal (from alquran.cloud)
  wordTexts: string[]; // individual uthmani word tokens
}

// ---- In-memory verse cache ----
const verseCache: Record<string, VerseWordData> = {};

// ---- Fetch verse: Arabic word tokens from quran.com + Turkish meal from alquran.cloud ----
export const fetchVerse = async (verseKey: string): Promise<VerseWordData | null> => {
  if (verseCache[verseKey]) return verseCache[verseKey];
  try {
    const [qResp, aResp] = await Promise.all([
      fetch(`${API_BASE}/verses/by_key/${verseKey}?words=true&word_fields=text_uthmani`),
      fetch(`https://api.alquran.cloud/v1/ayah/${verseKey}/tr.diyanet`),
    ]);

    if (!qResp.ok) return null;
    const qData = await qResp.json();
    const aData = aResp.ok ? await aResp.json() : null;

    const wordTexts: string[] = (qData.verse?.words || [])
      .filter((w: any) => w.char_type_name === 'word')
      .map((w: any) => (w.text_uthmani || w.text || '') as string);

    const result: VerseWordData = {
      arabic: qData.verse?.text_uthmani || wordTexts.join(' '),
      turkish: aData?.data?.text || '',
      wordTexts,
    };
    verseCache[verseKey] = result;
    return result;
  } catch {
    return null;
  }
};

// ---- Build highlighted tokens from word list ----
// Compares each word token to targetArabic using normalization + prefix matching
export const buildVerseTokens = (
  wordTexts: string[],
  targetArabic: string,
): Array<{ text: string; highlight: boolean }> => {
  const normTarget = normalizeArabic(targetArabic);
  if (!normTarget || normTarget.length < 2) {
    return wordTexts.map(text => ({ text, highlight: false }));
  }
  return wordTexts.map(text => {
    const normText = normalizeArabic(text);
    // Match: exact, or word starts with target (suffixed form), or target starts with word (prefix)
    const highlight =
      normText === normTarget ||
      normText.startsWith(normTarget) ||
      (normTarget.length >= 2 && normText.includes(normTarget)) ||
      (normText.length >= 2 && normTarget.startsWith(normText));
    return { text, highlight };
  });
};

// Keep splitVerseForHighlight as alias for backward compat
export const splitVerseForHighlight = buildVerseTokens;

// ---- Create quiz questions from API words ----

export interface ApiQuizQuestion {
  type: 'arabicToMeaning'; // Arabic word → select English meaning
  word: QuranApiWord;
  options: string[];
  correctIndex: number;
  verseContext: string; // which verse it's from
}

export const generateApiQuizQuestions = (
  sectionWords: QuranApiWord[],
  allSurahWords: QuranApiWord[],
  count: number = 10,
): ApiQuizQuestion[] => {
  const unique = getUniqueWords(sectionWords);
  
  // Pick up to `count` words
  const selected = [...unique]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, unique.length));

  // All unique translations for distractors
  const allUnique = getUniqueWords(allSurahWords);
  const allTranslations = allUnique.map(w => w.translation).filter(t => t.length > 0);

  return selected.map(word => {
    // Get 3 random distractors (different from correct)
    const distractors = allTranslations
      .filter(t => t !== word.translation)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [...distractors, word.translation].sort(() => Math.random() - 0.5);

    return {
      type: 'arabicToMeaning' as const,
      word,
      options,
      correctIndex: options.indexOf(word.translation),
      verseContext: word.verseKey,
    };
  });
};
