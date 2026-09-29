import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { QuranWord, QURAN_WORDS } from '../data/quranWords';
import { t } from '../i18n';

// ---- Types ----

export interface WordMemory {
  wordId: string;
  interval: number;    // days
  easeFactor: number;  // 1.3–2.5
  nextReview: number;  // timestamp ms
  correct: number;
  incorrect: number;
  consecutiveCorrect: number; // track streak for removing from weak
}

export interface LearnProgress {
  learnedWords: string[];   // wordIds: 3+ correct answers
  weakWords: string[];      // wordIds: 2+ errors
  strongWords: string[];    // wordIds: fully mastered (interval >= 21)
  knownWords: string[];     // wordIds: at least 1 correct (for display)
  xp: number;
  streak: number;
  lastStudyDate: string | null;  // ISO date string 'YYYY-MM-DD'
  wordMemories: Record<string, WordMemory>;
  dailyGoal: number;         // 5 | 10 | 20
  onboardingDone: boolean;
  aiCaches: Record<string, { text: string; cachedAt: number }>;
  unlockedLevel: 1 | 2 | 3; // which level packs are unlocked
}

export interface Question {
  type: 1 | 2;      // 1=arabic→turkish  2=turkish→arabic
  word: QuranWord;
  options: string[];    // 4 option strings
  correctIndex: number;
  verseKey: string;
}

export interface QuizResult {
  wordId: string;
  correct: boolean;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  check: (p: LearnProgress) => boolean;
}

// ---- Constants ----

const STORAGE_KEY = '@quranlearn/progress';

export const XP_TABLE = {
  correctAnswer: 10,
  perfectSession: 50,
  newWordLearned: 15,
  streakBonus: 20,
} as const;

// Level unlock thresholds: complete X% of current level to unlock next
const LEVEL_UNLOCK_THRESHOLD = 0.35; // 35% of current level words learned → unlock next

export const BADGES: Badge[] = [
  { id: 'first10',   get label() { return t('learn.badge_first10'); }, icon: 'Leaf',       color: '#10b981', get description() { return t('learn.badgeDesc_first10'); }, check: p => p.learnedWords.length >= 10 },
  { id: 'first50',   get label() { return t('learn.badge_first50'); }, icon: 'BookOpen',   color: '#10b981', get description() { return t('learn.badgeDesc_first50'); }, check: p => p.learnedWords.length >= 50 },
  { id: 'first100',  get label() { return t('learn.badge_first100'); }, icon: 'Award',      color: '#10b981', get description() { return t('learn.badgeDesc_first100'); }, check: p => p.learnedWords.length >= 100 },
  { id: 'fatiha',    get label() { return t('learn.badge_fatiha'); }, icon: 'BookOpen',   color: '#059669', get description() { return t('learn.badgeDesc_fatiha'); }, check: p => p.learnedWords.some(id => { const w = QURAN_WORDS.find(x => x.id === id); return w?.sureList.includes(1) ?? false; }) },
  { id: 'streak3',   get label() { return t('learn.badge_streak3'); }, icon: 'Flame',      color: '#f59e0b', get description() { return t('learn.badgeDesc_streak3'); }, check: p => p.streak >= 3 },
  { id: 'streak7',   get label() { return t('learn.badge_streak7'); }, icon: 'Flame',      color: '#f59e0b', get description() { return t('learn.badgeDesc_streak7'); }, check: p => p.streak >= 7 },
  { id: 'streak30',  get label() { return t('learn.badge_streak30'); }, icon: 'Star',       color: '#f59e0b', get description() { return t('learn.badgeDesc_streak30'); }, check: p => p.streak >= 30 },
  { id: 'xp500',     get label() { return t('learn.badge_xp500'); }, icon: 'Zap',        color: '#f59e0b', get description() { return t('learn.badgeDesc_xp500'); }, check: p => p.xp >= 500 },
  { id: 'xp2000',    get label() { return t('learn.badge_xp2000'); }, icon: 'TrendingUp', color: '#f59e0b', get description() { return t('learn.badgeDesc_xp2000'); }, check: p => p.xp >= 2000 },
];

