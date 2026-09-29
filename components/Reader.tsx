import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, TextInput, Keyboard, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, ViewToken, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import {
  ArrowLeft, Settings2, X, Copy, Bookmark, Hash, Play, Pause, SkipBack, SkipForward, Square,
  Share2, Layers, Check, BookOpenText, Minus, Plus, WifiOff,
} from 'lucide-react-native';
import { DualSurahResponse, SavedAyah, Ayah } from '../types';
import { toggleSavedWord } from '../services/savedQuranWords';
import { fetchAllSurahWords, QuranApiWord, normalizeArabic } from '../services/quranWordApi';
import { QURAN_WORDS } from '../data/quranWords';
import { useSettingsStore, TRANSLATION_EDITIONS, RECITERS, ArabicFont, ReadingTheme } from '../store/useSettingsStore';
import { useQuranStore } from '../store/useQuranStore';
import { useQuranAudio } from '../services/quranAudio';
import { getSurahEdition, compareAyah, getTafsir, Comparison, TafsirResult, EditionAyah } from '../services/quranExtras';
import { useTheme, FONT, RADIUS, SPACING, Palette } from '../theme';
import { Chip, haptic } from './ui';
import { useIsOnline } from '../hooks/useNetwork';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

interface ReaderProps {
  data: DualSurahResponse;
  onBack: () => void;
  darkMode?: boolean;
  initialAyah?: number;
  onSaveAyah?: (ayah: SavedAyah) => void;
  savedAyahIds?: string[];
  onLastAyahChange?: (ayahNumber: number) => void;
}

type Mode = 'meal' | 'mushaf' | 'image' | 'wordByWord';
type SettingsTab = 'view' | 'text' | 'audio';
type Item = { kind: 'page'; page: number; key: string } | { kind: 'ayah'; index: number; ayah: Ayah; key: string };

const FONT_LABELS: Record<ArabicFont, string> = {
  MeQuran: 'Mushaf', Amiri_400Regular: 'Amiri', ScheherazadeNew_400Regular: 'Scheherazade', NotoNaskhArabic_400Regular: 'Naskh',
};

