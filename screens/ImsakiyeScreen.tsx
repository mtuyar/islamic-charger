import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Share2 } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Screen, Header, IconButton, StateView, Chip } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, DayTimings } from '../store/usePrayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { toDateKey, prayerName, fetchMonth } from '../services/prayerTimes';
import { HIJRI_MONTHS_TR, HIJRI_MONTHS_EN } from '../services/hijri';
import { t } from '../i18n';

/** Gregorian month name (0-based index) in the current UI language. */
const monthName = (i: number) => t(`months.m${i + 1}`);
const COLS: (keyof DayTimings['timings'])[] = ['Imsak', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const ImsakiyeScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const lang = useSettingsStore(s => s.language);
  const location = usePrayerStore(s => s.location);
  const method = usePrayerStore(s => s.method);
  const calendars = usePrayerStore(s => s.calendars);
  const upsert = usePrayerStore(s => s.upsertCalendar);
  const shotRef = useRef<ViewShot>(null);
  const now = new Date();
  const [offset, setOffset] = useState(0); // 0 = this month, 1 = next
  const [loading, setLoading] = useState(false);

  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const key = location ? `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}|${method}|${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}` : '';
  const cal = calendars.find(x => x.key === key);

  React.useEffect(() => {
    if (!location || cal || loading) return;
    setLoading(true);
    fetchMonth(location, method, target.getFullYear(), target.getMonth() + 1)
      .then(upsert)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  const todayKey = toDateKey(now);
  const hijriTitle = useMemo(() => {
    if (!cal?.days.length) return '';
    const first = cal.days[0].hijri; const last = cal.days[cal.days.length - 1].hijri;
    const names = lang === 'tr' ? HIJRI_MONTHS_TR : HIJRI_MONTHS_EN;
    return first.month === last.month ? `${names[first.month - 1]} ${first.year}` : `${names[first.month - 1]} – ${names[last.month - 1]} ${last.year}`;
  }, [cal, lang]);

  const share = async () => {
    try {
      const uri = await shotRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  return (
    <Screen>
      <Header
        title={t('prayer.imsakiye')}
        subtitle={location?.label}
        onBack={() => nav.goBack()}
        right={
          <IconButton filled onPress={share} label={t('prayer.shareImsakiye')}>
            <Share2 size={18} color={c.textSecondary} />
          </IconButton>
        }
      />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm }}>
        {[0, 1].map(o => {
          const d = new Date(now.getFullYear(), now.getMonth() + o, 1);
          return <Chip key={o} label={monthName(d.getMonth())} active={offset === o} onPress={() => setOffset(o)} />;
        })}
      </View>
      {!location ? <StateView kind="empty" message={t('prayer.useGps')} /> : !cal ? <StateView kind={loading ? 'loading' : 'error'} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: c.text }]}>{monthName(target.getMonth())} {target.getFullYear()}</Text>
                <Text style={[styles.sheetSub, { color: c.textSecondary }]}>{hijriTitle} · {location.label}</Text>
              </View>
              <Text style={[styles.brand, { color: c.accent }]}>Ruhnevâz</Text>
            </View>
            <View style={[styles.row, styles.head, { borderBottomColor: c.border }]}>
              <Text style={[styles.dayCell, styles.headText, { color: c.textMuted }]}>{t('prayer.imsakiyeDay')}</Text>
              {COLS.map(k => (
                <Text key={k} style={[styles.cell, styles.headText, { color: c.textMuted }]}>{k === 'Imsak' ? t('prayer.imsak') : prayerName(k as any)}</Text>
              ))}
            </View>
            {cal.days.map(d => {
              const isToday = d.date === todayKey;
              const dayNum = Number(d.date.slice(-2));
              return (
                <View key={d.date} style={[styles.row, isToday && { backgroundColor: c.accentSoft, borderRadius: 8 }]}>
                  <Text style={[styles.dayCell, { color: isToday ? c.accentText : c.text, fontFamily: isToday ? FONT.bold : FONT.medium }]}>
                    {dayNum}{d.weekday === 5 ? ' ·' : ''}
                  </Text>
                  {COLS.map(k => (
                    <Text key={k} style={[styles.cell, { color: isToday ? c.accentText : c.text, fontFamily: isToday ? FONT.bold : FONT.regular }]}>{d.timings[k]}</Text>
                  ))}
                </View>
              );
            })}
            <Text style={[styles.footnote, { color: c.textMuted }]}>· {t('prayer.friday')} · {t('prayer.imsakiyeSource')}</Text>
          </ViewShot>
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  sheet: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  sheetTitle: { fontSize: 17, fontFamily: FONT.bold },
  sheetSub: { fontSize: 11, fontFamily: FONT.medium, marginTop: 2 },
  brand: { fontSize: 12, fontFamily: FONT.bold },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4 },
  head: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  headText: { fontSize: 10, fontFamily: FONT.semibold },
  dayCell: { width: 34, fontSize: 12 },
  cell: { flex: 1, fontSize: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 10, fontFamily: FONT.regular, marginTop: 8 },
});

export default ImsakiyeScreen;
