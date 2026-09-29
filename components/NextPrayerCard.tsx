import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, PRAYER_KEYS, PrayerKey } from '../store/usePrayerStore';
import { getDayTimings, getNextPrayer, formatCountdown, prayerName } from '../services/prayerTimes';
import { useNow } from '../hooks/useNetwork';
import { t } from '../i18n';
import { PressableScale } from './ui';

interface Props {
  onPressLocation: () => void;
  compact?: boolean;
}

const NextPrayerCard: React.FC<Props> = ({ onPressLocation, compact }) => {
  const c = useTheme();
  const location = usePrayerStore(s => s.location);
  // subscribe so the card re-renders when calendars arrive
  usePrayerStore(s => s.calendars.length);
  const now = useNow(1000);
  const next = getNextPrayer(now);
  const today = getDayTimings(now);

  if (!location) {
    return (
      <PressableScale onPress={onPressLocation} accessibilityLabel={t('prayer.location')}>
        <LinearGradient colors={[c.accent, '#065f46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MapPin size={20} color="#fff" />
            <Text style={styles.ctaTitle}>{t('prayer.title')}</Text>
          </View>
          <Text style={styles.ctaBody}>{t('onboarding.locationBody')}</Text>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>{t('prayer.useGps')}</Text>
            <ChevronRight size={16} color={c.accentText} />
          </View>
        </LinearGradient>
      </PressableScale>
    );
  }

  const remaining = next ? next.at.getTime() - now.getTime() : 0;
  const nextLabel = next ? prayerName(next.key) : '—';
  const nextTime = next ? `${next.at.getHours().toString().padStart(2, '0')}:${next.at.getMinutes().toString().padStart(2, '0')}` : '--:--';

  return (
    <LinearGradient colors={[c.accent, '#065f46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onPressLocation} style={styles.locationPill} accessibilityRole="button" accessibilityLabel={t('prayer.location')}>
          <MapPin size={12} color="#ecfdf5" />
          <Text style={styles.locationText} numberOfLines={1}>{location.label}</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>{t('home.nextPrayer').toUpperCase()}</Text>
      </View>

      <View style={styles.heroRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prayerName}>{nextLabel}</Text>
          <Text style={styles.prayerTime}>{nextTime}</Text>
        </View>
        <View style={styles.countdownBox}>
          <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>
          <Text style={styles.countdownLabel}>{t('home.remaining')}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round((next?.progress ?? 0) * 100)}%` }]} />
      </View>

      {!compact && today ? (
        <View style={styles.timesRow}>
          {PRAYER_KEYS.map((k: PrayerKey) => {
            const active = next?.currentKey === k;
            return (
              <View key={k} style={[styles.timeCell, active && styles.timeCellActive]}>
                <Text style={[styles.timeName, active && styles.timeNameActive]}>{prayerName(k)}</Text>
                <Text style={[styles.timeValue, active && styles.timeValueActive]}>{today.timings[k]}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    maxWidth: '65%',
  },
  locationText: { color: '#ecfdf5', fontSize: 12, fontFamily: FONT.medium },
  kicker: { color: 'rgba(236,253,245,0.8)', fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  prayerName: { color: '#ecfdf5', fontSize: 18, fontFamily: FONT.semibold },
  prayerTime: { color: '#ffffff', fontSize: 44, fontFamily: FONT.bold, letterSpacing: -1, lineHeight: 50 },
  countdownBox: { alignItems: 'flex-end' },
  countdown: { color: '#ffffff', fontSize: 22, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  countdownLabel: { color: 'rgba(236,253,245,0.8)', fontSize: 11, fontFamily: FONT.medium },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#ffffff' },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeCell: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10, minWidth: 48 },
  timeCellActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
  timeName: { color: 'rgba(236,253,245,0.75)', fontSize: 10, fontFamily: FONT.medium },
  timeNameActive: { color: '#fff' },
  timeValue: { color: '#ecfdf5', fontSize: 12, fontFamily: FONT.semibold, marginTop: 2 },
  timeValueActive: { color: '#fff' },
  ctaTitle: { color: '#fff', fontSize: 18, fontFamily: FONT.bold },
  ctaBody: { color: 'rgba(236,253,245,0.9)', fontSize: 13, fontFamily: FONT.regular, lineHeight: 20 },
  ctaButton: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  ctaButtonText: { color: '#065f46', fontSize: 13, fontFamily: FONT.semibold },
});

export default NextPrayerCard;
