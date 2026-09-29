import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Moon, Sun, Smartphone, Languages, Vibrate, Type, Palette, Download, Upload, Trash2, Bell, Info, RefreshCw, BookOpen, Music, ListChecks } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Screen, Header, Card, Row, SwitchRow, SectionTitle, Chip, haptic } from '../components/ui';
import { useTheme, FONT, SPACING } from '../theme';
import { useSettingsStore, ThemeMode, ArabicFont, ReadingTheme, TRANSLATION_EDITIONS, RECITERS } from '../store/useSettingsStore';
import { exportBackup, importBackup, clearCaches } from '../services/backup';
import { rescheduleAllNotifications } from '../services/prayerTimes';
import { syncWidgets } from '../services/widgets';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const FONTS: { id: ArabicFont; label: string }[] = [
  { id: 'MeQuran', label: 'Mushaf' },
  { id: 'Amiri_400Regular', label: 'Amiri' },
  { id: 'ScheherazadeNew_400Regular', label: 'Scheherazade' },
  { id: 'NotoNaskhArabic_400Regular', label: 'Naskh' },
];

const SettingsScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const s = useSettingsStore();
  const [busy, setBusy] = useState(false);
  const editions = TRANSLATION_EDITIONS.filter(e => e.lang === s.language);

  const setTheme = (m: ThemeMode) => { s.setThemeMode(m); };
  const setLang = async (l: 'tr' | 'en') => {
    s.setLanguage(l);
    haptic('selection');
    await rescheduleAllNotifications();
    await syncWidgets();
  };

  const doExport = async () => {
    setBusy(true);
    try { await exportBackup(); } catch { Alert.alert(t('common.error')); } finally { setBusy(false); }
  };
  const doImport = () => {
    Alert.alert(t('settings.importBackup'), t('settings.importConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.continue'),
        onPress: async () => {
          setBusy(true);
          try {
            const n = await importBackup();
            if (n !== null) Alert.alert(t('settings.importDone'));
          } catch { Alert.alert(t('common.error')); } finally { setBusy(false); }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header title={t('settings.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <SectionTitle title={t('settings.appearance')} />
          <View style={styles.chips}>
            <Chip label={t('settings.themeSystem')} active={s.themeMode === 'system'} onPress={() => setTheme('system')} icon={<Smartphone size={14} color={s.themeMode === 'system' ? '#fff' : c.textSecondary} />} />
            <Chip label={t('settings.themeLight')} active={s.themeMode === 'light'} onPress={() => setTheme('light')} icon={<Sun size={14} color={s.themeMode === 'light' ? '#fff' : c.textSecondary} />} />
            <Chip label={t('settings.themeDark')} active={s.themeMode === 'dark'} onPress={() => setTheme('dark')} icon={<Moon size={14} color={s.themeMode === 'dark' ? '#fff' : c.textSecondary} />} />
          </View>
          <Text style={[styles.label, { color: c.textSecondary, marginTop: SPACING.sm }]}>{t('settings.style')}</Text>
          <View style={styles.chips}>
            {(['default', 'sepia', 'amoled'] as ReadingTheme[]).map(v => (
              <Chip key={v} label={t(`quran.theme${v.charAt(0).toUpperCase()}${v.slice(1)}`)} active={s.readingTheme === v} onPress={() => s.setReadingTheme(v)} icon={<Palette size={14} color={s.readingTheme === v ? '#fff' : c.textSecondary} />} />
            ))}
          </View>
          <Text style={[styles.hint, { color: c.textMuted }]}>{t('settings.styleHint')}</Text>
          <Card padded={false} style={{ marginTop: SPACING.sm }}>
            <Row
              icon={<Languages size={16} color={c.accent} />}
              title={t('settings.language')}
              right={
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Chip label="Türkçe" active={s.language === 'tr'} onPress={() => setLang('tr')} />
                  <Chip label="English" active={s.language === 'en'} onPress={() => setLang('en')} />
                </View>
              }
            />
            <SwitchRow icon={<Vibrate size={16} color={c.accent} />} title={t('settings.haptics')} value={s.hapticsEnabled} onValueChange={s.setHaptics} last />
          </Card>
        </View>

        <View>
          <SectionTitle title={t('settings.reading')} />
          <Card style={{ gap: SPACING.md }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('quran.arabicFont')}</Text>
              <View style={styles.chips}>
                {FONTS.map(f => <Chip key={f.id} label={f.label} active={s.arabicFont === f.id} onPress={() => s.setArabicFont(f.id)} />)}
              </View>
              <Text style={[styles.preview, { color: c.text, fontFamily: s.arabicFont, fontSize: 26 * s.fontScale, lineHeight: 48 * s.fontScale }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('quran.fontSize')}</Text>
              <View style={styles.chips}>
                {[0.85, 1, 1.15, 1.3, 1.5].map(v => <Chip key={v} label={`${Math.round(v * 100)}%`} active={Math.abs(s.fontScale - v) < 0.01} onPress={() => s.setFontScale(v)} />)}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('quran.translation')}</Text>
              <View style={styles.chips}>
                {editions.map(e => <Chip key={e.id} label={e.name} active={s.translationEdition === e.id} onPress={() => s.setTranslationEdition(e.id)} />)}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>{t('quran.reciter')}</Text>
              <View style={styles.chips}>
                {RECITERS.map(r => <Chip key={r.id} label={r.name} active={s.reciterId === r.id} onPress={() => s.setReciter(r.id)} icon={<Music size={13} color={s.reciterId === r.id ? '#fff' : c.textSecondary} />} />)}
              </View>
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle title={t('settings.prayerSection')} />
          <Card padded={false}>
            <Row icon={<Bell size={16} color={c.accent} />} title={t('prayer.notifications')} onPress={() => nav.navigate('PrayerSettings')} chevron />
            <Row icon={<BookOpen size={16} color={c.accent} />} title={t('prayer.location')} onPress={() => nav.navigate('LocationPicker')} chevron />
            <SwitchRow icon={<ListChecks size={16} color={c.accent} />} title={t('settings.showPrayerTracker')} subtitle={t('settings.showPrayerTrackerHint')} value={s.showPrayerTracker} onValueChange={s.setShowPrayerTracker} last />
          </Card>
        </View>

        <View>
          <SectionTitle title={t('settings.data')} />
          <Card padded={false}>
            <Row icon={<Download size={16} color={c.accent} />} title={t('settings.exportBackup')} onPress={doExport} chevron />
            <Row icon={<Upload size={16} color={c.accent} />} title={t('settings.importBackup')} onPress={doImport} chevron />
            <Row icon={<Trash2 size={16} color={c.textSecondary} />} title={t('settings.clearCache')} onPress={async () => { await clearCaches(); Alert.alert(t('settings.cacheCleared')); }} />
            <Row icon={<RefreshCw size={16} color={c.textSecondary} />} title={t('settings.replayOnboarding')} onPress={() => { s.setOnboardingDone(false); }} last />
          </Card>
        </View>

        <Card padded={false}>
          <Row icon={<Info size={16} color={c.textSecondary} />} title={t('more.about')} subtitle={`${t('settings.version')} ${Constants.expoConfig?.version ?? ''}`} onPress={() => nav.navigate('About')} chevron last />
        </Card>
        {busy ? <Text style={[styles.busy, { color: c.textMuted }]}>{t('common.loading')}</Text> : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: SPACING.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 12, fontFamily: FONT.semibold },
  preview: { textAlign: 'center', marginTop: 4 },
  busy: { textAlign: 'center', fontSize: 12, fontFamily: FONT.medium },
  hint: { fontSize: 11, fontFamily: FONT.regular, marginTop: 6, lineHeight: 16 },
});

export default SettingsScreen;
