import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Minus, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { Screen, Header, Card, Button, IconButton, haptic } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, KazaCounts } from '../store/usePrayerStore';
import { prayerName } from '../services/prayerTimes';
import { t } from '../i18n';

const KEYS: (keyof KazaCounts)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'];

const KazaScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const kaza = usePrayerStore(s => s.kaza);
  const setKaza = usePrayerStore(s => s.setKaza);
  const total = KEYS.reduce((a, k) => a + (kaza[k] ?? 0), 0);

  const label = (k: keyof KazaCounts) => (k === 'Witr' ? (t('common.today') === 'Today' ? 'Witr' : 'Vitir') : prayerName(k));

  const bump = (k: keyof KazaCounts, delta: number) => {
    haptic(delta < 0 ? 'success' : 'light');
    setKaza(k, (kaza[k] ?? 0) + delta);
  };

  const addDay = () => {
    haptic('medium');
    KEYS.forEach(k => setKaza(k, (usePrayerStore.getState().kaza[k] ?? 0) + 1));
  };

  const resetAll = () => {
    Alert.alert(t('prayer.kazaReset'), t('prayer.kazaResetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('prayer.kazaReset'), style: 'destructive', onPress: () => { haptic('medium'); KEYS.forEach(k => setKaza(k, 0)); } },
    ]);
  };

  const addBulk = () => {
    if (!Alert.prompt) { addDay(); return; }
    Alert.prompt(
      t('prayer.kazaAdd'),
      t('common.days'),
      (v) => {
        const n = parseInt(v ?? '', 10);
        if (!Number.isFinite(n) || n <= 0) return;
        KEYS.forEach(k => setKaza(k, (usePrayerStore.getState().kaza[k] ?? 0) + n));
      },
      'plain-text', '', 'number-pad',
    );
  };

  return (
    <Screen>
      <Header
        title={t('prayer.kaza')}
        onBack={() => nav.goBack()}
        right={total > 0 ? (
          <IconButton filled onPress={resetAll} label={t('prayer.kazaReset')}>
            <Trash2 size={18} color={c.danger} />
          </IconButton>
        ) : undefined}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card accent style={{ alignItems: 'center', gap: 4 }}>
          <Text style={[styles.totalLabel, { color: c.accentText }]}>{t('prayer.kazaTotal').toUpperCase()}</Text>
          <Text style={[styles.total, { color: c.accentText }]}>{total}</Text>
          {total === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color={c.gold} />
              <Text style={[styles.hint, { color: c.textSecondary }]}>{t('prayer.kazaEmpty')}</Text>
            </View>
          ) : <Text style={[styles.hint, { color: c.textSecondary }]}>{t('prayer.kazaHint')}</Text>}
        </Card>

        <Card padded={false}>
          {KEYS.map((k, i) => (
            <View key={k} style={[styles.row, { borderBottomColor: c.border, borderBottomWidth: i === KEYS.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
              <Text style={[styles.name, { color: c.text }]}>{label(k)}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => bump(k, -1)}
                  disabled={(kaza[k] ?? 0) === 0}
                  style={[styles.stepBtn, { backgroundColor: c.accentSoft, opacity: (kaza[k] ?? 0) === 0 ? 0.4 : 1 }]}
                  accessibilityRole="button" accessibilityLabel={`${label(k)} ${t('prayer.kazaPrayed')}`}
                >
                  <Minus size={16} color={c.accentText} />
                </TouchableOpacity>
                <Text style={[styles.count, { color: c.text }]}>{kaza[k] ?? 0}</Text>
                <TouchableOpacity
                  onPress={() => bump(k, 1)}
                  style={[styles.stepBtn, { backgroundColor: c.cardAlt }]}
                  accessibilityRole="button" accessibilityLabel={`${label(k)} ${t('a11y.increment')}`}
                >
                  <Plus size={16} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={`+1 ${t('common.days')}`} variant="secondary" onPress={addDay} style={{ flex: 1 }} />
          <Button title={t('prayer.kazaAdd')} variant="ghost" onPress={addBulk} style={{ flex: 1 }} />
        </View>
        <Text style={[styles.note, { color: c.textMuted }]}>
          {t('prayer.kazaNote')}
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.lg },
  totalLabel: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  total: { fontSize: 48, fontFamily: FONT.bold, letterSpacing: -1 },
  hint: { fontSize: 12, fontFamily: FONT.regular, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: SPACING.lg },
  name: { fontSize: 15, fontFamily: FONT.medium },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 40, textAlign: 'center', fontSize: 18, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, fontFamily: FONT.regular, lineHeight: 18 },
});

export default KazaScreen;