// ---- Surah names for surah-based mode ----
export const SURAH_NAMES: Record<number, string> = {
  1: 'Fatiha', 2: 'Bakara', 3: 'Âl-i İmrân', 4: 'Nisâ', 5: 'Mâide',
  6: 'En\'âm', 7: 'A\'râf', 8: 'Enfâl', 9: 'Tevbe', 10: 'Yûnus',
  11: 'Hûd', 12: 'Yûsuf', 14: 'İbrâhîm', 16: 'Nahl', 17: 'İsrâ',
  19: 'Meryem', 20: 'Tâhâ', 21: 'Enbiyâ', 22: 'Hac', 23: 'Mü\'minûn',
  24: 'Nûr', 25: 'Furkân', 27: 'Neml', 31: 'Lokmân', 33: 'Ahzâb',
  35: 'Fâtır', 36: 'Yâsîn', 39: 'Zümer', 42: 'Şûrâ', 48: 'Fetih',
  55: 'Rahmân', 56: 'Vâkıa', 57: 'Hadîd', 61: 'Saff', 62: 'Cuma',
  66: 'Tahrîm', 67: 'Mülk', 70: 'Meâric', 72: 'Cin', 75: 'Kıyâme',
  78: 'Nebe', 82: 'İnfitâr', 85: 'Bürûc', 86: 'Târık', 88: 'Gâşiye',
  89: 'Fecr', 91: 'Şems', 95: 'Tîn', 96: 'Alak', 97: 'Kadr',
  98: 'Beyyine', 99: 'Zilzâl', 103: 'Asr', 112: 'İhlâs', 113: 'Felak', 114: 'Nâs',
};

// Get unique surah numbers from word data
export const getAvailableSurahs = (): number[] => {
  const surahs = new Set<number>();
  QURAN_WORDS.forEach(w => w.sureList.forEach(s => surahs.add(s)));
  return [...surahs].sort((a, b) => a - b);
};

// ---- Centralized "is this word pedagogically valuable?" filter ----
// Same logic applies to: pool building, level-stat counting, level unlock checks.
const normTr = (s: string): string => s
  .toLowerCase()
  .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
  .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
  .replace(/[â]/g, 'a').replace(/[î]/g, 'i').replace(/[û]/g, 'u');

export const isComplexStaticWord = (w: QuranWord): boolean => {
  const { TURKISH_STOP_WORDS } = require('./quranWordApi');
  const synonyms = w.turkish
    .split(/[/,()]/)
    .map(s => normTr(s).split(/\s+/).filter(Boolean)[0] || '')
    .filter(Boolean);
  if (synonyms.length === 0) return false;
  if (TURKISH_STOP_WORDS.has(synonyms[0])) return false;
  if (synonyms[0].length < 4) return false;
  return true;
};

// ---- Default Progress ----

const DEFAULT_PROGRESS: LearnProgress = {
  learnedWords: [],
  weakWords: [],
  strongWords: [],
  knownWords: [],
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  wordMemories: {},
  dailyGoal: 10,
  onboardingDone: false,
  aiCaches: {},
  unlockedLevel: 1,
};

// ---- Storage ----

export const getProgress = async (): Promise<LearnProgress> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
};

export const saveProgress = async (p: LearnProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
};

// ---- Streak logic ----

export const updateStreak = (progress: LearnProgress): LearnProgress => {
  const today = new Date().toISOString().slice(0, 10);
  if (progress.lastStudyDate === today) return progress;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const streak = progress.lastStudyDate === yesterday ? progress.streak + 1 : 1;
  return { ...progress, streak, lastStudyDate: today };
};

// ---- Spaced Repetition (SM-2 simplified) ----

export const getWordMemory = (progress: LearnProgress, wordId: string): WordMemory =>
  progress.wordMemories[wordId] ?? {
    wordId, interval: 1, easeFactor: 2.5, nextReview: 0, correct: 0, incorrect: 0, consecutiveCorrect: 0,
  };