const Reader: React.FC<ReaderProps> = ({ data, onBack, initialAyah, onSaveAyah, savedAyahIds = [], onLastAyahChange }) => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const s = useSettingsStore();
  const rc = c; // app palette already reflects the chosen style (default / sepia / amoled)
  const pagesRead = useQuranStore(q => q.pagesRead);
  const markPageRead = useQuranStore(q => q.markPageRead);
  const unmarkPageRead = useQuranStore(q => q.unmarkPageRead);
  const setLastPage = useQuranStore(q => q.setLastPage);

  const audio = useQuranAudio();
  const playingGlobal = audio.index >= 0 ? audio.queue[audio.index]?.globalNumber : null;
  const playingHere = audio.index >= 0 && audio.queue[audio.index]?.surah === data.arabic.number;

  const [mode, setMode] = useState<Mode>('meal');
  const [wordsByAyah, setWordsByAyah] = useState<Record<string, QuranApiWord[]>>({});
  const [wordByWordLoading, setWordByWordLoading] = useState(false);
  const [wordsFailed, setWordsFailed] = useState(false);
  const [wordsAttempt, setWordsAttempt] = useState(0);
  const online = useIsOnline();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('view');
  const [showGoTo, setShowGoTo] = useState(false);
  const [goToInput, setGoToInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [extraEdition, setExtraEdition] = useState<{ id: string; ayahs: EditionAyah[] } | null>(null);
  const [editionLoading, setEditionLoading] = useState(false);
  const [compare, setCompare] = useState<{ ayah: Ayah; items: Comparison[]; tafsir: TafsirResult | null; loading: boolean; tab: 'meal' | 'tafsir' } | null>(null);
  const listRef = useRef<FlatList<Item>>(null);
  const currentAyahRef = useRef<number>(initialAyah || 1);
  const highlightAyah = useRef<number | undefined>(initialAyah);

  const surahNumber = data.arabic.number;
  const showBasmalah = surahNumber !== 1 && surahNumber !== 9;
  const ayahs = data.arabic.ayahs;

  // ---- Translation text resolution ----
  const builtin: Record<string, EditionAyah[] | undefined> = {
    'tr.diyanet': data.turkish?.ayahs,
    'tr.yazir': data.yazir?.ayahs,
  };
  useEffect(() => {
    const id = s.translationEdition;
    if (builtin[id] || (extraEdition && extraEdition.id === id)) return;
    let cancelled = false;
    setEditionLoading(true);
    getSurahEdition(surahNumber, id)
      .then(list => { if (!cancelled) setExtraEdition({ id, ayahs: list }); })
      .catch(() => { /* fall back to Diyanet */ })
      .finally(() => { if (!cancelled) setEditionLoading(false); });
    return () => { cancelled = true; };
  }, [s.translationEdition, surahNumber]);

  const translationFor = (index: number): string => {
    const id = s.translationEdition;
    const list = builtin[id] ?? (extraEdition?.id === id ? extraEdition.ayahs : undefined) ?? data.turkish.ayahs;
    return list[index]?.text ?? '';
  };

  // ---- Word by word ----
  useEffect(() => {
    if (mode !== 'wordByWord' || Object.keys(wordsByAyah).length > 0) return;
    setWordByWordLoading(true);
    fetchAllSurahWords(surahNumber, data.arabic.numberOfAyahs)
      .then(allWords => {
        const enriched = allWords.map(w => {
          if (w.translation) return w;
          const normW = normalizeArabic(w.arabic);
          const match = QURAN_WORDS.find(qw => {
            const normQw = normalizeArabic(qw.arabic);
            return normQw === normW || normQw.startsWith(normW) || normW.startsWith(normQw);
          });
          return match ? { ...w, translation: match.turkish } : w;
        });
        const byAyah: Record<string, QuranApiWord[]> = {};
        for (const w of enriched) (byAyah[w.verseKey] ??= []).push(w);
        setWordsByAyah(byAyah);
        // Words come from the network; missing ayahs silently fall back to the meal, so tell the user.
        setWordsFailed(Object.keys(byAyah).length < data.arabic.numberOfAyahs);
      })
      .catch(() => setWordsFailed(true))
      .finally(() => setWordByWordLoading(false));
  }, [mode, wordsAttempt]);

  const retryWords = () => {
    setWordsFailed(false);
    setWordsByAyah({});
    setWordsAttempt(n => n + 1);
  };

  // ---- Helpers ----
  const getAyahText = (raw: string, numberInSurah: number) => {
    const text = raw.replace(/\uFEFF/g, ''); // BOM at the start of 1:1 in alquran.cloud data
    return numberInSurah === 1 && showBasmalah ? text.replace(/^بِسْمِ[\s\S]*?رَّحِيمِ\s*/u, '').trim() : text;
  };

  const showMessage = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    let lastPage = -1;
    ayahs.forEach((ayah, index) => {
      if (ayah.page !== lastPage) {
        out.push({ kind: 'page', page: ayah.page, key: `p${ayah.page}` });
        lastPage = ayah.page;
      }
      out.push({ kind: 'ayah', index, ayah, key: `a${ayah.number}` });
    });
    return out;
  }, [ayahs]);

  const indexOfAyah = (n: number) => items.findIndex(i => i.kind === 'ayah' && i.ayah.numberInSurah === n);

  const scrollToAyah = (n: number, animated = true) => {
    const idx = indexOfAyah(n);
    if (idx < 0) return;
    listRef.current?.scrollToIndex({ index: idx, animated, viewPosition: 0.1 });
  };

  useEffect(() => {
    if (initialAyah && initialAyah > 1 && mode === 'meal') {
      const id = setTimeout(() => scrollToAyah(initialAyah, false), 350);
      return () => clearTimeout(id);
    }
  }, [initialAyah, mode]);

  // Follow the audio
  useEffect(() => {
    if (playingHere && playingGlobal) {
      const a = ayahs.find(x => x.number === playingGlobal);
      if (a && mode === 'meal') scrollToAyah(a.numberInSurah);
    }
  }, [playingGlobal]);

  const ayahsRef = useRef(ayahs);
  ayahsRef.current = ayahs;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(v => (v.item as Item).kind === 'ayah');
    if (first) {
      const item = first.item as Item;
      if (item.kind === 'ayah') {
        currentAyahRef.current = item.ayah.numberInSurah;
        setLastPage(item.ayah.page);
      }
    }
    // Khatm: when the last ayah of a page scrolls into view, that page counts as read.
    const list = ayahsRef.current;
    for (const v of viewableItems) {
      const it = v.item as Item;
      if (it.kind !== 'ayah') continue;
      const nextAyah = list[it.index + 1];
      if (!nextAyah || nextAyah.page !== it.ayah.page) {
        if (!useQuranStore.getState().pagesRead[it.ayah.page]) useQuranStore.getState().markPageRead(it.ayah.page);
      }
    }
  }).current;
  const onPageViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const v of viewableItems) {
      const page = v.item as number;
      if (v.isViewable && !useQuranStore.getState().pagesRead[page]) useQuranStore.getState().markPageRead(page);
    }
  }).current;

  const handleBack = useCallback(() => {
    onLastAyahChange?.(currentAyahRef.current);
    onBack();
  }, [onBack, onLastAyahChange]);

  const handleGoToAyah = () => {
    const num = parseInt(goToInput, 10);
    if (!num || num < 1 || num > data.arabic.numberOfAyahs) return;
    setShowGoTo(false);
    setGoToInput('');
    Keyboard.dismiss();
    if (mode !== 'meal') setMode('meal');
    setTimeout(() => scrollToAyah(num), 250);
  };

  const handleCopy = async (ayah: Ayah, index: number) => {
    await Clipboard.setStringAsync(`${ayah.text}\n\n${translationFor(index)}\n\n${data.arabic.englishName} ${ayah.numberInSurah}`);
    showMessage(t('quran.copiedAyah'));
  };

  const handleBookmark = (ayah: Ayah, index: number) => {
    if (!onSaveAyah) return;
    const id = `${surahNumber}_${ayah.numberInSurah}`;
    onSaveAyah({
      id, surahNumber, surahName: data.arabic.englishName, ayahNumber: ayah.numberInSurah,
      arabic: ayah.text, turkish: translationFor(index), savedAt: Date.now(),
    });
    haptic('success');
    showMessage(savedAyahIds.includes(id) ? t('quran.unsavedAyah') : t('quran.savedAyah'));
  };

  const handleShare = (ayah: Ayah, index: number) => {
    nav.navigate('ShareCard', {
      arabic: getAyahText(ayah.text, ayah.numberInSurah),
      text: translationFor(index),
      source: t('share.ayahSource', { surah: data.arabic.englishName, ayah: ayah.numberInSurah }),
      kind: 'ayah',
    });
  };

  const openCompare = async (ayah: Ayah) => {
    setCompare({ ayah, items: [], tafsir: null, loading: true, tab: 'meal' });
    try {
      const [items, tafsir] = await Promise.all([
        compareAyah(ayah.number, s.language),
        getTafsir(surahNumber, ayah.numberInSurah, s.language).catch(() => null),
      ]);
      setCompare(prev => prev ? { ...prev, items, tafsir, loading: false } : prev);
    } catch {
      setCompare(prev => prev ? { ...prev, loading: false } : prev);
    }
  };

  const playFrom = (ayah: Ayah) => {
    haptic('medium');
    const queue = ayahs.map(a => ({ surah: surahNumber, ayahInSurah: a.numberInSurah, globalNumber: a.number }));
    audio.playQueue(queue, ayahs.findIndex(a => a.number === ayah.number));
  };

  const arabicSize = 24 * s.fontScale;
  const arabicLine = arabicSize * 2.1 * s.lineHeightScale;
  const mealSize = 15 * s.fontScale;

  // ---- Renderers ----
  const renderPageDivider = (page: number) => {
    const read = !!pagesRead[page];
    return (
      <View style={styles.pageDivider}>
        <View style={[styles.pageLine, { backgroundColor: rc.border }]} />
        <TouchableOpacity
          onPress={() => { haptic(read ? 'light' : 'success'); read ? unmarkPageRead(page) : markPageRead(page); }}
          style={[styles.pagePill, { backgroundColor: read ? c.accent : rc.card, borderColor: read ? c.accent : rc.border }]}
          accessibilityRole="checkbox" accessibilityState={{ checked: read }} accessibilityLabel={`${t('quran.page')} ${page}`}
        >
          {read ? <Check size={12} color="#fff" /> : null}
          <Text style={[styles.pagePillText, { color: read ? '#fff' : rc.textSecondary }]}>{t('quran.page')} {page}{read ? ` · ${t('quran.pageRead')}` : ''}</Text>
        </TouchableOpacity>
        <View style={[styles.pageLine, { backgroundColor: rc.border }]} />
      </View>
    );
  };

  const renderAyah = (ayah: Ayah, index: number) => {
    const id = `${surahNumber}_${ayah.numberInSurah}`;
    const saved = savedAyahIds.includes(id);
    const isPlaying = playingHere && playingGlobal === ayah.number;
    const highlighted = highlightAyah.current === ayah.numberInSurah;
    const words = wordsByAyah[`${surahNumber}:${ayah.numberInSurah}`];
    return (
      <View style={[
        styles.ayahCard,
        { backgroundColor: isPlaying ? c.accentSoft : rc.card, borderColor: isPlaying ? c.accent : highlighted ? c.gold : rc.border },
      ]}>
        <View style={styles.ayahHeader}>
          <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.badgeText, { color: c.accentText }]}>{ayah.numberInSurah}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => isPlaying ? audio.toggle() : playFrom(ayah)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t('quran.playAyah')}>
              {isPlaying && audio.playing ? <Pause size={17} color={c.accent} /> : <Play size={17} color={isPlaying ? c.accent : rc.textSecondary} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBookmark(ayah, index)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t('a11y.bookmark')}>
              <Bookmark size={17} color={saved ? c.accent : rc.textSecondary} fill={saved ? c.accent : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openCompare(ayah)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t('quran.compare')}>
              <Layers size={17} color={rc.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare(ayah, index)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t('a11y.share')}>
              <Share2 size={17} color={rc.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCopy(ayah, index)} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={t('common.copy')}>
              <Copy size={17} color={rc.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'wordByWord' && words?.length ? (
          <View style={styles.wordsWrap}>
            {words.map((w, i) => (
              <Pressable
                key={i}
                style={styles.word}
                onLongPress={async () => {
                  try {
                    const list = await toggleSavedWord(w);
                    showMessage(list.some(sw => sw.id === w.id) ? t('quran.wordSaved') : t('quran.wordUnsaved'));
                  } catch { showMessage(t('common.error')); }
                }}
              >
                <Text style={{ fontFamily: s.arabicFont, fontSize: arabicSize, lineHeight: arabicSize * 1.9, color: rc.text, includeFontPadding: false }}>{w.arabic}</Text>
                {w.translation ? <Text style={[styles.wordMeaning, { color: c.accentText }]}>{w.translation}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.arabic, { fontFamily: s.arabicFont, fontSize: arabicSize, lineHeight: arabicLine, color: rc.text }]}>
            {getAyahText(ayah.text, ayah.numberInSurah)}
          </Text>
        )}

        {s.showTranslation && mode !== 'wordByWord' ? (
          <View style={[styles.translation, { borderTopColor: rc.border }]}>
            <Text style={[styles.translationText, { fontSize: mealSize, lineHeight: mealSize * 1.65, color: rc.textSecondary }]}>
              {translationFor(index)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Item }) =>
    item.kind === 'page' ? renderPageDivider(item.page) : renderAyah(item.ayah, item.index);

  const Basmalah = showBasmalah ? (
    <View style={styles.basmalahWrap}>
      <Text style={[styles.basmalah, { color: c.accentText, fontFamily: s.arabicFont === 'MeQuran' ? 'NotoNaskhArabic_400Regular' : s.arabicFont }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
    </View>
  ) : null;

  const pages = useMemo(() => Array.from(new Set(ayahs.map(a => a.page))), [ayahs]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: rc.bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: rc.border }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <ArrowLeft size={22} color={rc.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowGoTo(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('quran.goTo')}>
          <Text style={[styles.headerTitle, { color: c.accentText }]}>{data.arabic.englishName}</Text>
          <Text style={[styles.headerSub, { color: rc.textSecondary }]}>
            {(data.arabic.revelationType === 'Meccan' ? t('quran.mecca') : t('quran.medina')).toUpperCase()} · {t('quran.ayahCount', { count: data.arabic.numberOfAyahs }).toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => (playingHere ? audio.toggle() : playFrom(ayahs[0]))} style={[styles.headerBtn, { backgroundColor: playingHere ? c.accentSoft : c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('quran.playSurah')}>
            {playingHere && audio.playing ? <Pause size={18} color={c.accent} /> : <Play size={18} color={playingHere ? c.accent : rc.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGoTo(true)} style={[styles.headerBtn, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('quran.goTo')}>
            <Hash size={18} color={rc.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={[styles.headerBtn, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('quran.readingSettings')}>
            <Settings2 size={18} color={rc.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {editionLoading ? (
        <View style={[styles.editionBar, { backgroundColor: c.accentSoft }]}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={[styles.editionText, { color: c.accentText }]}>{t('quran.translationLoading')}</Text>
        </View>
      ) : null}

      {mode === 'wordByWord' && wordsFailed && !wordByWordLoading ? (
        <TouchableOpacity onPress={retryWords} style={[styles.editionBar, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
          <WifiOff size={14} color={rc.textSecondary} />
          <Text style={[styles.editionText, { color: rc.textSecondary, flex: 1 }]}>{t('quran.wordsOffline')}</Text>
          <Text style={[styles.editionText, { color: c.accentText }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      ) : null}

      {mode === 'image' && !online ? (
        <View style={[styles.editionBar, { backgroundColor: c.cardAlt }]}>
          <WifiOff size={14} color={rc.textSecondary} />
          <Text style={[styles.editionText, { color: rc.textSecondary, flex: 1 }]}>{t('quran.pagesOffline')}</Text>
        </View>
      ) : null}

      {/* Content */}
      {mode === 'mushaf' ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {Basmalah}
          <View style={[styles.mushaf, { backgroundColor: rc.card, borderColor: rc.border }]}>
            <Text style={[styles.mushafText, { fontFamily: s.arabicFont, fontSize: arabicSize, lineHeight: arabicLine, color: rc.text }]}>
              {ayahs.map(ayah => (
                <Text key={ayah.number}>
                  {getAyahText(ayah.text, ayah.numberInSurah)}
                  <Text style={{ color: c.accent, fontSize: arabicSize }}>{' ۝'}{ayah.numberInSurah.toLocaleString('ar-EG')}{' '}</Text>
                </Text>
              ))}
            </Text>
          </View>
        </ScrollView>
      ) : mode === 'image' ? (
        <FlatList
          data={pages}
          keyExtractor={p => String(p)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={2}
          windowSize={3}
          onViewableItemsChanged={onPageViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70, minimumViewTime: 4000 }}
          renderItem={({ item: page }) => {
            const read = !!pagesRead[page];
            return (
              <View style={[styles.pageWrap, { backgroundColor: rc.card, borderColor: rc.border }]}>
                <View style={styles.pageHead}>
                  <Text style={[styles.pageLabel, { color: rc.textSecondary }]}>{t('quran.page')} {page}</Text>
                  <TouchableOpacity onPress={() => { haptic(read ? 'light' : 'success'); read ? unmarkPageRead(page) : markPageRead(page); }} style={[styles.pagePill, { backgroundColor: read ? c.accent : c.cardAlt, borderColor: read ? c.accent : rc.border }]} accessibilityRole="checkbox" accessibilityState={{ checked: read }}>
                    {read ? <Check size={12} color="#fff" /> : null}
                    <Text style={[styles.pagePillText, { color: read ? '#fff' : rc.textSecondary }]}>{read ? t('quran.pageRead') : t('quran.markPageRead')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ width: '100%', aspectRatio: 0.65, backgroundColor: c.isDark ? '#0f172a' : '#f5f5f4', borderRadius: 12, overflow: 'hidden' }}>
                  <ImageZoom
                    uri={`https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/hafs-wasat/${page}.jpg`}
                    style={{ width: '100%', height: '100%', flex: 1 }}
                    resizeMode="contain" minScale={1} maxScale={4} isPanEnabled isPinchEnabled isDoubleTapEnabled
                  />
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={i => i.key}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {Basmalah}
              {mode === 'wordByWord' && wordByWordLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                  <ActivityIndicator color={c.accent} />
                  <Text style={{ color: rc.textSecondary, fontFamily: FONT.medium, fontSize: 13 }}>{t('quran.wordsLoading')}</Text>
                </View>
              ) : null}
            </>
          }
          contentContainerStyle={[styles.listContent, playingHere && { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.1 }), 120);
          }}
        />
      )}

      {/* Player bar */}
      {playingHere ? (
        <View style={[styles.player, { backgroundColor: c.bgElevated, borderColor: rc.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.playerTitle, { color: rc.text }]} numberOfLines={1}>
              {data.arabic.englishName} · {audio.queue[audio.index]?.ayahInSurah}
            </Text>
            <Text style={[styles.playerSub, { color: rc.textSecondary }]} numberOfLines={1}>
              {RECITERS.find(r => r.id === s.reciterId)?.name}{s.repeatCount ? ` · ${t('quran.repeat')} ${s.repeatCount + 1}×` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={audio.prev} style={styles.playerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.previous')}><SkipBack size={20} color={rc.text} /></TouchableOpacity>
          <TouchableOpacity onPress={audio.toggle} style={[styles.playerMain, { backgroundColor: c.accent }]} accessibilityRole="button" accessibilityLabel={audio.playing ? t('a11y.pause') : t('a11y.play')}>
            {audio.loading ? <ActivityIndicator color="#fff" size="small" /> : audio.playing ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={audio.next} style={styles.playerBtn} accessibilityRole="button" accessibilityLabel={t('a11y.next')}><SkipForward size={20} color={rc.text} /></TouchableOpacity>
          <TouchableOpacity onPress={audio.stop} style={styles.playerBtn} accessibilityRole="button" accessibilityLabel={t('quran.stop')}><Square size={16} color={rc.textSecondary} /></TouchableOpacity>
        </View>
      ) : null}

      {/* Toast */}
      {toast ? (
        <View style={[styles.toast, { backgroundColor: c.isDark ? '#334155' : '#1c1917', bottom: playingHere ? 100 : 40 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* Go To Ayah */}
      <Modal animationType="fade" transparent visible={showGoTo} onRequestClose={() => setShowGoTo(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.goToOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { setShowGoTo(false); Keyboard.dismiss(); }} />
          <View style={[styles.goToModal, { backgroundColor: c.card }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.goToTitle, { color: c.text }]}>{t('quran.goTo')}</Text>
            <Text style={[styles.goToSub, { color: c.textSecondary }]}>{t('quran.goToHint', { max: data.arabic.numberOfAyahs })}</Text>
            <TextInput
              style={[styles.goToInput, { color: c.text, backgroundColor: c.cardAlt, borderColor: c.border }]}
              value={goToInput}
              onChangeText={v => setGoToInput(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad" placeholder="255" placeholderTextColor={c.textMuted} maxLength={3} autoFocus
              onSubmitEditing={handleGoToAyah} returnKeyType="go"
            />
            <TouchableOpacity onPress={handleGoToAyah} style={[styles.goToBtn, { backgroundColor: c.accent, opacity: goToInput ? 1 : 0.4 }]}>
              <Text style={styles.goToBtnText}>{t('common.continue')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Compare / Tafsir sheet */}
      <Modal animationType="slide" transparent visible={!!compare} onRequestClose={() => setCompare(null)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCompare(null)} />
          <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: c.text }]}>{data.arabic.englishName} · {compare?.ayah.numberInSurah}</Text>
              </View>
              <TouchableOpacity onPress={() => setCompare(null)} accessibilityRole="button" accessibilityLabel={t('common.close')}><X size={22} color={c.textSecondary} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
              <Chip label={t('quran.translations')} active={compare?.tab === 'meal'} onPress={() => setCompare(p => p ? { ...p, tab: 'meal' } : p)} icon={<Layers size={13} color={compare?.tab === 'meal' ? '#fff' : c.textSecondary} />} />
              <Chip label={t('quran.tafsir')} active={compare?.tab === 'tafsir'} onPress={() => setCompare(p => p ? { ...p, tab: 'tafsir' } : p)} icon={<BookOpenText size={13} color={compare?.tab === 'tafsir' ? '#fff' : c.textSecondary} />} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              {compare?.loading ? <ActivityIndicator color={c.accent} style={{ marginVertical: 24 }} /> : compare?.tab === 'meal' ? (
                compare.items.map(item => (
                  <View key={item.id} style={[styles.compareCard, { backgroundColor: c.cardAlt }]}>
                    <Text style={[styles.compareName, { color: c.accentText }]}>{item.name}</Text>
                    <Text style={[styles.compareText, { color: c.text }]}>{item.text}</Text>
                  </View>
                ))
              ) : compare?.tafsir ? (
                <View style={[styles.compareCard, { backgroundColor: c.cardAlt }]}>
                  <Text style={[styles.compareName, { color: c.accentText }]}>{compare.tafsir.name}</Text>
                  <Text style={[styles.compareText, { color: c.text }]}>{compare.tafsir.text}</Text>
                </View>
              ) : (
                <Text style={[styles.compareText, { color: c.textSecondary, textAlign: 'center', paddingVertical: 24 }]}>{t('quran.tafsirUnavailable')}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reading settings sheet */}
      <Modal animationType="slide" transparent visible={showSettings} onRequestClose={() => setShowSettings(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowSettings(false)} />
          <View style={[styles.sheet, { backgroundColor: c.card, maxHeight: '85%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>{t('quran.readingSettings')}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}><X size={22} color={c.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.segment}>
              {(['view', 'text', 'audio'] as SettingsTab[]).map(tab => (
                <Chip key={tab} label={t(`quran.settings${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)} active={settingsTab === tab} onPress={() => setSettingsTab(tab)} style={{ flex: 1, justifyContent: 'center' }} />
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.lg, paddingBottom: 32 }}>
              {settingsTab === 'view' ? (
                <>
                  <Section label={t('quran.mode')} c={c}>
                    <Chip label={t('quran.modeMeal')} active={mode === 'meal'} onPress={() => setMode('meal')} />
                    <Chip label={t('quran.modeMushaf')} active={mode === 'mushaf'} onPress={() => setMode('mushaf')} />
                    <Chip label={t('quran.modePage')} active={mode === 'image'} onPress={() => setMode('image')} />
                    <Chip label={t('quran.modeWords')} active={mode === 'wordByWord'} onPress={() => setMode('wordByWord')} />
                  </Section>
                  <Section label={t('quran.translation')} c={c}>
                    <Chip label={t('quran.showTranslation')} active={s.showTranslation} onPress={() => s.setShowTranslation(true)} />
                    <Chip label={t('quran.arabicOnly')} active={!s.showTranslation} onPress={() => s.setShowTranslation(false)} />
                  </Section>
                  {s.showTranslation ? (
                    <SelectList
                      label={t('quran.edition')} c={c}
                      options={TRANSLATION_EDITIONS.filter(e => e.lang === s.language).map(e => ({ id: e.id, label: e.name }))}
                      value={s.translationEdition}
                      onChange={id => s.setTranslationEdition(id)}
                    />
                  ) : null}
                </>
              ) : null}

              {settingsTab === 'text' ? (
                <>
                  <View style={[styles.preview, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                    <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('quran.preview').toUpperCase()}</Text>
                    <Text style={{ fontFamily: s.arabicFont, fontSize: arabicSize, lineHeight: arabicLine, color: rc.text, textAlign: 'right', writingDirection: 'rtl' }}>
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </Text>
                  </View>
                  <Stepper
                    label={t('quran.fontSize')} c={c}
                    value={`${Math.round(s.fontScale * 100)}%`}
                    onDec={() => s.setFontScale(Math.round((s.fontScale - 0.1) * 100) / 100)}
                    onInc={() => s.setFontScale(Math.round((s.fontScale + 0.1) * 100) / 100)}
                    canDec={s.fontScale > 0.8} canInc={s.fontScale < 1.6}
                  />
                  <Stepper
                    label={t('quran.lineHeight')} c={c}
                    value={`${s.lineHeightScale.toFixed(1)}×`}
                    onDec={() => s.setLineHeightScale(Math.round((s.lineHeightScale - 0.1) * 10) / 10)}
                    onInc={() => s.setLineHeightScale(Math.round((s.lineHeightScale + 0.1) * 10) / 10)}
                    canDec={s.lineHeightScale > 1} canInc={s.lineHeightScale < 1.6}
                  />
                  <SelectList
                    label={t('quran.arabicFont')} c={c}
                    options={(Object.keys(FONT_LABELS) as ArabicFont[]).map(f => ({ id: f, label: FONT_LABELS[f], sample: <Text style={{ fontFamily: f, fontSize: 20, color: c.text }}>الحمد لله</Text> }))}
                    value={s.arabicFont}
                    onChange={id => s.setArabicFont(id as ArabicFont)}
                  />
                  <Section label={t('quran.readingTheme')} c={c}>
                    {(['default', 'sepia', 'amoled'] as ReadingTheme[]).map(v => <Chip key={v} label={t(`quran.theme${v.charAt(0).toUpperCase()}${v.slice(1)}`)} active={s.readingTheme === v} onPress={() => s.setReadingTheme(v)} />)}
                  </Section>
                </>
              ) : null}

              {settingsTab === 'audio' ? (
                <>
                  <SelectList
                    label={t('quran.reciter')} c={c}
                    options={RECITERS.map(r => ({ id: r.id, label: r.name }))}
                    value={s.reciterId}
                    onChange={id => s.setReciter(id)}
                  />
                  <Section label={t('quran.repeat')} c={c}>
                    {[0, 1, 2, 4].map(n => <Chip key={n} label={n === 0 ? t('quran.repeatOff') : t('quran.repeatTimes', { count: n + 1 })} active={s.repeatCount === n} onPress={() => s.setRepeatCount(n)} />)}
                  </Section>
                  <Text style={[styles.hint, { color: c.textMuted }]}>{t('audio.downloadHint')}</Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Section: React.FC<{ label: string; c: Palette; children: React.ReactNode }> = ({ label, c, children }) => (
  <View style={{ gap: 8 }}>
    <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{label.toUpperCase()}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
  </View>
);

/** Compact −/+ control for numeric reading preferences. */
const Stepper: React.FC<{ label: string; c: Palette; value: string; onDec: () => void; onInc: () => void; canDec: boolean; canInc: boolean }> =
  ({ label, c, value, onDec, onInc, canDec, canInc }) => (
    <View style={styles.stepperRow}>
      <Text style={[styles.sectionLabel, { color: c.textSecondary, flex: 1 }]}>{label.toUpperCase()}</Text>
      <View style={[styles.stepper, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
        <TouchableOpacity onPress={() => { haptic('selection'); onDec(); }} disabled={!canDec} hitSlop={6} style={[styles.stepperBtn, { opacity: canDec ? 1 : 0.35 }]} accessibilityRole="button" accessibilityLabel={t('quran.smaller')}>
          <Minus size={16} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: c.text }]}>{value}</Text>
        <TouchableOpacity onPress={() => { haptic('selection'); onInc(); }} disabled={!canInc} hitSlop={6} style={[styles.stepperBtn, { opacity: canInc ? 1 : 0.35 }]} accessibilityRole="button" accessibilityLabel={t('quran.larger')}>
          <Plus size={16} color={c.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

/** Single-choice list with a check mark; better than wrapping chips for long option names. */
const SelectList: React.FC<{ label: string; c: Palette; options: { id: string; label: string; sample?: React.ReactNode }[]; value: string; onChange: (id: string) => void }> =
  ({ label, c, options, value, onChange }) => (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{label.toUpperCase()}</Text>
      <View style={[styles.selectList, { borderColor: c.border, backgroundColor: c.cardAlt }]}>
        {options.map((o, i) => {
          const active = o.id === value;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => { haptic('selection'); onChange(o.id); }}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.selectRow, i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
            >
              <Text style={[styles.selectText, { color: c.text, fontFamily: active ? FONT.semibold : FONT.regular }]}>{o.label}</Text>
              {o.sample}
              <View style={[styles.radio, { borderColor: active ? c.accent : c.borderStrong, backgroundColor: active ? c.accent : 'transparent' }]}>
                {active ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: FONT.bold },
  headerSub: { fontSize: 9, fontFamily: FONT.semibold, letterSpacing: 1.6, marginTop: 2 },
  editionBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  editionText: { fontSize: 12, fontFamily: FONT.medium },
  listContent: { padding: SPACING.lg, paddingBottom: 48 },
  basmalahWrap: { alignItems: 'center', marginBottom: SPACING.lg },
  basmalah: { fontSize: 26, textAlign: 'center' },
  pageDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  pageLine: { flex: 1, height: StyleSheet.hairlineWidth },
  pagePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pagePillText: { fontSize: 11, fontFamily: FONT.semibold },
  ayahCard: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  ayahHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontFamily: FONT.bold },
  actions: { flexDirection: 'row', gap: 2 },
  actionBtn: { padding: 7 },
  arabic: { textAlign: 'right', writingDirection: 'rtl', paddingHorizontal: 18, paddingVertical: 12 },
  wordsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 12, rowGap: 16, columnGap: 6 },
  word: { alignItems: 'center', minWidth: 44, paddingTop: 6 },
  wordMeaning: { fontSize: 11, fontFamily: FONT.medium, textAlign: 'center', maxWidth: 84 },
  translation: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  translationText: { fontFamily: FONT.regular },
  mushaf: { borderRadius: RADIUS.lg, padding: 22, borderWidth: 1 },
  mushafText: { textAlign: 'right', writingDirection: 'rtl' },
  pageWrap: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 10, marginBottom: 16 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  pageLabel: { fontSize: 12, fontFamily: FONT.semibold },
  player: { position: 'absolute', left: 12, right: 12, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 10, paddingLeft: 14, borderRadius: RADIUS.lg, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  playerTitle: { fontSize: 13, fontFamily: FONT.bold },
  playerSub: { fontSize: 11, fontFamily: FONT.medium, marginTop: 1 },
  playerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  playerMain: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  toastText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold },
  goToOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  goToModal: { width: '80%', maxWidth: 320, borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', gap: 12 },
  goToTitle: { fontSize: 18, fontFamily: FONT.bold },
  goToSub: { fontSize: 13, fontFamily: FONT.regular },
  goToInput: { width: '100%', borderRadius: RADIUS.md, borderWidth: 1, paddingVertical: 12, fontSize: 24, fontFamily: FONT.bold, textAlign: 'center' },
  goToBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 4 },
  goToBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.bold },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.xl, paddingBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sheetTitle: { fontSize: 17, fontFamily: FONT.bold },
  sectionLabel: { fontSize: 11, fontFamily: FONT.semibold, letterSpacing: 1.3 },
  compareCard: { borderRadius: RADIUS.md, padding: 14, gap: 6 },
  compareName: { fontSize: 11, fontFamily: FONT.bold, letterSpacing: 0.5 },
  compareText: { fontSize: 14, lineHeight: 22, fontFamily: FONT.regular },
  hint: { fontSize: 11, fontFamily: FONT.regular, textAlign: 'center' },
  segment: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
  preview: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.sm, overflow: 'hidden' },
  stepperBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 56, textAlign: 'center', fontSize: 14, fontFamily: FONT.semibold },
  selectList: { borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: SPACING.md },
  selectText: { flex: 1, fontSize: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

export default Reader;
