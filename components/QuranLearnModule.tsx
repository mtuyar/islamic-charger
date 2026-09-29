import { paletteFor } from '../theme';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Alert, ActivityIndicator, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, BookOpen, Zap, Target, TrendingUp, Award,
  Star, RotateCcw, ChevronRight, Flame, RefreshCw,
  CheckCircle, XCircle, Leaf, Lock, MapPin,
} from 'lucide-react-native';
import {
  getProgress, saveProgress, buildSession, generateQuestion,
  applyQuizResults, getComprehension, getEarnedBadges, getWordDepth, isAiAvailable,
  getLevelStats, getAvailableSurahs, getFilteredPoolSize, SURAH_NAMES,
  LearnProgress, Question, QuizResult, QuizMode, Badge, BADGES, XP_TABLE,
} from '../services/quranLearn';
import { QURAN_WORDS, QuranWord } from '../data/quranWords';
import { fetchVerse, buildVerseTokens, fetchAllSurahWords, QuranApiWord } from '../services/quranWordApi';
import {
  getAvailableSurahsForJourney, startJourney, getJourney, completeSection,
  getWordsForSection, getAllJourneys, SurahJourneyData, SurahSection,
} from '../services/surahJourney';
import { t } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

type ModuleScreen =
  | 'onboarding'
  | 'home'
  | 'quiz'
  | 'result'
  | 'progress'
  | 'wordDetail'
  | 'surahPicker'
  | 'surahJourney'
  | 'surahStudy'
  | 'knownWords';

interface Props {
  darkMode: boolean;
  onBack: () => void;
}

// ---- Colours ----
const GREEN        = '#10b981';
const EMERALD_LIGHT = '#d1fae5';
const EMERALD_DARK  = '#065f46';
const RED    = '#ef4444';

const getBadgeIcon = (icon: string, color: string, size = 22) => {
  switch (icon) {
    case 'Leaf':       return <Leaf       size={size} color={color} />;
    case 'BookOpen':   return <BookOpen   size={size} color={color} />;
    case 'Award':      return <Award      size={size} color={color} />;
    case 'Flame':      return <Flame      size={size} color={color} />;
    case 'Star':       return <Star       size={size} color={color} fill={color} />;
    case 'Zap':        return <Zap        size={size} color={color} />;
    case 'TrendingUp': return <TrendingUp size={size} color={color} />;
    default:           return <Award      size={size} color={color} />;
  }
};