export const updateWordMemory = (memory: WordMemory, correct: boolean): WordMemory => {
  if (correct) {
    const newInterval = Math.round(memory.interval * memory.easeFactor);
    const newEase = Math.min(2.5, Math.max(1.3, memory.easeFactor + 0.1));
    return {
      ...memory,
      interval: Math.min(newInterval, 60),
      easeFactor: newEase,
      nextReview: Date.now() + newInterval * 86_400_000,
      correct: memory.correct + 1,
      consecutiveCorrect: memory.consecutiveCorrect + 1,
    };
  } else {
    return {
      ...memory,
      interval: 1,
      easeFactor: Math.max(1.3, memory.easeFactor - 0.2),
      nextReview: Date.now() + 86_400_000,
      incorrect: memory.incorrect + 1,
      consecutiveCorrect: 0, // reset streak on wrong answer
    };
  }
};

// ---- Session Building ----

export type QuizMode = 'level1' | 'level2' | 'level3' | 'weak' | 'surah' | 'all';

export const buildSession = (
  progress: LearnProgress,
  mode: QuizMode,
  count: number,
  surahNumber?: number,
): QuranWord[] => {
  const now = Date.now();

  const isComplex = isComplexStaticWord;

  // Pool selection by mode
  let pool: QuranWord[];
  if (mode === 'weak') {
    pool = QURAN_WORDS.filter(w => progress.weakWords.includes(w.id));
    if (pool.length < 4) pool = QURAN_WORDS.filter(isComplex); // fallback
  } else if (mode === 'level1') {
    pool = QURAN_WORDS.filter(w => w.level === 1 && isComplex(w));
  } else if (mode === 'level2') {
    pool = QURAN_WORDS.filter(w => w.level <= 2 && isComplex(w));
  } else if (mode === 'level3') {
    pool = QURAN_WORDS.filter(isComplex); // all levels
  } else if (mode === 'surah' && surahNumber) {
    // Get surah words, skip already-learned ones, prioritize harder words
    let surahPool = QURAN_WORDS.filter(w => w.sureList.includes(surahNumber));
    // Remove fully learned words (3+ correct) so user sees new/weak ones
    const unlearnedSurah = surahPool.filter(w => !progress.learnedWords.includes(w.id));
    if (unlearnedSurah.length >= 4) {
      surahPool = unlearnedSurah;
    }
    // Sort: higher level (harder) first, then by fewer correct answers
    pool = surahPool.sort((a, b) => {
      const memA = progress.wordMemories[a.id];
      const memB = progress.wordMemories[b.id];
      if (a.level !== b.level) return b.level - a.level; // harder level first
      return (memA?.correct || 0) - (memB?.correct || 0); // less known first
    });
    if (pool.length < 4) {
      const ids = new Set(pool.map(w => w.id));
      const extras = QURAN_WORDS.filter(w => !ids.has(w.id) && !progress.learnedWords.includes(w.id));
      pool = [...pool, ...extras.sort(() => Math.random() - 0.5).slice(0, 4 - pool.length)];
    }
  } else {
    pool = QURAN_WORDS;
  }

  // Prioritize: NEW unseen words first, then due, then minimal strong review
  const due     = pool.filter(w => { const m = progress.wordMemories[w.id]; return m && m.nextReview <= now; });
  const newW    = pool.filter(w => !progress.wordMemories[w.id]);
  const strong  = pool.filter(w => { const m = progress.wordMemories[w.id]; return m && m.nextReview > now && m.correct >= 3; });

  // Aggressive new word introduction: 60% new, 30% due, 10% strong
  const slots = Math.min(count, pool.length);
  const newCount    = Math.ceil(slots * 0.6);
  const dueCount    = Math.ceil(slots * 0.3);
  const strongCount = Math.max(0, slots - newCount - dueCount);

  const pick = <T>(arr: T[], n: number): T[] =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const selected = [
    ...pick(newW, Math.min(newCount, newW.length)),
    ...pick(due, Math.min(dueCount, due.length)),
    ...pick(strong, Math.min(strongCount, strong.length)),
  ];

  // Fill to count if not enough variety
  if (selected.length < slots) {
    const ids = new Set(selected.map(w => w.id));
    const extras = pool.filter(w => !ids.has(w.id));
    selected.push(...pick(extras, slots - selected.length));
  }

  return selected.slice(0, count).sort(() => Math.random() - 0.5);
};

