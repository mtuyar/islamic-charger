import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, BellRing, Volume2, Timer, Sparkles, MapPin } from 'lucide-react-native';
import { Screen, Header, Card, SectionTitle, SwitchRow, Chip, Row, Button } from '../components/ui';
import { useTheme, FONT, SPACING } from '../theme';
import { usePrayerStore, PRAYER_KEYS, NotificationSound } from '../store/usePrayerStore';
import { prayerName, rescheduleAllNotifications, METHODS } from '../services/prayerTimes';
import { hasNotificationPermission, requestNotificationPermission, scheduleAt, getScheduledCount } from '../services/notifications';
import { t } from '../i18n';

const SOUNDS: NotificationSound[] = ['chime', 'default', 'silent'];
const PRE_MINUTES = [0, 5, 10, 15, 30];

const PrayerSettingsScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<any>();
  const prefs = usePrayerStore(s => s.notificationPrefs);
  const setPref = usePrayerStore(s => s.setNotificationPref);
  const sound = usePrayerStore(s => s.sound);
  const setSound = usePrayerStore(s => s.setSound);
  const pre = usePrayerStore(s => s.preReminderMinutes);
  const setPre = usePrayerStore(s => s.setPreReminder);
  const holy = usePrayerStore(s => s.holyNightReminders);
  const setHoly = usePrayerStore(s => s.setHolyNightReminders);
  const method = usePrayerStore(s => s.method);
  const location = usePrayerStore(s => s.location);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);

  const refresh = async () => {
    setGranted(await hasNotificationPermission());
    setCount(await getScheduledCount());
  };
  useEffect(() => { refresh(); }, []);

  const ensurePermission = async (): Promise<boolean> => {
    if (granted) return true;
    const ok = await requestNotificationPermission();
    setGranted(ok);
    if (!ok) {
      Alert.alert(t('prayer.permissionNeeded'), t('prayer.permissionBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.title'), onPress: () => Linking.openSettings() },
      ]);
    }
    return ok;
  };

  const apply = async () => {
    await rescheduleAllNotifications();
    await refresh();
  };

  const togglePrayer = async (k: typeof PRAYER_KEYS[number], v: boolean) => {
    if (v && !(await ensurePermission())) return;
    setPref(k, v);
    apply();
  };

  const testNotification = async () => {
    if (!(await ensurePermission())) return;
    await scheduleAt({
      title: t('prayer.title'),
      body: t('prayer.preReminderBody'),
      date: new Date(Date.now() + 3000),
      sound,
    });
  };

  return (
    <Screen>
      <Header title={t('prayer.notifications')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {granted === false ? (
          <Card accent style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BellRing size={18} color={c.accentText} />
              <Text style={[styles.permTitle, { color: c.accentText }]}>{t('prayer.permissionNeeded')}</Text>
            </View>
            <Text style={[styles.permBody, { color: c.textSecondary }]}>{t('prayer.permissionBody')}</Text>
            <Button title={t('prayer.allow')} onPress={ensurePermission} small style={{ alignSelf: 'flex-start' }} />
          </Card>
        ) : null}

        <View>
          <SectionTitle title={t('prayer.notifications')} />
          <Card padded={false}>
            {PRAYER_KEYS.map((k, i) => (
              <SwitchRow
                key={k}
                title={prayerName(k)}
                value={!!prefs[k]}
                onValueChange={(v) => togglePrayer(k, v)}
                icon={<Bell size={16} color={c.accent} />}
                last={i === PRAYER_KEYS.length - 1}
              />
            ))}
          </Card>
          <Text style={[styles.hint, { color: c.textMuted }]}>{t('prayer.notifHint')}</Text>
        </View>

        <View>
          <SectionTitle title={t('prayer.sound')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SOUNDS.map(s => (
              <Chip
                key={s}
                label={t(`prayer.sound${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
                active={sound === s}
                icon={<Volume2 size={14} color={sound === s ? '#fff' : c.textSecondary} />}
                onPress={() => { setSound(s); apply(); }}
              />
            ))}
          </View>
          <Button title={t('prayer.soundPreview')} variant="ghost" small onPress={testNotification} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
        </View>

        <View>
          <SectionTitle title={t('prayer.preReminder')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRE_MINUTES.map(m => (
              <Chip
                key={m}
                label={m === 0 ? t('common.off') : t('prayer.preReminderMin', { min: m })}
                active={pre === m}
                icon={m ? <Timer size={14} color={pre === m ? '#fff' : c.textSecondary} /> : undefined}
                onPress={() => { setPre(m); apply(); }}
              />
            ))}
          </View>
        </View>

        <Card padded={false}>
          <SwitchRow
            title={t('calendar.notifyTitle')}
            subtitle={t('calendar.notifyHint')}
            value={holy}
            onValueChange={(v) => { setHoly(v); apply(); }}
            icon={<Sparkles size={16} color={c.gold} />}
          />
          <Row
            icon={<MapPin size={16} color={c.accent} />}
            title={t('prayer.method')}
            subtitle={`${METHODS.find(m => m.id === method)?.name ?? method}${location ? ` · ${location.label}` : ''}`}
            onPress={() => nav.navigate('LocationPicker')}
            chevron
            last
          />
        </Card>

        <Text style={[styles.hint, { color: c.textMuted }]}>
          {count > 0 ? `${count} ${t('prayer.notifications').toLowerCase()} ✓` : ''}
          {Platform.OS === 'android' ? `\n${t('prayer.exactAlarmHint')}` : ''}
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.lg },
  permTitle: { fontSize: 15, fontFamily: FONT.bold },
  permBody: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 20 },
  hint: { fontSize: 12, fontFamily: FONT.regular, marginTop: 8, lineHeight: 18 },
});

export default PrayerSettingsScreen;
