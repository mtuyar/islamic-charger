import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Moon, Sun, Star } from 'lucide-react-native';
import { Screen, Header, Card, SwitchRow, SectionTitle } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePrayerStore } from '../store/usePrayerStore';
import { upcomingHolyDays, daysUntil, formatHijri, gregorianToHijri } from '../services/hijri';
import { rescheduleAllNotifications } from '../services/prayerTimes';
import { t } from '../i18n';

const HolyDaysScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const lang = useSettingsStore(s => s.language);
  const holy = usePrayerStore(s => s.holyNightReminders);
  const setHoly = usePrayerStore(s => s.setHolyNightReminders);
  const now = new Date();
  const days = useMemo(() => upcomingHolyDays(now, 30), []);
  const today = gregorianToHijri(now);

  const fmtDate = (d: Date) => d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Screen>
      <Header title={t('calendar.title')} subtitle={`${t('prayer.hijriToday')}: ${formatHijri(today, lang)}`} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padded={false}>
          <SwitchRow
            title={t('calendar.notifyTitle')}
            subtitle={t('calendar.notifyHint')}
            value={holy}
            onValueChange={(v) => { setHoly(v); rescheduleAllNotifications(); }}
            icon={<Star size={16} color={c.gold} />}
            last
          />
        </Card>

        <SectionTitle title={t('calendar.upcoming')} />
        {days.map((d, i) => {
          const left = daysUntil(d.date, now);
          const past = left < 0;
          const isToday = left === 0;
          const Icon = d.isNight ? Moon : Sun;
          return (
            <View key={`${d.key}-${d.hijri.year}`} style={[styles.item, { backgroundColor: isToday ? c.accentSoft : c.card, borderColor: isToday ? c.accent : c.border, opacity: past ? 0.5 : 1 }]}>
              <View style={[styles.iconWrap, { backgroundColor: isToday ? c.accent : c.cardAlt }]}>
                <Icon size={18} color={isToday ? '#fff' : c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.text }]}>{t(`calendar.names.${d.key}`)}</Text>
                <Text style={[styles.date, { color: c.textSecondary }]}>
                  {d.isNight ? t('calendar.nightOf', { date: fmtDate(new Date(d.date.getTime() - 86_400_000)) }) : fmtDate(d.date)}
                </Text>
                <Text style={[styles.hijri, { color: c.textMuted }]}>{formatHijri(d.hijri, lang)}{d.durationDays > 1 ? ` · ${d.durationDays} ${t('common.days')}` : ''}</Text>
              </View>
              <Text style={[styles.left, { color: isToday ? c.accentText : past ? c.textMuted : c.accent }]}>
                {isToday ? t('calendar.today') : past ? '' : t('calendar.daysLeft', { count: left })}
              </Text>
            </View>
          );
        })}
        <Text style={[styles.note, { color: c.textMuted }]}>{t('calendar.hijriNote')}</Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: FONT.semibold },
  date: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  hijri: { fontSize: 11, fontFamily: FONT.regular, marginTop: 1 },
  left: { fontSize: 12, fontFamily: FONT.semibold, textAlign: 'right', maxWidth: 90 },
  note: { fontSize: 11, fontFamily: FONT.regular, lineHeight: 17, marginTop: SPACING.sm },
});

export default HolyDaysScreen;
