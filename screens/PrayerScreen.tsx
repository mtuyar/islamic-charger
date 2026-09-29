import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, CalendarDays, ListChecks, Table2, Moon, Utensils, MapPin, ChevronRight, Sunrise } from 'lucide-react-native';
import { Screen, Header, Card, SectionTitle, Row, IconButton, StateView } from '../components/ui';
import NextPrayerCard from '../components/NextPrayerCard';
import PrayerTracker from '../components/PrayerTracker';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, PRAYER_KEYS } from '../store/usePrayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { getDayTimings, getNextPrayer, prayerName, refreshPrayerData, ensureCalendars, timingToDate, formatCountdown, toDateKey } from '../services/prayerTimes';
import { gregorianToHijri, formatHijri, isRamadan, upcomingHolyDays, daysUntil } from '../services/hijri';
import { useNow, useIsOnline } from '../hooks/useNetwork';
import { syncWidgets } from '../services/widgets';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const PrayerScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lang = useSettingsStore(s => s.language);
  const location = usePrayerStore(s => s.location);
  const calendarsCount = usePrayerStore(s => s.calendars.length);
  const fastingLog = usePrayerStore(s => s.fastingLog);
  const toggleFasting = usePrayerStore(s => s.toggleFasting);
  const kaza = usePrayerStore(s => s.kaza);
  const online = useIsOnline();
  const now = useNow(1000);
  const [refreshing, setRefreshing] = useState(false);

  const today = getDayTimings(now);
  const next = getNextPrayer(now);
  const hijri = today ? { day: today.hijri.day, month: today.hijri.month, year: today.hijri.year } : gregorianToHijri(now);
  const ramadan = isRamadan(hijri);
  const nextHoly = useMemo(() => upcomingHolyDays(now)[0], [now.getDate()]);
  const dateKey = toDateKey(now);
  const totalKaza = Object.values(kaza).reduce((a, b) => a + b, 0);

  // Today's timings missing (first launch / new month / new location): fetch them here and
  // surface a failure instead of spinning forever when aladhan is unreachable.
  const needsTimings = !!location && !today;
  const [timingsFailed, setTimingsFailed] = useState(false);
  const [timingsLoading, setTimingsLoading] = useState(false);
  const loadTimings = useCallback(async () => {
    setTimingsFailed(false);
    setTimingsLoading(true);
    await ensureCalendars();
    setTimingsLoading(false);
    setTimingsFailed(!getDayTimings(new Date()));
  }, []);
  useEffect(() => {
    if (needsTimings) loadTimings();
  }, [needsTimings, location, loadTimings]);

  const fastingCount = useMemo(() => Object.entries(fastingLog).filter(([k, v]) => v && k.startsWith(dateKey.slice(0, 7))).length, [fastingLog, dateKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPrayerData(true);
    await syncWidgets();
    setRefreshing(false);
  };

  return (
    <Screen>
      <Header
        large
        onBack={() => nav.goBack()}
        title={t('prayer.title')}
        subtitle={formatHijri(hijri, lang)}
        right={
          <IconButton filled onPress={() => nav.navigate('PrayerSettings')} label={t('prayer.notifications')}>
            <Bell size={18} color={c.textSecondary} />
          </IconButton>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <NextPrayerCard compact onPressLocation={() => nav.navigate('LocationPicker')} />

        {needsTimings ? (
          <StateView
            compact
            kind={timingsFailed && !timingsLoading ? (online ? 'error' : 'offline') : 'loading'}
            message={timingsFailed && !timingsLoading ? t('prayer.loadFailed') : undefined}
            onRetry={timingsFailed && !timingsLoading ? loadTimings : undefined}
          />
        ) : null}

        {today ? (
          <Card padded={false}>
            {PRAYER_KEYS.map((k, i) => {
              const active = next?.currentKey === k;
              const isNext = next?.key === k && !(k === 'Fajr' && next.currentKey === 'Isha');
              return (
                <View
                  key={k}
                  style={[
                    styles.timeRow,
                    { borderBottomColor: c.border, borderBottomWidth: i === PRAYER_KEYS.length - 1 ? 0 : StyleSheet.hairlineWidth },
                    active && { backgroundColor: c.accentSoft },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: active ? c.accent : c.borderStrong }]} />
                  <Text style={[styles.timeName, { color: active ? c.accentText : c.text, fontFamily: active ? FONT.bold : FONT.medium }]}>{prayerName(k)}</Text>
                  {isNext && next ? (
                    <Text style={[styles.timeHint, { color: c.textMuted }]}>{formatCountdown(next.at.getTime() - now.getTime())}</Text>
                  ) : null}
                  <Text style={[styles.timeValue, { color: active ? c.accentText : c.text }]}>{today.timings[k]}</Text>
                </View>
              );
            })}
          </Card>
        ) : null}

        {ramadan && today ? (
          <Card accent style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Moon size={16} color={c.accentText} />
              <Text style={[styles.ramadanTitle, { color: c.accentText }]}>{t('prayer.ramadanDay', { day: hijri.day })}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.ramadanBox, { backgroundColor: c.card }]}>
                <Text style={[styles.ramadanLabel, { color: c.textSecondary }]}>{t('prayer.imsak')}</Text>
                <Text style={[styles.ramadanValue, { color: c.text }]}>{today.timings.Imsak}</Text>
              </View>
              <View style={[styles.ramadanBox, { backgroundColor: c.card }]}>
                <Text style={[styles.ramadanLabel, { color: c.textSecondary }]}>{t('prayer.iftar')}</Text>
                <Text style={[styles.ramadanValue, { color: c.text }]}>{today.timings.Maghrib}</Text>
              </View>
              <View style={[styles.ramadanBox, { backgroundColor: c.card }]}>
                <Text style={[styles.ramadanLabel, { color: c.textSecondary }]}>{now < timingToDate(today, 'Maghrib') ? t('prayer.timeToIftar') : t('prayer.timeToImsak')}</Text>
                <Text style={[styles.ramadanValue, { color: c.accent }]}>
                  {formatCountdown((now < timingToDate(today, 'Maghrib') ? timingToDate(today, 'Maghrib').getTime() : (timingToDate(today, 'Imsak').getTime() + 86_400_000)) - now.getTime())}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => toggleFasting(dateKey)}
              style={[styles.fastRow, { backgroundColor: fastingLog[dateKey] ? c.accent : c.card, borderColor: c.border }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!fastingLog[dateKey] }}
            >
              <Utensils size={14} color={fastingLog[dateKey] ? '#fff' : c.textSecondary} />
              <Text style={[styles.fastText, { color: fastingLog[dateKey] ? '#fff' : c.text }]}>{t('prayer.fastToday')}</Text>
              <Text style={[styles.fastCount, { color: fastingLog[dateKey] ? 'rgba(255,255,255,0.8)' : c.textMuted }]}>{t('prayer.fastingCount', { count: fastingCount, total: 30 })}</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {location ? (
          <View>
            <SectionTitle title={t('prayer.tracker')} />
            <Card>
              <Text style={[styles.hint, { color: c.textMuted }]}>{t('prayer.trackerHint')}</Text>
              <PrayerTracker showWeekly />
            </Card>
          </View>
        ) : null}

        <Card padded={false}>
          <Row
            icon={<Table2 size={18} color={c.accent} />}
            title={t('prayer.imsakiye')}
            subtitle={t('prayer.imsakiyeMonth')}
            onPress={() => nav.navigate('Imsakiye')}
            chevron
          />
          <Row
            icon={<ListChecks size={18} color={c.accent} />}
            title={t('prayer.kaza')}
            subtitle={totalKaza > 0 ? `${t('prayer.kazaTotal')}: ${totalKaza}` : t('prayer.kazaHint')}
            onPress={() => nav.navigate('Kaza')}
            chevron
          />
          <Row
            icon={<CalendarDays size={18} color={c.accent} />}
            title={t('prayer.calendar')}
            subtitle={nextHoly ? `${t(`calendar.names.${nextHoly.key}`)} · ${daysUntil(nextHoly.date, now) === 0 ? t('calendar.today') : t('calendar.daysLeft', { count: daysUntil(nextHoly.date, now) })}` : undefined}
            onPress={() => nav.navigate('HolyDays')}
            chevron
          />
          <Row
            icon={<MapPin size={18} color={c.accent} />}
            title={t('prayer.location')}
            subtitle={location?.label ?? t('prayer.useGps')}
            onPress={() => nav.navigate('LocationPicker')}
            chevron
            last
          />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: SPACING.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timeName: { flex: 1, fontSize: 15 },
  timeHint: { fontSize: 12, fontFamily: FONT.medium, fontVariant: ['tabular-nums'] },
  timeValue: { fontSize: 16, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  ramadanTitle: { fontSize: 15, fontFamily: FONT.bold },
  ramadanBox: { flex: 1, borderRadius: RADIUS.sm, padding: 10, gap: 2 },
  ramadanLabel: { fontSize: 10, fontFamily: FONT.medium },
  ramadanValue: { fontSize: 15, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  fastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.sm, borderWidth: 1 },
  fastText: { fontSize: 13, fontFamily: FONT.semibold, flex: 1 },
  fastCount: { fontSize: 12, fontFamily: FONT.medium },
  hint: { fontSize: 12, fontFamily: FONT.regular, marginBottom: 10 },
});

export default PrayerScreen;
