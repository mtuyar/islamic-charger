import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Flame } from 'lucide-react-native';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, FARD_KEYS } from '../store/usePrayerStore';
import { toDateKey, prayerName } from '../services/prayerTimes';
import { haptic } from './ui';
import { t } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

/** Consecutive days (ending today or yesterday) where all five prayers were logged. */
export const computeStreak = (log: Record<string, Partial<Record<string, boolean>>>): number => {
  let streak = 0;
  const d = new Date();
  const doneAll = (key: string) => FARD_KEYS.every(k => log[key]?.[k]);
  // today may still be in progress: skip it if incomplete
  if (!doneAll(toDateKey(d))) d.setDate(d.getDate() - 1);
  while (doneAll(toDateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

interface Props {
  showWeekly?: boolean;
  date?: Date;
}

const PrayerTracker: React.FC<Props> = ({ showWeekly, date }) => {
  const c = useTheme();
  const log = usePrayerStore(s => s.prayerLog);
  const toggle = usePrayerStore(s => s.togglePrayerDone);
  const key = toDateKey(date ?? new Date());
  const today = log[key] ?? {};
  const streak = useMemo(() => computeStreak(log), [log]);
  const lang = useSettingsStore(s => s.language);

  const weekly = useMemo(() => {
    const out: { label: string; count: number; isToday: boolean }[] = [];
    const names = t('prayer.weekdaysShort').split(',');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = toDateKey(d);
      out.push({ label: names[d.getDay()], count: FARD_KEYS.filter(p => log[k]?.[p]).length, isToday: i === 0 });
    }
    return out;
  }, [log, lang]);

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={styles.row}>
        {FARD_KEYS.map(k => {
          const done = !!today[k];
          return (
            <TouchableOpacity
              key={k}
              onPress={() => { haptic(done ? 'light' : 'success'); toggle(key, k); }}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={prayerName(k)}
              style={[styles.cell, { backgroundColor: done ? c.accent : c.card, borderColor: done ? c.accent : c.borderStrong }]}
            >
              <View style={[styles.check, { backgroundColor: done ? 'rgba(255,255,255,0.22)' : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: c.borderStrong }]}>
                {done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.cellText, { color: done ? '#fff' : c.text }]} numberOfLines={1}>{prayerName(k)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showWeekly ? (
        <View style={[styles.weekly, { borderColor: c.border }]}>
          <View style={styles.weeklyHeader}>
            <Text style={[styles.weeklyTitle, { color: c.textSecondary }]}>{t('prayer.weekly').toUpperCase()}</Text>
            <View style={styles.streak}>
              <Flame size={14} color={streak > 0 ? c.gold : c.textMuted} />
              <Text style={[styles.streakText, { color: streak > 0 ? c.gold : c.textMuted }]}>{t('prayer.streak', { count: streak })}</Text>
            </View>
          </View>
          <View style={styles.bars}>
            {weekly.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View style={[styles.barTrack, { backgroundColor: c.cardAlt }]}>
                  <View style={[styles.barFill, { height: `${(d.count / 5) * 100}%`, backgroundColor: d.count === 5 ? c.accent : d.count > 0 ? c.accent + '99' : 'transparent' }]} />
                </View>
                <Text style={[styles.barLabel, { color: d.isToday ? c.text : c.textMuted, fontFamily: d.isToday ? FONT.bold : FONT.medium }]}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 11, fontFamily: FONT.semibold },
  weekly: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.md, gap: SPACING.sm },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weeklyTitle: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 12, fontFamily: FONT.semibold },
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, height: 64 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10 },
});

export default PrayerTracker;
