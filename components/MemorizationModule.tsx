import { paletteFor } from '../theme';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, FlatList, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, Plus, BookOpen, Bell,
  CheckCircle, XCircle, Target, Search, Trash2,
  ChevronUp, ChevronDown, TrendingUp,
} from 'lucide-react-native';
import { Surah, MemorizationEntry, MemorizationSettings } from '../types';
import {
  getEntries, addEntry, updateEntry, removeEntry,
  getMemorizationSettings, saveMemorizationSettings,
  scheduleReminder, cancelReminder,
} from '../services/memorization';
import { t, currentLanguage } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

const TOTAL_QURAN_AYAHS = 6236;

// Primary (starting) juz for each surah
const SURAH_JUZ: Record<number, number> = {
  1:1, 2:1, 3:3, 4:4, 5:6, 6:7, 7:8, 8:9, 9:10,
  10:11, 11:11, 12:12, 13:13, 14:13, 15:14, 16:14, 17:15, 18:15, 19:16,
  20:16, 21:17, 22:17, 23:18, 24:18, 25:18, 26:19, 27:19, 28:20, 29:20,
  30:21, 31:21, 32:21, 33:21, 34:22, 35:22, 36:22, 37:23, 38:23, 39:23,
  40:24, 41:24, 42:25, 43:25, 44:25, 45:25, 46:26, 47:26, 48:26, 49:26,
  50:26, 51:26, 52:27, 53:27, 54:27, 55:27, 56:27, 57:27,
  58:28, 59:28, 60:28, 61:28, 62:28, 63:28, 64:28, 65:28, 66:28,
  67:29, 68:29, 69:29, 70:29, 71:29, 72:29, 73:29, 74:29, 75:29, 76:29, 77:29,
  78:30, 79:30, 80:30, 81:30, 82:30, 83:30, 84:30, 85:30, 86:30, 87:30, 88:30,
  89:30, 90:30, 91:30, 92:30, 93:30, 94:30, 95:30, 96:30, 97:30, 98:30, 99:30,
  100:30, 101:30, 102:30, 103:30, 104:30, 105:30, 106:30, 107:30, 108:30,
  109:30, 110:30, 111:30, 112:30, 113:30, 114:30,
};

interface Props {
  surahs: Surah[];
  darkMode: boolean;
  onBack: () => void;
  onOpenSurah?: (surahId: number, startAyah?: number) => void;
}

