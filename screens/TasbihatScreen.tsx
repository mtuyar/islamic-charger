import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RotateCcw, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { Screen, Header, IconButton, Button, haptic } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { DUAS } from '../data/duas';
import { t } from '../i18n';

/** Guided post-prayer tasbihat: istighfar → Allahumma anta's-salam → 33/33/33 → tawhid → dua. */
const FLOW_IDS = ['astaghfirullah-3', 'antas-salam', 'ayatul-kursi', 'subhanallah-33', 'alhamdulillah-33', 'allahuakbar-33', 'la-ilahe-illallah-wahdahu', 'rabbana-atina'];

const TasbihatScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const lang = useSettingsStore(s => s.language);
  const arabicFont = useSettingsStore(s => s.arabicFont);
  const steps = useMemo(() => FLOW_IDS.map(id => DUAS.find(d => d.id === id)!).filter(Boolean), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const step = steps[stepIndex];
  const goal = step.id === 'la-ilahe-illallah-wahdahu' ? 1 : (step.count ?? 1);
  const progress = (stepIndex + count / goal) / steps.length;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  };

  const advance = () => {
    if (stepIndex + 1 >= steps.length) {
      setFinished(true);
      haptic('success');
      return;
    }
    setStepIndex(i => i + 1);
    setCount(0);
    haptic('heavy');
  };

  const tap = () => {
    pulse();
    const next = count + 1;
    if (next >= goal) {
      setCount(goal);
      setTimeout(advance, 180);
    } else {
      setCount(next);
      haptic(next % 11 === 0 ? 'medium' : 'light');
    }
  };

  const reset = () => { setStepIndex(0); setCount(0); setFinished(false); };

  return (
    <Screen>
      <Header
        title={t('dhikr.afterPrayer')}
        subtitle={`${Math.min(stepIndex + 1, steps.length)} / ${steps.length}`}
        onBack={() => nav.goBack()}
        right={<IconButton filled onPress={reset} label={t('dhikr.reset')}><RotateCcw size={18} color={c.textSecondary} /></IconButton>}
      />
      <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: c.accent }]} />
      </View>

      {finished ? (
        <View style={styles.done}>
          <CheckCircle2 size={64} color={c.accent} />
          <Text style={[styles.doneTitle, { color: c.text }]}>{t('dhikr.completed')}</Text>
          <Text style={[styles.doneSub, { color: c.textSecondary }]}>{t('dhikr.tasbihatAccept')}</Text>
          <Button title={t('dhikr.reset')} variant="secondary" onPress={reset} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={{ gap: 8 }}>
            <Text style={[styles.stepTitle, { color: c.textSecondary }]}>{(lang === 'tr' ? step.titleTr : step.titleEn).toUpperCase()}</Text>
            <Text style={[styles.arabic, { color: c.text, fontFamily: arabicFont === 'MeQuran' ? 'Amiri_400Regular' : arabicFont }]} numberOfLines={5} adjustsFontSizeToFit>
              {step.arabic}
            </Text>
            <Text style={[styles.translit, { color: c.textSecondary }]} numberOfLines={3}>{step.transliteration}</Text>
          </View>

          <TouchableOpacity onPress={tap} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`${count} / ${goal}`} style={{ alignItems: 'center' }}>
            <Animated.View style={[styles.circle, { backgroundColor: c.accent, transform: [{ scale }] }]}>
              <Text style={styles.num}>{count}</Text>
              <Text style={styles.goal}>/ {goal}</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={advance} style={styles.skip} accessibilityRole="button">
            <Text style={[styles.skipText, { color: c.textMuted }]}>{t('common.skip')}</Text>
            <ChevronRight size={14} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  track: { height: 4, marginHorizontal: SPACING.lg, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  body: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, justifyContent: 'space-between', paddingBottom: 40 },
  stepTitle: { fontSize: 11, fontFamily: FONT.semibold, letterSpacing: 1.4, textAlign: 'center' },
  arabic: { fontSize: 28, lineHeight: 50, textAlign: 'center', writingDirection: 'rtl' },
  translit: { fontSize: 13, fontFamily: FONT.medium, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  circle: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  num: { color: '#fff', fontSize: 72, fontFamily: FONT.bold, fontVariant: ['tabular-nums'], lineHeight: 80 },
  goal: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontFamily: FONT.semibold },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', padding: 8 },
  skipText: { fontSize: 13, fontFamily: FONT.medium },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: SPACING.xl },
  doneTitle: { fontSize: 22, fontFamily: FONT.bold },
  doneSub: { fontSize: 14, fontFamily: FONT.regular },
});

export default TasbihatScreen;
