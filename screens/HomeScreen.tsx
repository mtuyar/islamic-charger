import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Compass, Settings2, BookOpen, ScrollText, HeartHandshake, Brain, Languages, Sparkles, ChevronRight, Moon, Utensils,
  Bookmark, CalendarDays, CircleDot, EyeOff,
} from 'lucide-react-native';
import { Screen, Card, SectionTitle, IconButton, PressableScale } from '../components/ui';
import NextPrayerCard from '../components/NextPrayerCard';
import PrayerTracker from '../components/PrayerTracker';
import DailyCard from '../components/DailyCard';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { getDayTimings, refreshPrayerData, timingToDate, formatCountdown } from '../services/prayerTimes';
import { gregorianToHijri, formatHijri, isRamadan } from '../services/hijri';
import { getRandomEsma, TURKISH_SURAH_NAMES } from '../services/api';
import { getDueEntries } from '../services/memorization';
import { useNow } from '../hooks/useNetwork';
import { syncWidgets } from '../services/widgets';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import type { Esma } from '../types';

const greetingFor = (d: Date): string => {
  if (d.getDay() === 5 && d.getHours() >= 6 && d.getHours() < 18) return t('greeting.friday');
  const h = d.getHours();
  if (h < 11) return t('greeting.morning');
  if (h < 17) return t('greeting.day');
  if (h < 22) return t('greeting.evening');
  return t('greeting.night');
};

interface Module {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
  badge?: number;
  tint?: string;
}