const QuranLearnModule: React.FC<Props> = ({ darkMode, onBack }) => {
  useSettingsStore(st => st.language); // re-render on language change
  const pal = paletteFor(darkMode);
  const bg        = pal.bg;
  const cardBg    = pal.card;
  const border    = pal.border;
  const textP     = pal.text;
  const textS     = pal.textSecondary;

  // Core state
  const [view,      setView]     = useState<ModuleScreen>('home');
  const [progress,  setProgress] = useState<LearnProgress | null>(null);

  // Quiz state
  const [mode,      setMode]     = useState<QuizMode>('level1');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex,    setQIndex]   = useState(0);
  const [results,   setResults]  = useState<QuizResult[]>([]);
  const [answeredMap, setAnsweredMap] = useState<Record<number, number>>({});
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [activeJourney, setActiveJourney] = useState<SurahJourneyData | null>(null);
  const [journeySection, setJourneySection] = useState<number>(0);
  const [isJourneyQuiz, setIsJourneyQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  // Verse map for example verses (includes word tokens for highlighting)
  const [verseMap, setVerseMap] = useState<Record<string, import('../services/quranWordApi').VerseWordData>>({});

  // Word detail state
  const [detailWord, setDetailWord] = useState<QuranWord | null>(null);
  const [aiText,     setAiText]    = useState('');
  const [aiLoading,  setAiLoading] = useState(false);

  // Difficulty picker state
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  const [pendingMode, setPendingMode] = useState<QuizMode>('level1');
  const [pendingSurah, setPendingSurah] = useState<number | undefined>();

  const [journeys, setJourneys] = useState<Record<string, SurahJourneyData>>({});

  // Study mode (kırık meal before quiz)
  const [studyWords, setStudyWords] = useState<QuranApiWord[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studySection, setStudySection] = useState<SurahSection | null>(null);

  useEffect(() => {
    getProgress().then(p => {
      setProgress(p);
      if (!p.onboardingDone) setView('onboarding');
    });
  }, []);

  // Fetch journeys when view changes to keep them updated
  useEffect(() => {
    if (view === 'surahPicker') {
      getAllJourneys().then(setJourneys);
    }
  }, [view]);

  // Save journey section progress when finishing a quiz
  useEffect(() => {
    if (view === 'result' && isJourneyQuiz && selectedSurah && activeJourney) {
      const correct = results.filter(r => r.correct).length;
      const total   = results.length;
      const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
      completeSection(selectedSurah, journeySection, scorePercent).then(updated => {
        setActiveJourney(updated);
      });
    }
  }, [view]);

  if (!progress) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const persist = async (updated: LearnProgress) => {
    setProgress(updated);
    await saveProgress(updated);
  };

  const comprehension = getComprehension(progress);
  const earned        = getEarnedBadges(progress);
  const currentQ      = questions[qIndex];

  // ---- Pre-fetch verses for a set of questions ----
  const prefetchVerses = async (qs: Question[]) => {
    const entries = await Promise.allSettled(
      qs
        .filter(q => q.verseKey && !verseMap[q.verseKey])
        .map(async q => {
          const v = await fetchVerse(q.verseKey);
          return v ? [q.verseKey, v] as const : null;
        })
    );
    const updates: Record<string, import('../services/quranWordApi').VerseWordData> = {};
    for (const r of entries) {
      if (r.status === 'fulfilled' && r.value) {
        updates[r.value[0]] = r.value[1];
      }
    }
    if (Object.keys(updates).length > 0) {
      setVerseMap(prev => ({ ...prev, ...updates }));
    }
  };

  // ---- ONBOARDING ----
  if (view === 'onboarding') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <ScrollView contentContainerStyle={s.onboardContent}>
          <View style={[s.onboardIconWrap, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : EMERALD_LIGHT }]}>
            <BookOpen size={40} color={darkMode ? '#34d399' : EMERALD_DARK} />
          </View>
          <Text style={[s.onboardTitle, { color: textP }]}>{t('learn.title')}</Text>
          <Text style={[s.onboardSub, { color: textS }]}>
            {t('learn.onboardSub')}
          </Text>

          <Text style={[s.onboardLabel, { color: textS }]}>{t('learn.dailyGoalQuestion')}</Text>
          <View style={s.goalRow}>
            {[5, 10, 20].map(g => (
              <TouchableOpacity
                key={g}
                style={[s.goalBtn, {
                  backgroundColor: progress.dailyGoal === g ? GREEN : cardBg,
                  borderColor: progress.dailyGoal === g ? GREEN : border,
                }]}
                onPress={() => persist({ ...progress, dailyGoal: g })}
              >
                <Text style={[s.goalBtnNum, { color: progress.dailyGoal === g ? '#fff' : textP }]}>{g}</Text>
                <Text style={[s.goalBtnLabel, { color: progress.dailyGoal === g ? EMERALD_LIGHT : textS }]}>{t('learn.wordUnit')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: GREEN }]}
            onPress={async () => {
              await persist({ ...progress, onboardingDone: true });
              setView('home');
            }}
          >
            <Text style={s.primaryBtnText}>{t('common.start')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- START QUIZ ----
  const startQuiz = (m: QuizMode, surah?: number, wordCount?: number) => {
    setMode(m);
    setIsJourneyQuiz(false);
    setAnsweredMap({});
    const count = wordCount ?? progress.dailyGoal;
    const words = buildSession(progress, m, count, surah);
    if (words.length < 4) {
      Alert.alert(t('learn.notEnoughTitle'), t('learn.notEnoughMode'));
      return;
    }
    const qs = words.map(generateQuestion);
    setQuestions(qs);
    setQIndex(0);
    setResults([]);
    setView('quiz');
    prefetchVerses(qs);
  };

  // ---- START JOURNEY QUIZ ----
  const startJourneyQuiz = async (surahNum: number, sectionIdx: number) => {
    setQuizLoading(true);
    try {
      const journey = await startJourney(surahNum);
      setActiveJourney(journey);
      setJourneySection(sectionIdx);
      setSelectedSurah(surahNum);
      setIsJourneyQuiz(true);
      setAnsweredMap({});

      const section = journey.sections[sectionIdx];
      if (!section) return;

      const allWords = await getWordsForSection(surahNum, section);

      // Filter out words answered correctly 2+ times — they're already known
      const freshWords = allWords.filter(w => {
        const mem = progress.wordMemories[w.id];
        return !mem || mem.correct < 2;
      });

      // If too few fresh words remain, relax to < 3 correct threshold
      let finalWords = freshWords.length >= 4
        ? freshWords
        : allWords.filter(w => {
            const mem = progress.wordMemories[w.id];
            return !mem || mem.correct < 3;
          });

      // Last resort: use all words
      if (finalWords.length < 4) finalWords = allWords;

      if (finalWords.length < 4) {
        Alert.alert(t('learn.notEnoughTitle'), t('learn.notEnoughSection'));
        return;
      }
      const qs = finalWords.map(generateQuestion);
      setQuestions(qs);
      setQIndex(0);
      setResults([]);
      setView('quiz');
      prefetchVerses(qs);
    } catch (e) {
      Alert.alert(t('learn.error'), t('learn.loadWordsError'));
    } finally {
      setQuizLoading(false);
    }
  };

  // ---- OPEN STUDY VIEW (kırık meal before quiz) ----
  const openSectionStudy = async (surahNum: number, sectionIdx: number) => {
    const journey = activeJourney;
    if (!journey) return;
    const section = journey.sections[sectionIdx];
    setStudySection(section);
    setJourneySection(sectionIdx);
    setSelectedSurah(surahNum);
    setStudyWords([]);
    setStudyLoading(true);
    setView('surahStudy');
    try {
      const allWords = await fetchAllSurahWords(surahNum, journey.totalAyahs);
      const filtered = allWords.filter(w => {
        const ayah = parseInt(w.verseKey.split(':')[1]);
        return ayah >= section.startAyah && ayah <= section.endAyah;
      });
      setStudyWords(filtered);
    } catch {
      setStudyWords([]);
    } finally {
      setStudyLoading(false);
    }
  };

  // ---- ANSWER HANDLER ----
  const handleAnswer = (idx: number) => {
    if (answeredMap[qIndex] !== undefined) return;
    const correct = idx === currentQ.correctIndex;
    const newAnsweredMap = { ...answeredMap, [qIndex]: idx };
    setAnsweredMap(newAnsweredMap);
    setResults(prev => {
      const updated = [...prev];
      const existingIdx = prev.findIndex(r => r.wordId === currentQ.word.id);
      if (existingIdx >= 0) updated[existingIdx] = { wordId: currentQ.word.id, correct };
      else updated.push({ wordId: currentQ.word.id, correct });
      return updated;
    });
  };

  // ---- NAVIGATION ----
  const goNext = () => {
    if (qIndex + 1 >= questions.length) {
      // Build final results from answeredMap
      const finalResults = questions.map((q, i) => ({
        wordId: q.word.id,
        correct: answeredMap[i] === q.correctIndex,
      })).filter((_, i) => answeredMap[i] !== undefined);
      const updated = applyQuizResults(progress, finalResults, QURAN_WORDS);
      persist(updated);
      setView('result');
    } else {
      setQIndex(i => i + 1);
    }
  };

  const goPrev = () => {
    if (qIndex > 0) setQIndex(i => i - 1);
  };

  // ---- OPEN WORD DETAIL ----
  const openWordDetail = (word: QuranWord) => {
    setDetailWord(word);
    setAiText('');
    setView('wordDetail');
    // Fetch example verse if not already cached
    if (word.verseKey && !verseMap[word.verseKey]) {
      fetchVerse(word.verseKey).then(v => {
        if (v) setVerseMap(prev => ({ ...prev, [word.verseKey]: v }));
      });
    }
  };

  const handleAI = async () => {
    if (!detailWord) return;
    setAiLoading(true);
    try {
      const { text, updatedProgress } = await getWordDepth(detailWord, progress);
      setAiText(text);
      await persist(updatedProgress);
    } catch (e: any) {
      Alert.alert(t('learn.error'), e?.message ?? t('learn.aiFailed'));
    } finally {
      setAiLoading(false);
    }
  };

  // ===========================================================
  // ---- HOME VIEW ----
  // ===========================================================
  if (view === 'home') {
    const weeklyDue = QURAN_WORDS.filter(w => {
      const m = progress.wordMemories[w.id];
      return m && m.nextReview <= Date.now();
    }).length;

    const lvl1 = getLevelStats(progress, 1);
    const lvl2 = getLevelStats(progress, 2);
    const lvl3 = getLevelStats(progress, 3);
    const unlockedLvl = progress.unlockedLevel || 1;
    const knownCount = (progress.knownWords || []).length;

    const levelPacks: { level: 1|2|3; title: string; sub: string; stats: typeof lvl1; locked: boolean; color: string }[] = [
      { level: 1, title: t('learn.level1Title'), sub: t('learn.level1Sub', { count: lvl1.total }), stats: lvl1, locked: false, color: GREEN },
      { level: 2, title: t('learn.level2Title'), sub: t('learn.level2Sub', { count: lvl2.total }), stats: lvl2, locked: unlockedLvl < 2, color: '#f59e0b' },
      { level: 3, title: t('learn.level3Title'), sub: t('learn.level3Sub', { count: lvl3.total }), stats: lvl3, locked: unlockedLvl < 3, color: '#8b5cf6' },
    ];

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={onBack} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{t('learn.title')}</Text>
          <TouchableOpacity onPress={() => setView('progress')} style={s.iconBtn}>
            <TrendingUp size={22} color={GREEN} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Comprehension banner */}
          <TouchableOpacity onPress={() => setView('progress')} activeOpacity={0.9} style={s.bannerWrap}>
            <LinearGradient
              colors={darkMode ? [EMERALD_DARK, '#047857'] : [EMERALD_LIGHT, '#a7f3d0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.banner}
            >
              <View>
                <Text style={[s.bannerPct, { color: darkMode ? '#34d399' : EMERALD_DARK }]}>{comprehension}%</Text>
                <Text style={[s.bannerLabel, { color: pal.accent }]}>
                  {t('learn.masteryLabel')}
                </Text>
                <Text style={[s.bannerSub, { color: darkMode ? '#a7f3d0' : '#065f46' }]}>
                  {t('learn.learnedOf', { learned: progress.learnedWords.length, total: getFilteredPoolSize() })}
                </Text>
                <Text style={[s.bannerNote, { color: pal.accent }]}>
                  {t('learn.poolNote')}
                </Text>
              </View>
              <View style={s.bannerRight}>
                {progress.streak > 0 && (
                  <View style={[s.streakBadge, { backgroundColor: darkMode ? 'rgba(251,191,36,0.2)' : '#fef9c3' }]}>
                    <Flame size={16} color="#f59e0b" />
                    <Text style={s.streakBadgeText}>{progress.streak}</Text>
                  </View>
                )}
                <Text style={[s.bannerXP, { color: darkMode ? '#34d399' : EMERALD_DARK }]}>{progress.xp} XP</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Curated selection note */}
          <View style={[s.curatedHint, {
            backgroundColor: darkMode ? 'rgba(139,92,246,0.1)' : '#faf5ff',
            borderColor: darkMode ? '#8b5cf6' : '#e9d5ff',
          }]}>
            <Zap size={14} color={darkMode ? '#a78bfa' : '#7c3aed'} />
            <Text style={[s.curatedHintText, { color: darkMode ? '#c4b5fd' : '#6d28d9' }]}>
              {t('learn.curatedHint')}
            </Text>
          </View>

          {/* Level Packs */}
          <Text style={[s.sectionLabel, { color: textS }]}>{t('learn.levelPacks')}</Text>

          {levelPacks.map(pack => (
            <TouchableOpacity
              key={pack.level}
              style={[s.modeCard, {
                backgroundColor: pack.locked
                  ? (darkMode ? 'rgba(100,116,139,0.1)' : '#f8fafc')
                  : (darkMode ? `rgba(${pack.color === GREEN ? '16,185,129' : pack.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.15)` : pack.level === 1 ? '#ecfdf5' : pack.level === 2 ? '#fffbeb' : '#f5f3ff'),
                borderColor: pack.locked
                  ? (pal.borderStrong)
                  : (darkMode ? pack.color : pack.level === 1 ? '#a7f3d0' : pack.level === 2 ? '#fde68a' : '#c4b5fd'),
                opacity: pack.locked ? 0.5 : 1,
              }]}
              onPress={() => {
                if (!pack.locked) {
                  setPendingMode(`level${pack.level}` as QuizMode);
                  setPendingSurah(undefined);
                  setShowDifficultyPicker(true);
                }
              }}
              activeOpacity={pack.locked ? 1 : 0.82}
              disabled={pack.locked}
            >
              <View style={[s.modeIcon, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                {pack.locked
                  ? <Star size={22} color={textS} />
                  : <BookOpen size={22} color={pack.color} />
                }
              </View>
              <View style={s.modeText}>
                <Text style={[s.modeTitle, { color: pack.locked ? textS : textP }]}>{pack.title}</Text>
                <Text style={[s.modeSub, { color: textS }]}>{pack.sub}</Text>
                {!pack.locked && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: pal.borderStrong }}>
                      <View style={{ width: `${pack.stats.percent}%`, height: 4, borderRadius: 2, backgroundColor: pack.color }} />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: pack.color }}>{pack.stats.percent}%</Text>
                  </View>
                )}
              </View>
              <ChevronRight size={18} color={pack.locked ? textS : textP} />
            </TouchableOpacity>
          ))}

          {/* Surah-based mode */}
          <Text style={[s.sectionLabel, { color: textS }]}>{t('learn.bySurah')}</Text>
          <TouchableOpacity
            style={[s.modeCard, {
              backgroundColor: darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff',
              borderColor: darkMode ? '#3b82f6' : '#bfdbfe',
            }]}
            onPress={() => setView('surahPicker')}
            activeOpacity={0.82}
          >
            <View style={[s.modeIcon, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
              <BookOpen size={22} color="#3b82f6" />
            </View>
            <View style={s.modeText}>
              <Text style={[s.modeTitle, { color: textP }]}>{t('learn.pickSurah')}</Text>
              <Text style={[s.modeSub, { color: textS }]}>{t('learn.pickSurahSub')}</Text>
            </View>
            <ChevronRight size={18} color={textS} />
          </TouchableOpacity>

          {/* Weak words shortcut */}
          {progress.weakWords.length > 0 && (
            <TouchableOpacity
              style={[s.modeCard, {
                backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : '#fef2f2',
                borderColor: darkMode ? '#ef4444' : '#fecaca',
              }]}
              onPress={() => {
                setPendingMode('weak');
                setPendingSurah(undefined);
                setShowDifficultyPicker(true);
              }}
              activeOpacity={0.82}
            >
              <View style={[s.modeIcon, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                <RotateCcw size={22} color={RED} />
              </View>
              <View style={s.modeText}>
                <Text style={[s.modeTitle, { color: textP }]}>{t('learn.weakTitle')}</Text>
                <Text style={[s.modeSub, { color: textS }]}>{t('learn.weakSub', { count: progress.weakWords.length })}</Text>
              </View>
              <ChevronRight size={18} color={textS} />
            </TouchableOpacity>
          )}

          {/* Known words / Due for review */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {knownCount > 0 && (
              <TouchableOpacity
                onPress={() => setView('knownWords')}
                style={[s.dueCard, { flex: 1, backgroundColor: darkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5', borderColor: pal.accentSoft }]}
              >
                <CheckCircle size={16} color={GREEN} />
                <Text style={[s.dueText, { color: pal.accentText }]}>
                  {t('learn.knownCount', { count: knownCount })}
                </Text>
              </TouchableOpacity>
            )}
            {weeklyDue > 0 && (
              <TouchableOpacity
                onPress={() => startQuiz('all')}
                style={[s.dueCard, { flex: 1, backgroundColor: darkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb', borderColor: darkMode ? '#f59e0b' : '#fde68a' }]}
              >
                <Target size={16} color="#f59e0b" />
                <Text style={[s.dueText, { color: darkMode ? '#fbbf24' : '#92400e' }]}>
                  {t('learn.dueCount', { count: weeklyDue })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Earned badges preview */}
          {earned.length > 0 && (
            <View style={[s.badgesPreview, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[s.badgesPreviewLabel, { color: textS }]}>{t('learn.earnedBadges')}</Text>
              <View style={s.badgesRow}>
                {earned.slice(0, 5).map(b => (
                  <View key={b.id} style={[s.badgeChip, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    {getBadgeIcon(b.icon, b.color, 18)}
                  </View>
                ))}
                {earned.length > 5 && (
                  <Text style={[s.badgesMore, { color: textS }]}>+{earned.length - 5}</Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Difficulty picker modal */}
        {showDifficultyPicker && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowDifficultyPicker(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
              <View style={[s.diffModal, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[s.diffTitle, { color: textP }]}>{t('learn.pickDifficulty')}</Text>
                {[
                  { key: 'easy' as const, label: t('learn.easy'), sub: t('learn.easySub'), count: 5, color: GREEN },
                  { key: 'normal' as const, label: t('learn.normal'), sub: t('learn.normalSub'), count: 10, color: '#f59e0b' },
                  { key: 'hard' as const, label: t('learn.hard'), sub: t('learn.hardSub'), count: 20, color: '#ef4444' },
                ].map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={[s.diffOption, {
                      borderColor: difficulty === d.key ? d.color : border,
                      borderWidth: difficulty === d.key ? 2 : 1,
                      backgroundColor: difficulty === d.key
                        ? (darkMode
                          ? `rgba(${d.color === GREEN ? '16,185,129' : d.color === '#f59e0b' ? '245,158,11' : '239,68,68'},0.15)`
                          : '#f9fafb')
                        : cardBg,
                    }]}
                    onPress={() => {
                      setDifficulty(d.key);
                      setShowDifficultyPicker(false);
                      setAnsweredMap({});
                      startQuiz(pendingMode, pendingSurah, d.count);
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color, marginRight: 4 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: textP }}>{d.label}</Text>
                      <Text style={{ fontSize: 12, color: textS }}>{d.sub}</Text>
                    </View>
                    {difficulty === d.key && <CheckCircle size={18} color={d.color} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setShowDifficultyPicker(false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: textS, fontSize: 13 }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- QUIZ VIEW ----
  // ===========================================================
  if (view === 'quiz' && currentQ) {
    const isAnswered = answeredMap[qIndex] !== undefined;
    const selectedAnswer = answeredMap[qIndex] ?? null;
    const total = questions.length;
    const progress_ = Object.keys(answeredMap).length / total;
    const verse = currentQ.verseKey ? verseMap[currentQ.verseKey] : null;
    const verseParts = verse?.wordTexts?.length
      ? buildVerseTokens(verse.wordTexts, currentQ.word.arabic)
      : null;

    const optionColor = (idx: number): string => {
      if (!isAnswered) return cardBg;
      if (idx === currentQ.correctIndex) return darkMode ? 'rgba(16,185,129,0.25)' : '#dcfce7';
      if (idx === selectedAnswer) return darkMode ? 'rgba(239,68,68,0.25)' : '#fee2e2';
      return cardBg;
    };
    const optionBorder = (idx: number): string => {
      if (!isAnswered) return border;
      if (idx === currentQ.correctIndex) return GREEN;
      if (idx === selectedAnswer) return RED;
      return border;
    };

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        {/* Quiz header */}
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('home')} style={s.iconBtn}>
            <XCircle size={24} color={textS} />
          </TouchableOpacity>
          <View style={s.progressWrap}>
            <View style={[s.progressTrack, { backgroundColor: border }]}>
              <View style={[s.progressFill, { width: `${progress_ * 100}%`, backgroundColor: GREEN }]} />
            </View>
            <Text style={[s.progressLabel, { color: textS }]}>{qIndex + 1} / {total}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.quizContent} showsVerticalScrollIndicator={false}>

          {/* Question type label */}
          <Text style={[s.qTypeLabel, { color: textS }]}>
            {currentQ.type === 1 ? t('learn.qTypeMeaning') : t('learn.qTypeArabic')}
          </Text>

          {/* Question card */}
          <View style={[s.questionCard, { backgroundColor: darkMode ? 'rgba(16,185,129,0.12)' : EMERALD_LIGHT, borderColor: pal.accentSoft }]}>
            <Text
              style={[
                s.questionText,
                currentQ.type === 1
                  ? { fontFamily: 'ScheherazadeNew_400Regular', fontSize: 42, lineHeight: 64, color: darkMode ? '#34d399' : EMERALD_DARK, paddingTop: 8 }
                  : { fontSize: 20, fontWeight: '600', color: darkMode ? '#34d399' : EMERALD_DARK },
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {currentQ.type === 1 ? currentQ.word.arabic : currentQ.word.turkish}
            </Text>
            {currentQ.type === 1 && (
              <Text style={[s.questionRoot, { color: pal.accent }]}>
                {t('learn.root', { root: currentQ.word.root })}
              </Text>
            )}

            {/* Verse display */}
            {currentQ.verseKey ? (
              <View style={[s.verseBox, { borderTopColor: darkMode ? 'rgba(16,185,129,0.3)' : '#a7f3d0' }]}>
                {verse ? (
                  <>
                    <Text style={[s.verseRef, { color: pal.accent }]}>
                      {t('learn.verseRef', { surah: currentQ.verseKey.split(':')[0], ayah: currentQ.verseKey.split(':')[1] })}
                    </Text>
                    {verseParts ? (
                      <Text style={[s.verseArabicText, { color: darkMode ? '#a7f3d0' : EMERALD_DARK }]}>
                        {verseParts.map((part, i) => (
                          <Text
                            key={i}
                            style={part.highlight
                              ? { color: GREEN, fontWeight: '700', fontFamily: 'ScheherazadeNew_400Regular' }
                              : { fontFamily: 'ScheherazadeNew_400Regular' }
                            }
                          >
                            {i > 0 ? ' ' : ''}{part.text}
                          </Text>
                        ))}
                      </Text>
                    ) : (
                      <Text style={[s.verseArabicText, { color: darkMode ? '#a7f3d0' : EMERALD_DARK }]}>
                        {verse.arabic}
                      </Text>
                    )}
                    {verse.turkish ? (
                      <Text style={[s.verseTurkishText, { color: pal.accent }]} numberOfLines={3}>
                        {verse.turkish}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <ActivityIndicator size="small" color={GREEN} style={{ marginVertical: 8 }} />
                )}
              </View>
            ) : null}

            <TouchableOpacity onPress={() => openWordDetail(currentQ.word)} style={s.detailLink}>
              <Text style={[s.detailLinkText, { color: darkMode ? '#34d399' : GREEN }]}>{t('learn.inspectWord')}</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={s.optionsGrid}>
            {currentQ.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.optionBtn, { backgroundColor: optionColor(idx), borderColor: optionBorder(idx) }]}
                onPress={() => handleAnswer(idx)}
                activeOpacity={0.75}
                disabled={isAnswered}
              >
                {isAnswered && idx === currentQ.correctIndex && <CheckCircle size={16} color={GREEN} style={{ marginRight: 6 }} />}
                {isAnswered && idx === selectedAnswer && idx !== currentQ.correctIndex && <XCircle size={16} color={RED} style={{ marginRight: 6 }} />}
                <Text style={[
                  s.optionText,
                  currentQ.type === 2
                    ? { fontFamily: 'ScheherazadeNew_400Regular', fontSize: 24, lineHeight: 42, paddingTop: 8 }
                    : { fontSize: 14 },
                  { color: !isAnswered ? textP : idx === currentQ.correctIndex ? GREEN : idx === selectedAnswer ? RED : textS }
                ]} adjustsFontSizeToFit numberOfLines={2}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback + Navigation */}
          {isAnswered && (
            <View style={s.navRow}>
              <TouchableOpacity
                style={[s.navBtn, { backgroundColor: cardBg, borderColor: border, opacity: qIndex === 0 ? 0.4 : 1 }]}
                onPress={goPrev}
                disabled={qIndex === 0}
              >
                <ChevronLeft size={20} color={textP} />
                <Text style={[s.navBtnText, { color: textP }]}>{t('learn.previous')}</Text>
              </TouchableOpacity>
              <View style={[s.feedbackInline, {
                backgroundColor: selectedAnswer === currentQ.correctIndex
                  ? (darkMode ? 'rgba(16,185,129,0.2)' : '#dcfce7')
                  : (darkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2'),
              }]}>
                <Text style={{ color: selectedAnswer === currentQ.correctIndex ? GREEN : RED, fontWeight: '700', fontSize: 13 }}>
                  {selectedAnswer === currentQ.correctIndex ? t('learn.correctMark') : t('learn.wrongMark')}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.navBtn, { backgroundColor: GREEN }]}
                onPress={goNext}
              >
                <Text style={[s.navBtnText, { color: '#fff' }]}>
                  {qIndex + 1 >= questions.length ? t('learn.finish') : t('learn.next')}
                </Text>
                <ChevronRight size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- RESULT VIEW ----
  // ===========================================================
  if (view === 'result') {
    const correct = results.filter(r => r.correct).length;
    const total   = results.length;
    const perfect = correct === total && total > 0;
    const xpBase  = correct * XP_TABLE.correctAnswer;
    const xpBonus = perfect ? XP_TABLE.perfectSession : 0;
    const newComp = getComprehension(progress);

    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const journeyPassed = isJourneyQuiz && scorePercent >= 60;

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <ScrollView contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
          <View style={[s.resultIconWrap, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7' }]}>
            <Award size={52} color={GREEN} />
          </View>

          <Text style={[s.resultTitle, { color: textP }]}>
            {perfect ? t('learn.perfect') : journeyPassed ? t('learn.sectionDone') : isJourneyQuiz ? t('learn.tryAgain') : t('learn.sessionDone')}
          </Text>

          {isJourneyQuiz && (
            <Text style={[s.modeSub, { color: textS, textAlign: 'center' }]}>
              {journeyPassed
                ? t('learn.passedSection', { start: activeJourney?.sections[journeySection]?.startAyah, end: activeJourney?.sections[journeySection]?.endAyah })
                : t('learn.needed60', { score: scorePercent })
              }
            </Text>
          )}

          <View style={[s.resultScore, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={s.resultScoreItem}>
              <Text style={[s.resultScoreNum, { color: GREEN }]}>{correct}</Text>
              <Text style={[s.resultScoreLabel, { color: textS }]}>{t('learn.correct')}</Text>
            </View>
            <View style={[s.resultScoreDiv, { backgroundColor: border }]} />
            <View style={s.resultScoreItem}>
              <Text style={[s.resultScoreNum, { color: RED }]}>{total - correct}</Text>
              <Text style={[s.resultScoreLabel, { color: textS }]}>{t('learn.wrong')}</Text>
            </View>
            <View style={[s.resultScoreDiv, { backgroundColor: border }]} />
            <View style={s.resultScoreItem}>
              <Text style={[s.resultScoreNum, { color: GREEN }]}>+{xpBase + xpBonus}</Text>
              <Text style={[s.resultScoreLabel, { color: textS }]}>XP</Text>
            </View>
          </View>

          {perfect && (
            <View style={[s.bonusChip, { backgroundColor: darkMode ? 'rgba(251,191,36,0.15)' : '#fef9c3' }]}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={s.bonusChipText}>{t('learn.perfectBonus', { xp: XP_TABLE.perfectSession })}</Text>
            </View>
          )}

          <View style={[s.compCard, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : EMERALD_LIGHT, borderColor: pal.accentSoft }]}>
            <Text style={[s.compPct, { color: darkMode ? '#34d399' : EMERALD_DARK }]}>{newComp}%</Text>
            <Text style={[s.compLabel, { color: pal.accent }]}>
              {t('learn.masteryOf', { total: getFilteredPoolSize(), pct: newComp })}
            </Text>
          </View>

          <View style={s.resultBtns}>
            {isJourneyQuiz && journeyPassed && activeJourney && journeySection + 1 < activeJourney.sections.length ? (
              <TouchableOpacity style={[s.resultBtn, { backgroundColor: GREEN }]} onPress={() => startJourneyQuiz(selectedSurah!, journeySection + 1)}>
                <ChevronRight size={18} color="#fff" />
                <Text style={s.resultBtnText}>{t('learn.nextSection')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.resultBtn, { backgroundColor: GREEN }]} onPress={() => {
                setAnsweredMap({});
                isJourneyQuiz && selectedSurah ? startJourneyQuiz(selectedSurah, journeySection) : startQuiz(mode);
              }}>
                <RotateCcw size={18} color="#fff" />
                <Text style={s.resultBtnText}>{t('learn.again')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.resultBtn, { backgroundColor: cardBg, borderColor: GREEN, borderWidth: 1.5 }]}
              onPress={() => {
                setAnsweredMap({});
                isJourneyQuiz && selectedSurah ? startJourneyQuiz(selectedSurah, journeySection) : startQuiz(mode, undefined, 10);
              }}
            >
              <RefreshCw size={16} color={GREEN} />
              <Text style={[s.resultBtnText, { color: GREEN }]}>{t('learn.tenMore')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.resultBtn, { backgroundColor: cardBg, borderColor: border, borderWidth: 1 }]} onPress={() => isJourneyQuiz && selectedSurah ? (async () => { const j = await getJourney(selectedSurah); setActiveJourney(j); setView('surahJourney'); })() : setView('home')}>
              <Text style={[s.resultBtnText, { color: textP }]}>{isJourneyQuiz ? t('learn.backToJourney') : t('learn.home')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- WORD DETAIL VIEW ----
  // ===========================================================
  if (view === 'wordDetail' && detailWord) {
    const cached = progress.aiCaches[detailWord.id];
    const cachedText = cached?.text ?? '';
    const displayText = aiText || cachedText;

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => { setView('quiz'); setDetailWord(null); setAiText(''); }} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{t('learn.wordDetail')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false}>
          {/* Arabic display */}
          <View style={[s.detailArabicCard, { backgroundColor: darkMode ? 'rgba(16,185,129,0.12)' : EMERALD_LIGHT, borderColor: pal.accentSoft }]}>
            <Text style={[s.detailArabic, { color: darkMode ? '#34d399' : EMERALD_DARK, fontFamily: 'ScheherazadeNew_400Regular' }]}>
              {detailWord.arabic}
            </Text>
            <Text style={[s.detailTurkish, { color: pal.accent }]}>{detailWord.turkish}</Text>
          </View>

          {/* Meta info */}
          <View style={s.detailMeta}>
            {[
              { label: t('learn.metaRoot'), value: detailWord.root },
              { label: t('learn.metaFrequency'), value: `${detailWord.frequency}×` },
              { label: t('learn.metaLevel'), value: `${detailWord.level}` },
            ].map(item => (
              <View key={item.label} style={[s.metaChip, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[s.metaLabel, { color: textS }]}>{item.label}</Text>
                <Text style={[s.metaValue, { color: textP }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Surahs */}
          <Text style={[s.detailSectionLabel, { color: textS }]}>{t('learn.surahsFound')}</Text>
          <View style={s.sureRow}>
            {detailWord.sureList.map(n => (
              <View key={n} style={[s.sureChip, { backgroundColor: darkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5', borderColor: pal.accentSoft }]}>
                <Text style={[s.sureChipText, { color: darkMode ? '#34d399' : EMERALD_DARK }]}>
                  {SURAH_NAMES[n] ? `${SURAH_NAMES[n]} (${n})` : t('learn.surahN', { n })}
                </Text>
              </View>
            ))}
          </View>

          {/* Example verse */}
          {detailWord.verseKey ? (
            <>
              <Text style={[s.detailSectionLabel, { color: textS }]}>{t('learn.exampleVerse')}</Text>
              <View style={[s.verseExampleCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: textS, marginBottom: 4 }}>
                  {t('learn.verseRef', { surah: detailWord.verseKey.split(':')[0], ayah: detailWord.verseKey.split(':')[1] })}
                </Text>
                {verseMap[detailWord.verseKey] ? (
                  <>
                    {(() => {
                      const vd = verseMap[detailWord.verseKey];
                      const tokens = vd.wordTexts?.length
                        ? buildVerseTokens(vd.wordTexts, detailWord.arabic)
                        : null;
                      return tokens ? (
                        <Text style={{ fontSize: 18, lineHeight: 32, textAlign: 'center', fontFamily: 'ScheherazadeNew_400Regular', color: textP }}>
                          {tokens.map((tok, i) => (
                            <Text
                              key={i}
                              style={{
                                color: tok.highlight ? GREEN : textP,
                                fontWeight: tok.highlight ? '700' : '400',
                                fontFamily: 'ScheherazadeNew_400Regular',
                              }}
                            >
                              {i > 0 ? ' ' : ''}{tok.text}
                            </Text>
                          ))}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 18, lineHeight: 32, textAlign: 'center', fontFamily: 'ScheherazadeNew_400Regular', color: textP }}>
                          {vd.arabic}
                        </Text>
                      );
                    })()}
                    {verseMap[detailWord.verseKey].turkish ? (
                      <Text style={{ fontSize: 12, color: textS, textAlign: 'center', marginTop: 6, lineHeight: 18, fontStyle: 'italic' }}>
                        {verseMap[detailWord.verseKey].turkish}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <ActivityIndicator size="small" color={GREEN} />
                )}
              </View>
            </>
          ) : null}

          {/* AI section — only when a proxy URL is configured */}
          {isAiAvailable() && (
            <>
            <Text style={[s.detailSectionLabel, { color: textS }]}>{t('learn.deepLearn')}</Text>
            {displayText ? (
              <View style={[s.aiCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[s.aiText, { color: textP }]}>{displayText}</Text>
                <TouchableOpacity onPress={handleAI} style={s.aiRefresh} disabled={aiLoading}>
                  <RefreshCw size={14} color={textS} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.aiBtn, { backgroundColor: GREEN, opacity: aiLoading ? 0.7 : 1 }]}
                onPress={handleAI}
                disabled={aiLoading}
              >
                {aiLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Zap size={18} color="#fff" />
                      <Text style={s.aiBtnText}>{t('learn.aiDeepLearn')}</Text>
                    </>
                }
              </TouchableOpacity>
            )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- PROGRESS VIEW ----
  // ===========================================================
  if (view === 'progress') {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('home')} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{t('learn.progress')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Big comprehension stat */}
          <LinearGradient
            colors={darkMode ? [EMERALD_DARK, '#047857'] : [EMERALD_LIGHT, '#a7f3d0']}
            style={s.compBanner}
          >
            <Text style={[s.compBannerPct, { color: darkMode ? '#34d399' : EMERALD_DARK }]}>{comprehension}%</Text>
            <Text style={[s.compBannerLabel, { color: pal.accent }]}>
              {t('learn.masteryOf', { total: getFilteredPoolSize(), pct: comprehension })}
            </Text>
          </LinearGradient>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { key: 'xp', label: 'XP', val: progress.xp,              color: '#f59e0b' },
              { key: 'streak', label: t('learn.statStreak'), val: progress.streak,         color: RED       },
              { key: 'learned', label: t('learn.statLearned'), val: progress.learnedWords.length, color: GREEN },
              { key: 'weak', label: t('learn.statWeak'), val: progress.weakWords.length,     color: '#f59e0b' },
            ].map(st => (
              <View key={st.key} style={[s.statCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[s.statNum, { color: st.color }]}>{st.val}</Text>
                <Text style={[s.statLabel, { color: textS }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Badges */}
          <Text style={[s.sectionLabel, { color: textS }]}>{t('learn.badges')}</Text>
          <View style={s.badgesGrid}>
            {BADGES.map(b => {
              const isEarned = b.check(progress);
              return (
                <View key={b.id} style={[s.badgeCard, {
                  backgroundColor: isEarned ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : cardBg,
                  borderColor: isEarned ? (pal.accentSoft) : border,
                  opacity: isEarned ? 1 : 0.45,
                }]}>
                  <View style={s.badgeCardIconWrap}>
                    {getBadgeIcon(b.icon, isEarned ? b.color : textS, 24)}
                  </View>
                  <Text style={[s.badgeCardLabel, { color: isEarned ? textP : textS }]}>{b.label}</Text>
                  <Text style={[s.badgeCardDesc, { color: textS }]} numberOfLines={2}>{b.description}</Text>
                </View>
              );
            })}
          </View>

          {/* Weak words */}
          {progress.weakWords.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: textS }]}>{t('learn.weakWords')}</Text>
              {progress.weakWords.slice(0, 10).map(id => {
                const w = QURAN_WORDS.find(x => x.id === id);
                if (!w) return null;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.weakWordRow, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => openWordDetail(w)}
                  >
                    <Text style={[s.weakWordArabic, { color: textP, fontFamily: 'ScheherazadeNew_400Regular' }]}>{w.arabic}</Text>
                    <Text style={[s.weakWordTurkish, { color: textS }]}>{w.turkish}</Text>
                    <ChevronRight size={16} color={textS} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- SURAH PICKER VIEW ----
  // ===========================================================
  if (view === 'surahPicker') {
    const surahs = getAvailableSurahsForJourney();

    const openSurahJourney = async (num: number) => {
      const j = await startJourney(num);
      setActiveJourney(j);
      setSelectedSurah(num);
      setView('surahJourney');
    };

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('home')} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{t('learn.surahJourney')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {surahs.map(sr => {
            const j = journeys[String(sr.number)];
            const completedCount = j ? j.sections.filter(sec => sec.completed).length : 0;
            const totalSections = sr.sections;
            const progressPct = j ? Math.round((completedCount / totalSections) * 100) : 0;

            return (
              <TouchableOpacity
                key={sr.number}
                style={[s.weakWordRow, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => openSurahJourney(sr.number)}
              >
                <View style={[s.modeIcon, {
                  backgroundColor: j ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : (darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff'),
                  width: 40, height: 40, borderRadius: 12,
                }]}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: j ? GREEN : '#3b82f6' }}>{sr.number}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[s.modeTitle, { color: textP, fontSize: 14 }]}>{sr.name}</Text>
                  <Text style={[s.modeSub, { color: textS }]}>{t('learn.ayahsSections', { ayahs: sr.ayahs, sections: totalSections })}</Text>
                  {j && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: pal.borderStrong }}>
                        <View style={{ width: `${progressPct}%`, height: 3, borderRadius: 2, backgroundColor: GREEN }} />
                      </View>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: GREEN }}>{progressPct}%</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color={textS} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- SURAH JOURNEY VIEW ----
  // ===========================================================
  if (view === 'surahJourney' && activeJourney) {
    const completedCount = activeJourney.sections.filter(sec => sec.completed).length;
    const totalSections = activeJourney.sections.length;
    const progressPct = Math.round((completedCount / totalSections) * 100);

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('surahPicker')} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{activeJourney.surahName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Journey banner */}
          <LinearGradient
            colors={darkMode ? ['#1e3a5f', '#0f172a'] : ['#dbeafe', '#eff6ff']}
            style={s.banner}
          >
            <View>
              <Text style={[s.bannerPct, { color: darkMode ? '#60a5fa' : '#1d4ed8', fontSize: 32 }]}>{progressPct}%</Text>
              <Text style={[s.bannerLabel, { color: darkMode ? '#93c5fd' : '#2563eb' }]}>
                {t('learn.sectionsDone', { done: completedCount, total: totalSections })}
              </Text>
            </View>
            <MapPin size={28} color={darkMode ? '#60a5fa' : '#3b82f6'} />
          </LinearGradient>

          {/* Sections */}
          <Text style={[s.sectionLabel, { color: textS }]}>{t('learn.sections')}</Text>

          {activeJourney.sections.map((sec, idx) => {
            const isCurrent = idx === activeJourney.currentSection;
            const isLocked = idx > activeJourney.currentSection && !sec.completed;
            const isCompleted = sec.completed;

            return (
              <TouchableOpacity
                key={idx}
                style={[s.modeCard, {
                  backgroundColor: isCompleted
                    ? (darkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5')
                    : isCurrent
                      ? (darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff')
                      : (darkMode ? 'rgba(100,116,139,0.08)' : '#f8fafc'),
                  borderColor: isCompleted
                    ? (pal.accentSoft)
                    : isCurrent
                      ? (darkMode ? '#3b82f6' : '#93c5fd')
                      : (pal.borderStrong),
                  opacity: isLocked ? 0.4 : 1,
                }]}
                onPress={() => !isLocked && openSectionStudy(activeJourney.surahNumber, idx)}
                disabled={isLocked}
                activeOpacity={0.82}
              >
                <View style={[s.modeIcon, {
                  backgroundColor: isCompleted
                    ? (darkMode ? 'rgba(16,185,129,0.2)' : '#dcfce7')
                    : isCurrent
                      ? (darkMode ? 'rgba(59,130,246,0.2)' : '#dbeafe')
                      : (darkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                }]}>
                  {isCompleted ? <CheckCircle size={20} color={GREEN} /> : isLocked ? <Lock size={20} color={textS} /> : <BookOpen size={20} color="#3b82f6" />}
                </View>
                <View style={s.modeText}>
                  <Text style={[s.modeTitle, { color: isLocked ? textS : textP }]}>
                    {t('learn.ayahRange', { start: sec.startAyah, end: sec.endAyah })}
                  </Text>
                  <Text style={[s.modeSub, { color: textS }]}>
                    {isCompleted ? t('learn.score', { score: sec.score }) : isCurrent ? t('learn.nextUp') : t('learn.locked')}
                  </Text>
                </View>
                {!isLocked && <ChevronRight size={18} color={isCompleted ? GREEN : '#3b82f6'} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {quizLoading && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12, fontWeight: '600' }}>{t('learn.wordsLoading')}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- SURAH STUDY VIEW (kırık meal interlinear) ----
  // ===========================================================
  if (view === 'surahStudy' && studySection) {
    const wordsByAyah: Record<string, QuranApiWord[]> = {};
    for (const w of studyWords) {
      const ayahKey = w.verseKey.split(':')[1];
      if (!wordsByAyah[ayahKey]) wordsByAyah[ayahKey] = [];
      wordsByAyah[ayahKey].push(w);
    }
    const ayahNums = Array.from(
      { length: studySection.endAyah - studySection.startAyah + 1 },
      (_, i) => studySection.startAyah + i,
    );

    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('surahJourney')} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>
            {t('learn.ayahRange', { start: studySection.startAyah, end: studySection.endAyah })}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {studyLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={{ color: textS, fontSize: 14, fontWeight: '500' }}>{t('learn.wordsLoading')}</Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={s.scroll}
              contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 110 }}
              showsVerticalScrollIndicator={false}
            >
              {studyWords.length === 0 ? (
                <Text style={{ color: textS, fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  {t('learn.noSectionWords')}
                </Text>
              ) : (
                ayahNums.map(ayahNum => {
                  const words = wordsByAyah[String(ayahNum)] || [];
                  return (
                    <View
                      key={ayahNum}
                      style={{
                        borderBottomWidth: 1, borderBottomColor: border,
                        paddingVertical: 18,
                      }}
                    >
                      {/* Ayah number badge — right-aligned */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12, paddingHorizontal: 4 }}>
                        <View style={{
                          width: 30, height: 30, borderRadius: 15,
                          backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#dcfce7',
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 1, borderColor: pal.accentSoft,
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: pal.accent }}>
                            {ayahNum}
                          </Text>
                        </View>
                      </View>

                      {/* Words — RTL flow */}
                      {words.length > 0 ? (
                        <View style={{
                          flexDirection: 'row-reverse', flexWrap: 'wrap',
                          paddingHorizontal: 4, rowGap: 20, columnGap: 6,
                        }}>
                          {words.map((w, i) => (
                            <View key={i} style={{ alignItems: 'center', minWidth: 44, paddingTop: 10 }}>
                              <Text style={{
                                fontFamily: 'ScheherazadeNew_400Regular',
                                fontSize: 26,
                                color: darkMode ? '#f1f5f9' : '#022c22',
                                lineHeight: 48,
                                includeFontPadding: false,
                              }}>
                                {w.arabic}
                              </Text>
                              {w.translation ? (
                                <Text style={{
                                  fontSize: 10,
                                  color: pal.accent,
                                  textAlign: 'center',
                                  maxWidth: 72,
                                  fontWeight: '600',
                                  marginTop: 2,
                                }}>
                                  {w.translation}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={{ color: textS, fontSize: 11, textAlign: 'center', fontStyle: 'italic' }}>
                          {t('learn.noWordData')}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Sticky start-quiz button */}
            <View style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
              backgroundColor: bg,
              borderTopWidth: 1, borderTopColor: border,
            }}>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: GREEN }]}
                onPress={() => startJourneyQuiz(selectedSurah!, journeySection)}
              >
                <Text style={s.primaryBtnText}>{t('learn.startQuiz')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    );
  }

  // ===========================================================
  // ---- KNOWN WORDS VIEW ----
  // ===========================================================
  if (view === 'knownWords') {
    const known = (progress.knownWords || []).map(id => QURAN_WORDS.find(w => w.id === id)).filter(Boolean) as QuranWord[];
    return (
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
        <View style={[s.header, { borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => setView('home')} style={s.iconBtn}>
            <ChevronLeft size={24} color={textP} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: textP }]}>{t('learn.knownWords')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {known.length === 0 ? (
            <Text style={[s.modeSub, { color: textS, textAlign: 'center', marginTop: 40 }]}>{t('learn.noKnown')}</Text>
          ) : (
            known.map(w => {
              const mem = progress.wordMemories[w.id];
              const isLearned = progress.learnedWords.includes(w.id);
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[s.weakWordRow, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => openWordDetail(w)}
                >
                  <Text style={[s.weakWordArabic, { color: textP, fontFamily: 'ScheherazadeNew_400Regular' }]}>{w.arabic}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.weakWordTurkish, { color: textS }]}>{w.turkish}</Text>
                    <Text style={{ fontSize: 10, color: isLearned ? GREEN : textS, fontWeight: '600', marginTop: 2 }}>
                      {isLearned ? t('learn.learnedMark') : t('learn.correctOf3', { count: mem?.correct || 0 })}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={textS} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
};

// ---- Styles ----
const s = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'android' ? 48 : 40, gap: 14 },

  // Onboarding
  onboardContent: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, alignItems: 'center', gap: 16 },
  onboardIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  onboardTitle: { fontSize: 26, fontWeight: '800' },
  onboardSub: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
  onboardLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  goalRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  goalBtn: { width: 90, height: 80, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  goalBtnNum: { fontSize: 28, fontWeight: '800' },
  goalBtnLabel: { fontSize: 11, fontWeight: '600' },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Home
  bannerWrap: { borderRadius: 20, overflow: 'hidden' },
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 20 },
  bannerPct: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  bannerLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  bannerSub: { fontSize: 11, marginTop: 2 },
  bannerNote: { fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  bannerRight: { alignItems: 'flex-end', gap: 8 },
  bannerXP: { fontSize: 15, fontWeight: '800' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  streakBadgeText: { color: '#f59e0b', fontWeight: '800', fontSize: 14 },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },

  curatedHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  curatedHintText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '500' },

  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: '700' },
  modeSub: { fontSize: 12, marginTop: 2 },

  dueCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  dueText: { fontSize: 14, fontWeight: '600' },

  badgesPreview: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  badgesPreviewLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgesMore: { fontSize: 13, fontWeight: '700' },

  // Difficulty modal
  diffModal: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 12 },
  diffTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  diffOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 10 },

  // Quiz
  progressWrap: { flex: 1, gap: 4 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, fontWeight: '600', textAlign: 'right' },

  quizContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 16 },
  qTypeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textAlign: 'center' },

  questionCard: { borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, alignItems: 'center', borderWidth: 1.5, gap: 8, overflow: 'visible' },
  questionText: { textAlign: 'center' },
  questionRoot: { fontSize: 12, fontWeight: '500' },

  // Verse display in quiz card
  verseBox: { width: '100%', marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 6 },
  verseRef: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },
  verseArabicText: { fontSize: 16, lineHeight: 28, textAlign: 'center', fontFamily: 'ScheherazadeNew_400Regular', writingDirection: 'rtl' },
  verseTurkishText: { fontSize: 11, lineHeight: 16, textAlign: 'center', fontStyle: 'italic' },

  detailLink: { marginTop: 4 },
  detailLinkText: { fontSize: 12, fontWeight: '600' },

  optionsGrid: { gap: 10 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, overflow: 'visible' },
  optionText: { flex: 1, textAlign: 'center', fontWeight: '600' },

  // Navigation row after answer
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  navBtnText: { fontSize: 13, fontWeight: '700' },
  feedbackInline: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },

  // Result
  resultContent: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40, alignItems: 'center', gap: 16 },
  resultIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 26, fontWeight: '800' },
  resultScore: { flexDirection: 'row', width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  resultScoreItem: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  resultScoreNum: { fontSize: 32, fontWeight: '900' },
  resultScoreLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  resultScoreDiv: { width: 1 },
  bonusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  bonusChipText: { fontSize: 13, fontWeight: '600', color: '#92400e' },
  compCard: { width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1.5, gap: 6 },
  compPct: { fontSize: 40, fontWeight: '900' },
  compLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  resultBtns: { flexDirection: 'column', gap: 10, width: '100%' },
  resultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  resultBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Word detail
  detailContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 16 },
  detailArabicCard: { borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1.5, gap: 8 },
  detailArabic: { fontSize: 56, lineHeight: 72, textAlign: 'center' },
  detailTurkish: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  detailMeta: { flexDirection: 'row', gap: 10 },
  metaChip: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  metaValue: { fontSize: 15, fontWeight: '700' },
  detailSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  sureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sureChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  sureChipText: { fontSize: 12, fontWeight: '600' },
  verseExampleCard: { borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 8 },
  aiCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  aiText: { fontSize: 14, lineHeight: 22 },
  aiRefresh: { alignSelf: 'flex-end' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14 },
  aiBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Progress
  compBanner: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  compBannerPct: { fontSize: 52, fontWeight: '900' },
  compBannerLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: '47%', borderRadius: 14, padding: 12, borderWidth: 1, gap: 4, alignItems: 'center' },
  badgeCardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  badgeCardLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  badgeCardDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  weakWordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  weakWordArabic: { fontSize: 24, flex: 0 },
  weakWordTurkish: { flex: 1, fontSize: 14 },
});

export default QuranLearnModule;
