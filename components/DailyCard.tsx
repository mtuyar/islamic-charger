import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Share2, Shuffle, Sparkles, BookOpen, Quote } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { DAILY_CONTENT, DailyItem, dailyItemFor, ayahRange } from '../data/dailyContent';
import { TURKISH_SURAH_NAMES } from '../services/api';
import { t } from '../i18n';
import { IconButton, haptic } from './ui';
import type { RootStackParamList } from '../navigation/types';

const sourceOf = (item: DailyItem, lang: 'tr' | 'en'): string => {
  if (item.type === 'ayah' && item.surah) {
    const name = TURKISH_SURAH_NAMES[item.surah] ?? String(item.surah);
    return t('share.ayahSource', { surah: name, ayah: ayahRange(item) });
  }
  return (lang === 'tr' ? item.sourceTr : item.sourceEn) ?? '';
};

const DailyCard: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lang = useSettingsStore(s => s.language);
  const arabicFont = useSettingsStore(s => s.arabicFont);
  const [item, setItem] = useState<DailyItem>(() => dailyItemFor());
  const isDaily = item.id === dailyItemFor().id;

  const text = lang === 'tr' ? item.tr : item.en;
  const source = sourceOf(item, lang);
  const kind = item.type === 'ayah' ? t('daily.ayahOfDay') : item.type === 'hadith' ? t('daily.hadithOfDay') : t('daily.wisdomOfDay');
  const Icon = item.type === 'ayah' ? BookOpen : item.type === 'hadith' ? Sparkles : Quote;

  const shuffle = () => {
    haptic('light');
    let next = item;
    while (next.id === item.id) next = DAILY_CONTENT[Math.floor(Math.random() * DAILY_CONTENT.length)];
    setItem(next);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={14} color={c.accent} />
          <Text style={[styles.kicker, { color: c.accent }]}>{(isDaily ? kind : t('home.dailyContent')).toUpperCase()}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <IconButton size={34} onPress={shuffle} label={t('tevafuk.refresh')}>
            <Shuffle size={16} color={c.textSecondary} />
          </IconButton>
          <IconButton
            size={34}
            onPress={() => nav.navigate('ShareCard', { arabic: item.arabic, text, source, kind: item.type })}
            label={t('a11y.share')}
          >
            <Share2 size={16} color={c.textSecondary} />
          </IconButton>
        </View>
      </View>

      {item.arabic ? (
        <Text style={[styles.arabic, { color: c.text, fontFamily: arabicFont === 'MeQuran' ? 'Amiri_400Regular' : arabicFont }]}>
          {item.arabic}
        </Text>
      ) : null}
      <Text style={[styles.text, { color: item.arabic ? c.textSecondary : c.text }]}>{text}</Text>

      <View style={styles.footer}>
        <Text style={[styles.source, { color: c.textMuted }]} numberOfLines={1}>{source}</Text>
        {item.type === 'ayah' && item.surah ? (
          <TouchableOpacity
            onPress={() => nav.navigate('Reader', { surahId: item.surah!, startAyah: item.ayah })}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={[styles.open, { color: c.accent }]}>{t('quran.title')} →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.lg, gap: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  arabic: { fontSize: 24, lineHeight: 44, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  text: { fontSize: 15, lineHeight: 24, fontFamily: FONT.regular },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  source: { fontSize: 12, fontFamily: FONT.medium, flex: 1 },
  open: { fontSize: 12, fontFamily: FONT.semibold },
});

export default DailyCard;