// ---- Question Generation ----

const getDistractors = (word: QuranWord, type: 1 | 2, count = 3): string[] => {
  // Mix distractors from different levels to make it harder
  const otherLevel = QURAN_WORDS.filter(w => w.id !== word.id && w.level !== word.level);
  const sameLevel = QURAN_WORDS.filter(w => w.id !== word.id && w.level === word.level);
  const fallback  = QURAN_WORDS.filter(w => w.id !== word.id);
  
  // Pick 1 from same level, 2 from other levels (harder mix)
  const samePick = [...sameLevel].sort(() => Math.random() - 0.5).slice(0, 1);
  const otherPick = [...otherLevel].sort(() => Math.random() - 0.5).slice(0, 2);
  let pool = [...samePick, ...otherPick];
  
  // Fallback if not enough variety
  if (pool.length < count) {
    const ids = new Set(pool.map(w => w.id));
    const extras = fallback.filter(w => !ids.has(w.id)).sort(() => Math.random() - 0.5);
    pool = [...pool, ...extras.slice(0, count - pool.length)];
  }
  
  return pool.slice(0, count).map(w => type === 1 ? w.turkish : w.arabic);
};

export const generateQuestion = (word: QuranWord): Question => {
  const type: 1 | 2 = Math.random() > 0.5 ? 1 : 2;
  const correctAnswer = type === 1 ? word.turkish : word.arabic;
  const distractors = getDistractors(word, type);
  const options = [...distractors, correctAnswer].sort(() => Math.random() - 0.5);
  return {
    type,
    word,
    options,
    correctIndex: options.indexOf(correctAnswer),
    verseKey: word.verseKey,
  };
};

// ---- XP & Progress Update ----

export const applyQuizResults = (
  progress: LearnProgress,
  results: QuizResult[],
  words: QuranWord[],
): LearnProgress => {
  let updated = updateStreak(progress);
  const correctCount = results.filter(r => r.correct).length;
  const isPerfect = correctCount === results.length && results.length > 0;

  // XP
  let xpGained = correctCount * XP_TABLE.correctAnswer;
  if (isPerfect) xpGained += XP_TABLE.perfectSession;

  // Update each word's memory
  const newMemories = { ...updated.wordMemories };
  const newLearned  = new Set(updated.learnedWords);
  const newWeak     = new Set(updated.weakWords);
  const newStrong   = new Set(updated.strongWords);
  const newKnown    = new Set(updated.knownWords || []);

  for (const result of results) {
    const old = getWordMemory(updated, result.wordId);
    const mem = updateWordMemory(old, result.correct);
    newMemories[result.wordId] = mem;

    if (result.correct) {
      // Mark as known after first correct answer
      newKnown.add(result.wordId);
      
      // Learned: 3+ correct total
      if (mem.correct >= 3 && !newLearned.has(result.wordId)) {
        newLearned.add(result.wordId);
        xpGained += XP_TABLE.newWordLearned;
      }
      // Strong: interval >= 21 days
      if (mem.interval >= 21) newStrong.add(result.wordId);
      // Remove from weak if 2 consecutive correct answers
      if (mem.consecutiveCorrect >= 2) newWeak.delete(result.wordId);
    } else {
      // Add to weak after incorrect
      newWeak.add(result.wordId);
    }
  }

  // Check level unlocking — counts against FILTERED pool (otherwise unreachable)
  let unlockedLevel = updated.unlockedLevel || 1;
  const level1Words = QURAN_WORDS.filter(w => w.level === 1 && isComplexStaticWord(w));
  const level2Words = QURAN_WORDS.filter(w => w.level === 2 && isComplexStaticWord(w));
  const level1Learned = level1Words.filter(w => newLearned.has(w.id)).length;
  const level2Learned = level2Words.filter(w => newLearned.has(w.id)).length;

  if (unlockedLevel === 1 && level1Learned >= level1Words.length * LEVEL_UNLOCK_THRESHOLD) {
    unlockedLevel = 2;
  }
  if (unlockedLevel === 2 && level2Learned >= level2Words.length * LEVEL_UNLOCK_THRESHOLD) {
    unlockedLevel = 3;
  }

  return {
    ...updated,
    xp: updated.xp + xpGained,
    wordMemories: newMemories,
    learnedWords: [...newLearned],
    weakWords: [...newWeak],
    strongWords: [...newStrong],
    knownWords: [...newKnown],
    unlockedLevel: unlockedLevel as 1 | 2 | 3,
  };
};

