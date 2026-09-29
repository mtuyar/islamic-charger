import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BookMarked, Minus, Plus, RotateCcw } from 'lucide-react-native';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useQuranStore, khatmStats, TOTAL_PAGES } from '../store/useQuranStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { haptic } from './ui';
import { t } from '../i18n';

/** Khatm (full-read) progress with a daily page goal. Shown at the top of the Quran tab. */
const KhatmCard: React.FC = () => {
  const c = useTheme();
  const lang = useSettingsStore(s => s.language);
  const pagesRead = useQuranStore(s => s.pagesRead);
  const dailyPageGoal = useQuranStore(s => s.dailyPageGoal);
  const khatmCount = useQuranStore(s => s.khatmCount);
  const setGoal = useQuranStore(s => s.setDailyPageGoal);
  const reset = useQuranStore(s => s.resetKhatm);
  const stats = khatmStats({ pagesRead, dailyPageGoal });
  const finish = stats.finish.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });

  const confirmReset = () => {
    Alert.alert(t('quran.resetHatim'), t('quran.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('quran.resetHatim'), style: 'destructive', onPress: () => { haptic('medium'); reset(); } },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <BookMarked size={16} color={c.accent} />
          <Text style={[styles.title, { color: c.text }]}>{t('quran.hatim')}{khatmCount ? ` · ${khatmCount}×` : ''}</Text>
        </View>
        <TouchableOpacity onPress={confirmReset} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('quran.resetHatim')}>
          <RotateCcw size={16} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
        <View style={[styles.fill, { width: `${stats.percent}%`, backgroundColor: c.accent }]} />
      </View>
      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: c.textSecondary }]}>{t('quran.hatimProgress', { read: stats.read })} · {t('quran.percent', { value: stats.percent })}</Text>
        <Text style={[styles.stat, { color: c.textSecondary }]}>{t('quran.todayRead', { count: stats.todayCount })}</Text>
      </View>

      <View style={styles.goalRow}>
        <Text style={[styles.goalLabel, { color: c.textSecondary }]}>{t('quran.dailyGoal')}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => { haptic('selection'); setGoal(dailyPageGoal - 1); }} style={[styles.stepBtn, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('a11y.decrement')}>
            <Minus size={14} color={c.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.goalValue, { color: c.text }]}>{t('quran.pagesPerDay', { count: dailyPageGoal })}</Text>
          <TouchableOpacity onPress={() => { haptic('selection'); setGoal(dailyPageGoal + 1); }} style={[styles.stepBtn, { backgroundColor: c.cardAlt }]} accessibilityRole="button" accessibilityLabel={t('a11y.increment')}>
            <Plus size={14} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.finish, { color: c.textMuted }]}>
        {stats.read < TOTAL_PAGES ? `${t('quran.remainingPages', { count: stats.remaining })} · ${t('quran.estimatedFinish', { date: finish })}` : ''}
      </Text>
      <Text style={[styles.finish, { color: c.textMuted }]}>{t('quran.hatimHint')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: 10, marginBottom: SPACING.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontFamily: FONT.bold },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { fontSize: 11, fontFamily: FONT.medium },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  goalLabel: { fontSize: 12, fontFamily: FONT.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  goalValue: { fontSize: 12, fontFamily: FONT.bold, minWidth: 90, textAlign: 'center' },
  finish: { fontSize: 11, fontFamily: FONT.regular },
});

export default KhatmCard;
