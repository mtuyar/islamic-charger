import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Bell, Moon, Sun, Smartphone, Navigation, Check, Languages } from 'lucide-react-native';
import { Screen, Button, Chip, haptic } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore, ThemeMode } from '../store/useSettingsStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { resolveGpsLocation, defaultMethodFor, ensureCalendars, rescheduleAllNotifications } from '../services/prayerTimes';
import { requestNotificationPermission } from '../services/notifications';
import { syncWidgets } from '../services/widgets';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const s = useSettingsStore();
  const location = usePrayerStore(st => st.location);
  const setLocation = usePrayerStore(st => st.setLocation);
  const setMethod = usePrayerStore(st => st.setMethod);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [locating, setLocating] = useState(false);
  const [notifDone, setNotifDone] = useState(false);

  const go = (p: number) => {
    haptic('selection');
    setPage(p);
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
  };

  const finish = async () => {
    haptic('success');
    s.setOnboardingDone(true);
    nav.reset({ index: 0, routes: [{ name: 'Home' }] });
    await ensureCalendars();
    await rescheduleAllNotifications();
    await syncWidgets();
  };

  const useGps = async () => {
    setLocating(true);
    try {
      const loc = await resolveGpsLocation();
      setLocation(loc);
      setMethod(defaultMethodFor(loc.countryCode));
      haptic('success');
      go(2);
    } catch (e: any) {
      Alert.alert(t('prayer.location'), e?.message === 'permission-denied' ? t('prayer.locationDenied') : t('common.error'));
    } finally {
      setLocating(false);
    }
  };

  const enableNotifs = async () => {
    const ok = await requestNotificationPermission();
    setNotifDone(ok);
    go(3);
  };

  const Page: React.FC<{ icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }> = ({ icon, title, body, children }) => (
    <View style={[styles.page, { width }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>{icon}</View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text>
      <View style={{ width: '100%', gap: 10, marginTop: SPACING.lg }}>{children}</View>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.langRow}>
        <Languages size={14} color={c.textMuted} />
        <Chip label="TR" active={s.language === 'tr'} onPress={() => s.setLanguage('tr')} />
        <Chip label="EN" active={s.language === 'en'} onPress={() => s.setLanguage('en')} />
      </View>
      <ScrollView ref={scrollRef} horizontal pagingEnabled scrollEnabled={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <Page
          icon={<LinearGradient colors={[c.accent, '#065f46']} style={styles.logo}><Text style={styles.logoGlyph}>☾</Text></LinearGradient>}
          title={t('onboarding.welcomeTitle')}
          body={t('onboarding.welcomeBody')}
        >
          <Button title={t('common.continue')} onPress={() => go(1)} />
        </Page>

        <Page icon={<MapPin size={30} color={c.accent} />} title={t('onboarding.locationTitle')} body={t('onboarding.locationBody')}>
          {location ? (
            <View style={[styles.locPill, { backgroundColor: c.accentSoft }]}>
              <Check size={16} color={c.accentText} />
              <Text style={[styles.locText, { color: c.accentText }]}>{location.label}</Text>
            </View>
          ) : null}
          <Button title={locating ? t('prayer.locating') : t('prayer.useGps')} onPress={useGps} loading={locating} icon={<Navigation size={16} color="#fff" />} />
          <Button title={t('onboarding.chooseCity')} variant="secondary" onPress={() => nav.navigate('LocationPicker')} />
          <Button title={location ? t('common.continue') : t('onboarding.later')} variant="ghost" onPress={() => go(2)} />
        </Page>

        <Page icon={<Bell size={30} color={c.accent} />} title={t('onboarding.notifTitle')} body={t('onboarding.notifBody')}>
          <Button title={t('onboarding.enableNotifs')} onPress={enableNotifs} />
          <Button title={t('onboarding.later')} variant="ghost" onPress={() => go(3)} />
        </Page>

        <Page icon={<Moon size={30} color={c.accent} />} title={t('onboarding.themeTitle')} body={t('onboarding.themeBody')}>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {([['system', Smartphone, t('settings.themeSystem')], ['light', Sun, t('settings.themeLight')], ['dark', Moon, t('settings.themeDark')]] as [ThemeMode, any, string][]).map(([m, Icon, label]) => (
              <TouchableOpacity key={m} onPress={() => { haptic('selection'); s.setThemeMode(m); }} style={[styles.themeBox, { backgroundColor: s.themeMode === m ? c.accent : c.card, borderColor: s.themeMode === m ? c.accent : c.border }]} accessibilityRole="button" accessibilityLabel={label}>
                <Icon size={20} color={s.themeMode === m ? '#fff' : c.textSecondary} />
                <Text style={[styles.themeLabel, { color: s.themeMode === m ? '#fff' : c.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title={t('onboarding.finish')} onPress={finish} style={{ marginTop: 8 }} />
        </Page>
      </ScrollView>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map(i => <View key={i} style={[styles.dot, { backgroundColor: i === page ? c.accent : c.borderStrong, width: i === page ? 20 : 6 }]} />)}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingHorizontal: SPACING.lg, paddingTop: 4 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl, paddingBottom: 40 },
  iconWrap: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, overflow: 'hidden' },
  logo: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  logoGlyph: { color: '#fff', fontSize: 44 },
  title: { fontSize: 26, fontFamily: FONT.bold, textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 15, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 23, marginTop: 10 },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  locText: { fontSize: 13, fontFamily: FONT.semibold },
  themeBox: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.lg, borderWidth: 1 },
  themeLabel: { fontSize: 12, fontFamily: FONT.semibold },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
  dot: { height: 6, borderRadius: 3 },
});

export default OnboardingScreen;