// ---- Comprehension (with partial credit) ----
// Computed over the filtered (complex/curated) pool — easy cognates excluded.

export const getComprehension = (progress: LearnProgress): number => {
  const pool = QURAN_WORDS.filter(isComplexStaticWord);
  const totalFreq = pool.reduce((s, w) => s + w.frequency, 0);
  if (totalFreq === 0) return 0;

  let weightedFreq = 0;
  for (const word of pool) {
    const mem = progress.wordMemories[word.id];
    if (!mem) continue;

    // Partial credit: 1 correct = 25%, 2 correct = 60%, 3+ correct = 100%
    let credit = 0;
    if (mem.correct >= 3) credit = 1.0;
    else if (mem.correct === 2) credit = 0.6;
    else if (mem.correct === 1) credit = 0.25;

    weightedFreq += word.frequency * credit;
  }

  return Math.round((weightedFreq / totalFreq) * 100);
};

// Filtered pool size (used by UI for "X / Y kelime öğrenildi")
export const getFilteredPoolSize = (): number => QURAN_WORDS.filter(isComplexStaticWord).length;

// ---- Level Stats ----

export const getLevelStats = (progress: LearnProgress, level: 1 | 2 | 3) => {
  // Use the filtered pool — easy cognates are excluded from "total"
  const words = QURAN_WORDS.filter(w => w.level === level && isComplexStaticWord(w));
  const total = words.length;
  const known = words.filter(w => (progress.knownWords || []).includes(w.id)).length;
  const learned = words.filter(w => progress.learnedWords.includes(w.id)).length;
  const weak = words.filter(w => progress.weakWords.includes(w.id)).length;
  return { total, known, learned, weak, percent: total > 0 ? Math.round((learned / total) * 100) : 0 };
};

// ---- Earned Badges ----

export const getEarnedBadges = (progress: LearnProgress): Badge[] =>
  BADGES.filter(b => b.check(progress));

// ---- AI Word Depth (via proxy) ----
// The Anthropic key never ships inside the app. Requests go to a small proxy
// (see proxy/README.md) whose URL is injected at build time via AI_PROXY_URL.

const getAiProxyUrl = (): string =>
  ((Constants.expoConfig?.extra?.aiProxyUrl as string | undefined) ?? '').trim();

export const isAiAvailable = (): boolean => getAiProxyUrl().length > 0;

export const getWordDepth = async (
  word: QuranWord,
  progress: LearnProgress,
): Promise<{ text: string; updatedProgress: LearnProgress }> => {
  // Cache check (30 day TTL)
  const cached = progress.aiCaches[word.id];
  if (cached && Date.now() - cached.cachedAt < 30 * 86_400_000) {
    return { text: cached.text, updatedProgress: progress };
  }

  const proxyUrl = getAiProxyUrl();
  if (!proxyUrl) throw new Error(t('learn.aiDisabled'));

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      arabic: word.arabic,
      root: word.root,
      turkish: word.turkish,
      frequency: word.frequency,
    }),
  });

  if (!response.ok) throw new Error(t('learn.aiNoResponse', { status: response.status }));

  const data = await response.json();
  const text: string = data.text ?? '';

  const updatedProgress: LearnProgress = {
    ...progress,
    aiCaches: {
      ...progress.aiCaches,
      [word.id]: { text, cachedAt: Date.now() },
    },
  };

  return { text, updatedProgress };
};