const HomeScreen: React.FC = () => {
  const c = useTheme();
  const showPrayerTracker = useSettingsStore(st => st.showPrayerTracker);
  const setShowPrayerTracker = useSettingsStore(st => st.setShowPrayerTracker);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const lang = useSettingsStore(s => s.language);
  const surahs = useLibraryStore(s => s.surahs);
  const lastReadSurahId = useLibraryStore(s => s.lastReadSurahId);
  const lastReadAyah = useLibraryStore(s => s.lastReadAyahNumber);
  const savedCount = useLibraryStore(s => s.savedAyahs.length + s.savedHadiths.length);
  const location = usePrayerStore(s => s.location);
  const fastingLog = usePrayerStore(s => s.fastingLog);
  const toggleFasting = usePrayerStore(s => s.toggleFasting);
  const now = useNow(1000);
  const [esma] = useState<Esma>(() => getRandomEsma());
  const [dueCount, setDueCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getDueEntries().then(list => setDueCount(list.length)).catch(() => {});
  }, []);

  const today = getDayTimings(now);
  const hijri = today ? { day: today.hijri.day, month: today.hijri.month, year: today.hijri.year } : gregorianToHijri(now);
  const ramadan = isRamadan(hijri);
  const dateKey = now.toISOString().slice(0, 10);

  const ramadanInfo = useMemo(() => {
    if (!ramadan || !today) return null;
    const iftar = timingToDate(today, 'Maghrib');
    const imsak = timingToDate(today, 'Imsak');
    if (now < imsak) return { label: t('home.imsakIn'), at: imsak };
    if (now < iftar) return { label: t('home.iftarIn'), at: iftar };
    return null;
  }, [ramadan, today, now.getMinutes()]);

  const lastSurah = lastReadSurahId ? surahs.find(s => s.number === lastReadSurahId) : null;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPrayerData(true);
    await syncWidgets();
    setRefreshing(false);
  };

  const modules: Module[] = [
    { key: 'quran', title: t('quran.title'), subtitle: t('home.quranSubtitle'), icon: BookOpen, onPress: () => nav.navigate('Quran') },
    { key: 'prayer', title: t('prayer.title'), subtitle: t('home.prayerSubtitle'), icon: Moon, onPress: () => nav.navigate('Prayer') },
    { key: 'dhikr', title: t('dhikr.title'), subtitle: t('home.dhikrSubtitle'), icon: CircleDot, onPress: () => nav.navigate('Dhikr') },
    { key: 'hadith', title: t('more.hadith'), subtitle: t('home.hadithSubtitle'), icon: ScrollText, onPress: () => nav.navigate('HadithLibrary') },
    { key: 'memo', title: t('more.memorization'), subtitle: dueCount ? t('home.dueReviews', { count: dueCount }) : t('home.memoSubtitle'), icon: Brain, onPress: () => nav.navigate('Memorization'), badge: dueCount },
    { key: 'words', title: t('more.words'), subtitle: t('home.wordsSubtitle'), icon: Languages, onPress: () => nav.navigate('Words') },
    { key: 'esma', title: t('more.esma'), subtitle: '99', icon: Sparkles, onPress: () => nav.navigate('Esma'), tint: c.gold },
    { key: 'saved', title: t('more.saved'), subtitle: savedCount ? String(savedCount) : t('home.savedSubtitle'), icon: Bookmark, onPress: () => nav.navigate('Saved') },
    { key: 'calendar', title: t('more.calendar'), subtitle: t('home.calendarSubtitle'), icon: CalendarDays, onPress: () => nav.navigate('HolyDays') },
    { key: 'qibla', title: t('more.qibla'), subtitle: t('home.qiblaSubtitle'), icon: Compass, onPress: () => nav.navigate('Qibla') },
  ];
  const cardWidth = (width - SPACING.lg * 2 - 10) / 2;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.salam, { color: c.textSecondary }]}>{t('greeting.salam')}</Text>
            <Text style={[styles.greeting, { color: c.text }]}>{greetingFor(now)}</Text>
            <Text style={[styles.hijri, { color: c.textMuted }]}>{formatHijri(hijri, lang)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconButton filled onPress={() => nav.navigate('Qibla')} label={t('a11y.openQibla')}>
              <Compass size={18} color={c.textSecondary} />
            </IconButton>
            <IconButton filled onPress={() => nav.navigate('Settings')} label={t('a11y.settings')}>
              <Settings2 size={18} color={c.textSecondary} />
            </IconButton>
          </View>
        </View>

        <NextPrayerCard onPressLocation={() => nav.navigate('LocationPicker')} />

        {ramadan ? (
          <Card accent style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Moon size={16} color={c.accentText} />
                <Text style={[styles.ramadanTitle, { color: c.accentText }]}>{t('prayer.ramadanDay', { day: hijri.day })}</Text>
              </View>
              {ramadanInfo ? (
                <Text style={[styles.ramadanCountdown, { color: c.accentText }]}>
                  {ramadanInfo.label} {formatCountdown(ramadanInfo.at.getTime() - now.getTime())}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => toggleFasting(dateKey)}
              style={[styles.fastRow, { backgroundColor: fastingLog[dateKey] ? c.accent : c.card, borderColor: c.border }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!fastingLog[dateKey] }}
            >
              <Utensils size={14} color={fastingLog[dateKey] ? '#fff' : c.textSecondary} />
              <Text style={[styles.fastText, { color: fastingLog[dateKey] ? '#fff' : c.text }]}>{t('prayer.fastToday')}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {location && showPrayerTracker ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <SectionTitle title={t('home.todayLog')} action={t('common.seeAll')} onAction={() => nav.navigate('Prayer')} />
              </View>
              <TouchableOpacity
                onPress={() => setShowPrayerTracker(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('home.hideTracker')}
                style={{ marginLeft: 12, marginTop: SPACING.xs, marginBottom: SPACING.sm }}
              >
                <EyeOff size={14} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <PrayerTracker />
          </View>
        ) : null}

        <DailyCard />

        {lastSurah ? (
          <PressableScale
            onPress={() => nav.navigate('Reader', { surahId: lastSurah.number, startAyah: lastReadAyah })}
            style={[styles.continueCard, { backgroundColor: c.card, borderColor: c.border }]}
            accessibilityLabel={t('home.continueReading')}
          >
            <View style={[styles.continueIcon, { backgroundColor: c.accentSoft }]}>
              <BookOpen size={18} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.continueKicker, { color: c.textSecondary }]}>{t('home.continueReading')}</Text>
              <Text style={[styles.continueTitle, { color: c.text }]}>
                {TURKISH_SURAH_NAMES[lastSurah.number] ?? lastSurah.englishName}{lastReadAyah ? ` · ${lastReadAyah}` : ''}
              </Text>
            </View>
            <ChevronRight size={18} color={c.textMuted} />
          </PressableScale>
        ) : null}

        <View>
          <SectionTitle title={t('home.modules')} />
          <View style={styles.grid}>
            {modules.map(m => (
              <PressableScale key={m.key} onPress={m.onPress} style={[styles.module, { width: cardWidth, backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel={m.title}>
                <View style={[styles.moduleIcon, { backgroundColor: m.tint ? c.goldSoft : c.accentSoft }]}>
                  <m.icon size={20} color={m.tint ?? c.accent} />
                  {m.badge ? (
                    <View style={[styles.badge, { backgroundColor: c.gold }]}>
                      <Text style={styles.badgeText}>{m.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.moduleTitle, { color: c.text }]} numberOfLines={1}>{m.title}</Text>
                <Text style={[styles.moduleSub, { color: c.textMuted }]} numberOfLines={1}>{m.subtitle}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <Card onPress={() => nav.navigate('Esma')} accessibilityLabel={t('home.dailyEsma')} style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
            <Sparkles size={13} color={c.gold} />
            <Text style={[styles.kicker, { color: c.gold }]}>{t('home.dailyEsma').toUpperCase()}</Text>
          </View>
          <Text style={[styles.esmaArabic, { color: c.accentText }]}>{esma.name}</Text>
          <Text style={[styles.esmaName, { color: c.text }]}>{esma.transliteration}</Text>
          <Text style={[styles.esmaMeaning, { color: c.textSecondary }]}>{esma.meaning}</Text>
        </Card>

        <TouchableOpacity onPress={() => nav.navigate('About')} style={{ alignSelf: 'center', paddingVertical: 8 }} accessibilityRole="link">
          <Text style={[styles.footer, { color: c.textMuted }]}>{t('home.aboutLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 40, gap: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  salam: { fontSize: 12, fontFamily: FONT.medium },
  greeting: { fontSize: 24, fontFamily: FONT.bold, letterSpacing: -0.4, marginTop: 2 },
  hijri: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  ramadanTitle: { fontSize: 14, fontFamily: FONT.bold },
  ramadanCountdown: { fontSize: 13, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
  fastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.sm, borderWidth: 1 },
  fastText: { fontSize: 13, fontFamily: FONT.semibold },
  continueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  continueIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  continueKicker: { fontSize: 11, fontFamily: FONT.medium },
  continueTitle: { fontSize: 15, fontFamily: FONT.semibold, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  module: { padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, gap: 4, minHeight: 118, justifyContent: 'flex-end' },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  moduleTitle: { fontSize: 14, fontFamily: FONT.bold },
  moduleSub: { fontSize: 11, fontFamily: FONT.medium },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: FONT.bold },
  kicker: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  esmaArabic: { fontSize: 44, fontFamily: 'Amiri_400Regular', lineHeight: 70 },
  esmaName: { fontSize: 16, fontFamily: FONT.bold },
  esmaMeaning: { fontSize: 13, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },
  footer: { fontSize: 12, fontFamily: FONT.medium },
});

export default HomeScreen;