const MemorizationModule: React.FC<Props> = ({ surahs, darkMode, onBack, onOpenSurah }) => {
  const pal = paletteFor(darkMode);
  useSettingsStore(st => st.language); // re-render on language change
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<MemorizationEntry[]>([]);
  const [settings, setSettings] = useState<MemorizationSettings>({ reminderEnabled: false, reminderHour: 8, reminderMinute: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showMekkiModal, setShowMekkiModal] = useState(false);
  const [showJuzModal, setShowJuzModal] = useState(false);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [addSurah, setAddSurah] = useState<Surah | null>(null);
  const [addType, setAddType] = useState<'surah' | 'ayah'>('surah');
  const [ayahInput, setAyahInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');

  // Colors
  const bg = pal.bg;
  const cardBg = pal.card;
  const border = pal.border;
  const textPrimary = pal.text;
  const textSec = pal.textSecondary;
  const accent = '#10b981';

  useEffect(() => {
    Promise.all([getEntries(), getMemorizationSettings()]).then(([e, s]) => {
      setEntries(e);
      setSettings(s);
    });
  }, []);

  const learning = entries.filter(e => e.status === 'learning' || e.status === 'reviewing'); // Backward compat
  const memorized = entries.filter(e => e.status === 'memorized');

  const handleMarkMemorized = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const updated: MemorizationEntry = { ...entry, status: 'memorized' };
    await updateEntry(updated);
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
  };

  const resetAdd = () => {
    setAddStep(1); setAddSurah(null); setAddType('surah');
    setAyahInput(''); setSurahSearch('');
  };

  const handleAddConfirm = async () => {
    if (!addSurah) return;
    setAddLoading(true);
    try {
      let fromNum = 1, toNum = addSurah.numberOfAyahs;
      if (addType === 'ayah') {
        if (ayahInput.includes('-')) {
          const parts = ayahInput.split('-');
          fromNum = parseInt(parts[0].trim(), 10);
          toNum = parseInt(parts[1].trim(), 10);
        } else {
          fromNum = parseInt(ayahInput.trim(), 10);
          toNum = fromNum;
        }
        if (isNaN(fromNum) || isNaN(toNum) || fromNum < 1 || toNum > addSurah.numberOfAyahs || fromNum > toNum) {
          Alert.alert(t('common.error'), t('memorize.invalidRange', { max: addSurah.numberOfAyahs }));
          setAddLoading(false);
          return;
        }
      }

      const entry: MemorizationEntry = {
        id: addType === 'surah' ? `surah_${addSurah.number}` : `ayahs_${addSurah.number}_${fromNum}_${toNum}`,
        surahNumber: addSurah.number,
        surahName: addSurah.englishName,
        surahArabicName: addSurah.name,
        totalAyahs: addSurah.numberOfAyahs,
        ayahFrom: fromNum,
        ayahTo: toNum,
        addedAt: Date.now(),
        status: 'learning',
        level: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        reviewCount: 0,
      };
      await addEntry(entry);
      setEntries(prev => prev.find(e => e.id === entry.id) ? prev : [entry, ...prev]);
      setShowAdd(false); resetAdd();
    } catch {
      Alert.alert(t('common.error'), t('memorize.addFailed'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('common.delete'), t('memorize.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await removeEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
      }},
    ]);
  };

  const handleToggleReminder = async (val: boolean) => {
    const updated = { ...settings, reminderEnabled: val };
    setSettings(updated);
    await saveMemorizationSettings(updated);
    if (val) await scheduleReminder(updated.reminderHour, updated.reminderMinute);
    else     await cancelReminder();
  };

  const handleTimeChange = async (field: 'hour' | 'minute', delta: number) => {
    const updated = { ...settings };
    if (field === 'hour')   updated.reminderHour   = (updated.reminderHour   + delta + 24) % 24;
    else                    updated.reminderMinute = (updated.reminderMinute + delta + 60) % 60;
    setSettings(updated);
    await saveMemorizationSettings(updated);
    if (updated.reminderEnabled) await scheduleReminder(updated.reminderHour, updated.reminderMinute);
  };

  // ---- İstatistikler ----
  const renderStats = () => {
    if (entries.length === 0) return null;

    const memorizedAyahs = memorized.reduce((sum, e) => sum + (e.ayahTo - e.ayahFrom + 1), 0);
    const learningAyahs  = learning.reduce((sum, e)  => sum + (e.ayahTo - e.ayahFrom + 1), 0);
    const totalAyahs     = memorizedAyahs + learningAyahs;
    const quranPct       = (memorizedAyahs / TOTAL_QURAN_AYAHS) * 100;
    const uniqueSurahSet = new Set(entries.map(e => e.surahNumber));

    // Mekki / Medeni (ezberlenenler üzerinden)
    let mekki = 0, medeni = 0;
    for (const e of memorized) {
      const info = surahs.find(s => s.number === e.surahNumber);
      if (!info) continue;
      const cnt = e.ayahTo - e.ayahFrom + 1;
      if (info.revelationType === 'Meccan') mekki += cnt;
      else medeni += cnt;
    }
    const totalRev = mekki + medeni || 1;
    const mekkaRatio = mekki / totalRev;

    // Cüz dağılımı (ezberlenenler)
    const juzMap: Record<number, number> = {};
    for (const e of memorized) {
      const juz = SURAH_JUZ[e.surahNumber] || 30;
      juzMap[juz] = (juzMap[juz] || 0) + (e.ayahTo - e.ayahFrom + 1);
    }
    const topJuz = Object.entries(juzMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    const maxJuzCount = topJuz.length > 0 ? topJuz[0][1] : 1;

    // Kısa / Uzun sure (≤20 ayet = kısa)
    let shortSurahs = 0, longSurahs = 0;
    for (const e of memorized) {
      const info = surahs.find(s => s.number === e.surahNumber);
      if (!info) continue;
      if (info.numberOfAyahs <= 20) shortSurahs++;
      else longSurahs++;
    }

    const pctStr = quranPct < 0.01 ? '<0.01' : quranPct.toFixed(2);

    return (
      <View style={{ gap: 12, marginBottom: 4 }}>

        {/* ── Ana banner ── */}
        <LinearGradient
          colors={darkMode ? ['#064e3b', '#022c22'] : ['#d1fae5', '#a7f3d0']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 22, gap: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: pal.accentText, lineHeight: 52 }}>
              {currentLanguage() === 'tr' ? `%${pctStr}` : `${pctStr}%`}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: pal.accent, marginBottom: 6 }}>
              {t('memorize.quranMemorized')}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{ gap: 6 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(quranPct * 2, 100)}%`, height: 8, borderRadius: 4, backgroundColor: pal.accent, minWidth: memorizedAyahs > 0 ? 6 : 0 }} />
            </View>
            <Text style={{ fontSize: 11, color: darkMode ? '#6ee7b7' : '#047857', fontWeight: '500' }}>
              {t('memorize.progressLine', { memorized: memorizedAyahs, total: TOTAL_QURAN_AYAHS, surahs: uniqueSurahSet.size })}
            </Text>
          </View>
        </LinearGradient>

        {/* ── 3'lü hızlı sayaçlar ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { key: 'mem', label: t('memorize.statMemorized'), val: memorizedAyahs, sub: t('memorize.unitAyah'), color: '#10b981', bg: darkMode ? 'rgba(16,185,129,0.12)' : '#ecfdf5', bc: pal.accentSoft },
            { key: 'learn', label: t('memorize.statLearning'), val: learningAyahs, sub: t('memorize.unitAyah'), color: '#f59e0b', bg: darkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb', bc: darkMode ? '#f59e0b' : '#fde68a' },
            { key: 'surah', label: t('memorize.statSurah'), val: uniqueSurahSet.size, sub: t('memorize.unitDistinct'), color: '#6366f1', bg: darkMode ? 'rgba(99,102,241,0.12)' : '#eef2ff', bc: darkMode ? '#6366f1' : '#c7d2fe' },
          ].map(item => (
            <View key={item.key} style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: item.bg, borderWidth: 1, borderColor: item.bc, gap: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: item.color }}>{item.val}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: item.color }}>{item.sub}</Text>
              <Text style={{ fontSize: 10, color: pal.textSecondary, marginTop: 1 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Mekki / Medeni ── */}
        {memorized.length > 0 && (
          <TouchableOpacity onPress={() => setShowMekkiModal(true)} activeOpacity={0.75} style={{ backgroundColor: cardBg, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: textSec }}>{t('memorize.revelationDist').toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')}</Text>
              <Text style={{ fontSize: 10, color: accent, fontWeight: '600' }}>detay →</Text>
            </View>
            <View style={{ gap: 10 }}>
              {/* Mekki bar */}
              <View style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>{t('memorize.meccan')}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#f59e0b' }}>{t('memorize.ayahPct', { count: mekki, pct: Math.round(mekkaRatio * 100) })}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: pal.cardAlt, overflow: 'hidden' }}>
                  <View style={{ width: `${mekkaRatio * 100}%`, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                </View>
              </View>
              {/* Medeni bar */}
              <View style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>{t('memorize.medinan')}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>{t('memorize.ayahPct', { count: medeni, pct: Math.round((1 - mekkaRatio) * 100) })}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: pal.cardAlt, overflow: 'hidden' }}>
                  <View style={{ width: `${(1 - mekkaRatio) * 100}%`, height: 6, borderRadius: 3, backgroundColor: '#6366f1' }} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Cüz dağılımı + Kısa/Uzun ── */}
        {memorized.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Cüz dağılımı */}
            {topJuz.length > 0 && (
              <TouchableOpacity onPress={() => setShowJuzModal(true)} activeOpacity={0.75} style={{ flex: 1, backgroundColor: cardBg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: border, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: textSec }}>{t('memorize.topJuz').toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')}</Text>
                  <Text style={{ fontSize: 10, color: accent, fontWeight: '600' }}>detay →</Text>
                </View>
                {topJuz.map(([juz, count]) => (
                  <View key={juz} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>{t('memorize.juzN', { n: juz })}</Text>
                      <Text style={{ fontSize: 11, color: accent, fontWeight: '700' }}>{count}</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: pal.cardAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${(count / maxJuzCount) * 100}%`, height: 5, borderRadius: 3, backgroundColor: accent }} />
                    </View>
                  </View>
                ))}
              </TouchableOpacity>
            )}

            {/* Kısa / Uzun sure */}
            {(shortSurahs + longSurahs) > 0 && (
              <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: border, gap: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: textSec }}>{t('memorize.surahType').toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')}</Text>
                {[
                  { key: 'short', label: t('memorize.short'), sub: t('memorize.shortSub'), count: shortSurahs, color: '#10b981' },
                  { key: 'long', label: t('memorize.long'), sub: t('memorize.longSub'), count: longSurahs, color: '#3b82f6' },
                ].map(item => (
                  <View key={item.key} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>{item.label}</Text>
                        <Text style={{ fontSize: 9, color: textSec }}>{item.sub}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: item.color }}>{t('memorize.surahCount', { count: item.count })}</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: pal.cardAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${(item.count / Math.max(shortSurahs + longSurahs, 1)) * 100}%`, height: 5, borderRadius: 3, backgroundColor: item.color }} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </View>
    );
  };

  const filteredSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(surahSearch.toLowerCase()) ||
    s.number.toString().includes(surahSearch) ||
    s.name.includes(surahSearch)
  );

  const renderEntry = (entry: MemorizationEntry) => {
    const isSingle  = entry.ayahFrom === entry.ayahTo;
    const isFull    = entry.ayahFrom === 1 && entry.ayahTo === entry.totalAyahs;
    const rangeStr  = isFull ? t('memorize.wholeSurah') : isSingle ? t('memorize.singleAyah', { n: entry.ayahFrom }) : t('memorize.ayahRange', { from: entry.ayahFrom, to: entry.ayahTo });
    const isMemorized = entry.status === 'memorized';
    
    return (
      <TouchableOpacity 
        key={entry.id} 
        style={[s.entryCard, { backgroundColor: cardBg, borderColor: border }]}
        onPress={() => onOpenSurah && onOpenSurah(entry.surahNumber, entry.ayahFrom)}
        activeOpacity={0.7}
      >
        <View style={s.entryInfo}>
          <Text style={[s.entryTitle, { color: textPrimary }]}>
            {entry.surahName}
          </Text>
          <Text style={[s.entryMeta, { color: textSec }]}>
            {rangeStr} {isFull && `· ${t('quran.ayahCount', { count: entry.totalAyahs })}`}
          </Text>
        </View>
        <View style={s.entryActions}>
          {!isMemorized && (
            <TouchableOpacity style={[s.markBtn, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]} onPress={() => handleMarkMemorized(entry.id)}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={s.markBtnText}>{t('memorize.markMemorized')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(entry.id)} style={s.deleteBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Trash2 size={18} color={textSec} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = (key: string, label: string, items: MemorizationEntry[], color: string) => {
    if (!items.length) return null;
    return (
      <View key={key} style={s.group}>
        <View style={s.groupHeader}>
          <View style={[s.groupDot, { backgroundColor: color }]} />
          <Text style={[s.groupLabel, { color: textSec }]}>{label.toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')}</Text>
          <View style={[s.groupBadge, { backgroundColor: pal.border }]}>
            <Text style={[s.groupBadgeText, { color: textSec }]}>{items.length}</Text>
          </View>
        </View>
        {items.map(renderEntry)}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn}>
          <ChevronLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: textPrimary }]}>{t('memorize.title')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: cardBg, borderRadius: 20, borderWidth: 1, borderColor: border }]} onPress={() => setShowSettings(true)}>
            <Bell size={18} color={settings.reminderEnabled ? accent : textSec} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.addFab, { backgroundColor: accent }]} onPress={() => { setShowAdd(true); resetAdd(); }}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* İstatistikler */}
        {renderStats()}

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={[s.empty, { backgroundColor: cardBg, borderColor: border }]}>
            <BookOpen size={36} color={textSec} strokeWidth={1.5} />
            <Text style={[s.emptyTitle, { color: textPrimary }]}>{t('memorize.emptyTitle')}</Text>
            <Text style={[s.emptySub, { color: textSec }]}>
              {t('memorize.emptySub')}
            </Text>
          </View>
        )}

        {/* Groups */}
        {entries.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <TrendingUp size={14} color={textSec} />
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: textSec }}>{t('memorize.lists').toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')}</Text>
          </View>
        )}
        {renderGroup('learning', t('memorize.toMemorize'), learning, '#f59e0b')}
        {renderGroup('memorized', t('memorize.memorizedList'), memorized, '#10b981')}
      </ScrollView>

      {/* ============================ */}
      {/* MEKKİ / MEDENİ POPUP         */}
      {/* ============================ */}
      <Modal visible={showMekkiModal} animationType="fade" transparent onRequestClose={() => setShowMekkiModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowMekkiModal(false)} />
          <View style={[s.popupCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={s.popupHeader}>
              <Text style={[s.popupTitle, { color: textPrimary }]}>{t('memorize.revelationDist')}</Text>
              <TouchableOpacity onPress={() => setShowMekkiModal(false)}>
                <XCircle size={22} color={textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {(['Meccan', 'Medinan'] as const).map(type => {
                const isMekki = type === 'Meccan';
                const color   = isMekki ? '#f59e0b' : '#6366f1';
                const bgClr   = isMekki ? (darkMode ? 'rgba(245,158,11,0.12)' : '#fffbeb') : (darkMode ? 'rgba(99,102,241,0.12)' : '#eef2ff');
                const items   = memorized.filter(e => surahs.find(s => s.number === e.surahNumber)?.revelationType === type);
                if (!items.length) return null;
                return (
                  <View key={type} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color, letterSpacing: 0.6 }}>
                        {t(isMekki ? 'memorize.meccan' : 'memorize.medinan').toLocaleUpperCase(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US')} · {t('memorize.surahCount', { count: items.length })}
                      </Text>
                    </View>
                    {items.map(e => {
                      const isFull = e.ayahFrom === 1 && e.ayahTo === e.totalAyahs;
                      const range  = isFull ? t('memorize.wholeSurah') : t('memorize.ayahRangeShort', { from: e.ayahFrom, to: e.ayahTo });
                      return (
                        <View key={e.id} style={[s.popupRow, { backgroundColor: bgClr, borderColor: isMekki ? (darkMode ? '#78350f' : '#fde68a') : (darkMode ? '#312e81' : '#c7d2fe') }]}>
                          <View style={[s.popupSurahNum, { backgroundColor: color }]}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{e.surahNumber}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{e.surahName}</Text>
                            <Text style={{ fontSize: 11, color: textSec, marginTop: 1 }}>{range}</Text>
                          </View>
                          <Text style={[s.popupArabic, { color }]}>{e.surahArabicName}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================ */}
      {/* CÜZ POPUP                    */}
      {/* ============================ */}
      <Modal visible={showJuzModal} animationType="fade" transparent onRequestClose={() => setShowJuzModal(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowJuzModal(false)} />
          <View style={[s.popupCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={s.popupHeader}>
              <Text style={[s.popupTitle, { color: textPrimary }]}>{t('memorize.juzDist')}</Text>
              <TouchableOpacity onPress={() => setShowJuzModal(false)}>
                <XCircle size={22} color={textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {(() => {
                const juzGroups: Record<number, MemorizationEntry[]> = {};
                for (const e of memorized) {
                  const juz = SURAH_JUZ[e.surahNumber] || 30;
                  if (!juzGroups[juz]) juzGroups[juz] = [];
                  juzGroups[juz].push(e);
                }
                return Object.entries(juzGroups)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([juzStr, items]) => {
                    const juzNum   = Number(juzStr);
                    const totalAy  = items.reduce((sum, e) => sum + (e.ayahTo - e.ayahFrom + 1), 0);
                    return (
                      <View key={juzNum} style={{ marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[s.juzBadge, { backgroundColor: accent }]}>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{juzNum}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{t('memorize.juzN', { n: juzNum })}</Text>
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: accent }}>{t('quran.ayahCount', { count: totalAy })}</Text>
                        </View>
                        {items.map(e => {
                          const isFull = e.ayahFrom === 1 && e.ayahTo === e.totalAyahs;
                          const range  = isFull ? t('memorize.wholeSurah') : t('memorize.ayahRangeShort', { from: e.ayahFrom, to: e.ayahTo });
                          return (
                            <View key={e.id} style={[s.popupRow, { backgroundColor: darkMode ? 'rgba(16,185,129,0.08)' : '#f0fdf4', borderColor: darkMode ? '#134e4a' : '#a7f3d0' }]}>
                              <View style={[s.popupSurahNum, { backgroundColor: pal.accentSoft }]}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: pal.accentText }}>{e.surahNumber}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{e.surahName}</Text>
                                <Text style={{ fontSize: 11, color: textSec, marginTop: 1 }}>{range}</Text>
                              </View>
                              <Text style={[s.popupArabic, { color: pal.accentText }]}>{e.surahArabicName}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================ */}
      {/* SETTINGS MODAL               */}
      {/* ============================ */}
      <Modal visible={showSettings} animationType="fade" transparent={true} onRequestClose={() => setShowSettings(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.settingsModal, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={s.settingsHeader}>
              <Text style={[s.settingsTitle, { color: textPrimary }]}>{t('memorize.notifSettings')}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <XCircle size={24} color={textSec} />
              </TouchableOpacity>
            </View>
            
            <View style={s.settingsRow}>
              <Text style={[s.settingsLabel, { color: textPrimary }]}>{t('memorize.dailyReminder')}</Text>
              <TouchableOpacity
                style={[s.toggle, { backgroundColor: settings.reminderEnabled ? accent : (pal.borderStrong) }]}
                onPress={() => handleToggleReminder(!settings.reminderEnabled)}
                activeOpacity={0.8}
              >
                <View style={[s.toggleThumb, { transform: [{ translateX: settings.reminderEnabled ? 20 : 2 }] }]} />
              </TouchableOpacity>
            </View>

            {settings.reminderEnabled && (
              <View style={s.timePicker}>
                <Text style={[s.timePickerLabel, { color: textSec }]}>{t('memorize.time')}</Text>
                <View style={s.timeUnit}>
                  <TouchableOpacity onPress={() => handleTimeChange('hour', 1)}><ChevronUp size={18} color={accent} /></TouchableOpacity>
                  <Text style={[s.timeVal, { color: textPrimary }]}>{settings.reminderHour.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity onPress={() => handleTimeChange('hour', -1)}><ChevronDown size={18} color={accent} /></TouchableOpacity>
                </View>
                <Text style={[s.timeColon, { color: textPrimary }]}>:</Text>
                <View style={s.timeUnit}>
                  <TouchableOpacity onPress={() => handleTimeChange('minute', 15)}><ChevronUp size={18} color={accent} /></TouchableOpacity>
                  <Text style={[s.timeVal, { color: textPrimary }]}>{settings.reminderMinute.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity onPress={() => handleTimeChange('minute', -15)}><ChevronDown size={18} color={accent} /></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================ */}
      {/* ADD MODAL                    */}
      {/* ============================ */}
      <Modal visible={showAdd} animationType="slide" transparent={true} onRequestClose={() => { setShowAdd(false); resetAdd(); }}>
        <View style={[s.container, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 44) : insets.top }]}>
          <View style={[s.header, { borderBottomColor: border }]}>
            {addStep === 2 ? (
              <TouchableOpacity onPress={() => setAddStep(1)} style={s.iconBtn}>
                <ChevronLeft size={24} color={textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setShowAdd(false); resetAdd(); }} style={s.iconBtn}>
                <XCircle size={22} color={textSec} />
              </TouchableOpacity>
            )}
            <Text style={[s.headerTitle, { color: textPrimary }]}>
              {addStep === 1 ? t('memorize.chooseSurah') : addSurah?.englishName ?? ''}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {addStep === 1 ? (
            <>
              <View style={[s.searchBar, { backgroundColor: cardBg, borderColor: border }]}>
                <Search size={15} color={textSec} />
                <TextInput
                  style={[s.searchInput, { color: textPrimary }]}
                  placeholder={t('memorize.searchSurah')}
                  placeholderTextColor={textSec}
                  value={surahSearch}
                  onChangeText={setSurahSearch}
                />
              </View>
              {surahs.length === 0 ? (
                <View style={s.loadingWrap}>
                  <ActivityIndicator color={accent} />
                  <Text style={[s.loadingText, { color: textSec }]}>{t('memorize.surahsLoading')}</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredSurahs}
                  keyExtractor={item => item.number.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const fullMemorized = memorized.find(
                      e => e.surahNumber === item.number && e.ayahFrom === 1 && e.ayahTo === e.totalAyahs
                    );
                    const partialEntry = entries.find(
                      e => e.surahNumber === item.number && !(e.ayahFrom === 1 && e.ayahTo === e.totalAyahs)
                    );
                    const isFullMem = !!fullMemorized;
                    const isPartial = !isFullMem && !!partialEntry;

                    return (
                      <TouchableOpacity
                        style={[
                          s.surahRow,
                          { borderBottomColor: border },
                          isFullMem && { backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : '#f0fdf4' },
                        ]}
                        onPress={() => { setAddSurah(item); setAddStep(2); }}
                        activeOpacity={0.7}
                      >
                        <View style={[s.surahNum, {
                          backgroundColor: isFullMem
                            ? (pal.accentSoft)
                            : isPartial
                              ? (darkMode ? '#78350f' : '#fef9c3')
                              : (pal.border),
                        }]}>
                          {isFullMem
                            ? <CheckCircle size={16} color={pal.accent} />
                            : <Text style={[s.surahNumText, {
                                color: isPartial ? (darkMode ? '#fbbf24' : '#92400e') : textSec,
                              }]}>{item.number}</Text>
                          }
                        </View>
                        <View style={s.surahRowInfo}>
                          <Text style={[s.surahRowName, {
                            color: isFullMem ? (pal.accentText) : textPrimary,
                            fontWeight: isFullMem ? '700' : '600',
                          }]}>{item.englishName}</Text>
                          <Text style={[s.surahRowSub, { color: isFullMem ? (pal.accent) : textSec }]}>
                            {isFullMem ? t('memorize.fullyMemorized') : isPartial ? t('memorize.rangeInList', { from: partialEntry!.ayahFrom, to: partialEntry!.ayahTo }) : t('quran.ayahCount', { count: item.numberOfAyahs })}
                          </Text>
                        </View>
                        <Text style={[s.surahRowArabic, {
                          color: isFullMem ? (pal.accent) : (pal.accentText),
                          fontFamily: 'Amiri_400Regular',
                        }]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </>
          ) : addSurah ? (
            <ScrollView contentContainerStyle={s.addStepTwo} showsVerticalScrollIndicator={false}>
              <Text style={[s.addStepLabel, { color: textSec }]}>{t('memorize.whatToAdd')}</Text>

              <TouchableOpacity
                style={[s.addOption, { backgroundColor: cardBg, borderColor: addType === 'surah' ? accent : border, borderWidth: addType === 'surah' ? 2 : 1 }]}
                onPress={() => setAddType('surah')}
                activeOpacity={0.8}
              >
                <View style={[s.addOptionIcon, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                  <BookOpen size={21} color={accent} />
                </View>
                <View style={s.addOptionText}>
                  <Text style={[s.addOptionTitle, { color: textPrimary }]}>{t('memorize.addWholeSurah')}</Text>
                  <Text style={[s.addOptionSub, { color: textSec }]}>{t('quran.ayahCount', { count: addSurah.numberOfAyahs })}</Text>
                </View>
                {addType === 'surah' && <CheckCircle size={20} color={accent} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.addOption, { backgroundColor: cardBg, borderColor: addType === 'ayah' ? '#6366f1' : border, borderWidth: addType === 'ayah' ? 2 : 1 }]}
                onPress={() => setAddType('ayah')}
                activeOpacity={0.8}
              >
                <View style={[s.addOptionIcon, { backgroundColor: darkMode ? 'rgba(99,102,241,0.15)' : '#eef2ff' }]}>
                  <Target size={21} color="#6366f1" />
                </View>
                <View style={s.addOptionText}>
                  <Text style={[s.addOptionTitle, { color: textPrimary }]}>{t('memorize.addRange')}</Text>
                  {addType === 'ayah' && (
                    <TextInput
                      style={[s.ayahInput, { color: textPrimary, borderColor: border }]}
                      placeholder={t('memorize.rangePlaceholder', { max: addSurah.numberOfAyahs })}
                      placeholderTextColor={textSec}
                      keyboardType="default"
                      value={ayahInput}
                      onChangeText={setAyahInput}
                    />
                  )}
                </View>
                {addType === 'ayah' && <CheckCircle size={20} color="#6366f1" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.addConfirmBtn, { backgroundColor: addType === 'ayah' ? '#6366f1' : accent, opacity: addLoading ? 0.7 : 1 }]}
                onPress={handleAddConfirm}
                disabled={addLoading}
                activeOpacity={0.85}
              >
                {addLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.addConfirmText}>{t('memorize.addToList')}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const SPACING = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addFab: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: Platform.OS === 'android' ? 48 : 40, gap: SPACING.md },

  // Empty
  empty: { borderRadius: 20, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Groups
  group: { gap: SPACING.xs, marginTop: SPACING.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, marginBottom: 6 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  groupBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  groupBadgeText: { fontSize: 10, fontWeight: '700' },

  // Entry card
  entryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: SPACING.md, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  entryInfo: { flex: 1, gap: 2 },
  entryTitle: { fontSize: 15, fontWeight: '600' },
  entryMeta: { fontSize: 13, fontWeight: '400' },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  markBtnText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  deleteBtn: { padding: 8 },

  // Popup modals (Mekki/Medeni, Cüz)
  popupCard: { borderRadius: 22, padding: 20, borderWidth: 1, marginHorizontal: 8 },
  popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  popupTitle: { fontSize: 16, fontWeight: '800' },
  popupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 10, marginBottom: 6, borderWidth: 1 },
  popupSurahNum: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  popupArabic: { fontSize: 17, fontFamily: 'Amiri_400Regular' },
  juzBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Settings Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.xl },
  settingsModal: { borderRadius: 24, padding: SPACING.xl, borderWidth: 1 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  settingsTitle: { fontSize: 18, fontWeight: '700' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  toggle: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingLeft: 2, marginTop: SPACING.md },
  timePickerLabel: { fontSize: 14, fontWeight: '500' },
  timeUnit: { alignItems: 'center', gap: 2 },
  timeVal: { fontSize: 22, fontWeight: '700', minWidth: 34, textAlign: 'center' },
  timeColon: { fontSize: 22, fontWeight: '700' },

  // Add modal - Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.xl, marginVertical: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 11 : 8, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingText: { fontSize: 14 },

  // Surah list
  surahRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth },
  surahNum: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  surahNumText: { fontSize: 12, fontWeight: '700' },
  surahRowInfo: { flex: 1 },
  surahRowName: { fontSize: 15, fontWeight: '600' },
  surahRowSub: { fontSize: 12, marginTop: 1 },
  surahRowArabic: { fontSize: 20 },

  // Add step 2
  addStepTwo: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: 40, gap: SPACING.md },
  addStepLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 16, padding: SPACING.md },
  addOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addOptionText: { flex: 1 },
  addOptionTitle: { fontSize: 15, fontWeight: '600' },
  addOptionSub: { fontSize: 12, marginTop: 2 },
  ayahInput: { marginTop: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: 15 },
  addConfirmBtn: { marginTop: SPACING.sm, paddingVertical: SPACING.md + 2, borderRadius: 16, alignItems: 'center' },
  addConfirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default MemorizationModule;
