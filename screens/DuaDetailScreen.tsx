import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share2, RotateCcw, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Screen, Header, Card, IconButton, SectionTitle, haptic } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { DUAS } from '../data/duas';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const DuaDetailScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DuaDetail'>>();
  const lang = useSettingsStore(s => s.language);
  const arabicFont = useSettingsStore(s => s.arabicFont);
  const fontScale = useSettingsStore(s => s.fontScale);
  const dua = DUAS.find(d => d.id === params.duaId);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);
  if (!dua) return null;

  const goal = dua.count ?? 1;
  const done = count >= goal;
  const title = lang === 'tr' ? dua.titleTr : dua.titleEn;
  const meaning = lang === 'tr' ? dua.tr : dua.en;

  const tap = () => {
    if (done) return;
    const next = count + 1;
    setCount(next);
    if (next >= goal) haptic('success'); else if (next % 33 === 0) haptic('heavy'); else haptic('light');
  };

  const copy = async () => {
    await Clipboard.setStringAsync(`${dua.arabic}\n\n${dua.transliteration}\n\n${meaning}\n— ${dua.source}`);
    setCopied(true);
    haptic('success');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Screen>
      <Header
        title={title}
        onBack={() => nav.goBack()}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton onPress={copy} label={t('common.copy')}>{copied ? <Check size={18} color={c.accent} /> : <Copy size={18} color={c.textSecondary} />}</IconButton>
            <IconButton onPress={() => nav.navigate('ShareCard', { arabic: dua.arabic, text: meaning, source: dua.source, kind: 'dua' })} label={t('a11y.share')}>
              <Share2 size={18} color={c.textSecondary} />
            </IconButton>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={[styles.arabic, { color: c.text, fontFamily: arabicFont === 'MeQuran' ? 'Amiri_400Regular' : arabicFont, fontSize: 28 * fontScale, lineHeight: 52 * fontScale }]}>
            {dua.arabic}
          </Text>
        </Card>

        <View>
          <SectionTitle title={t('dhikr.transliteration')} />
          <Text style={[styles.translit, { color: c.text, fontSize: 15 * fontScale, lineHeight: 24 * fontScale }]}>{dua.transliteration}</Text>
        </View>

        <View>
          <SectionTitle title={t('dhikr.meaning')} />
          <Text style={[styles.meaning, { color: c.textSecondary, fontSize: 15 * fontScale, lineHeight: 24 * fontScale }]}>{meaning}</Text>
        </View>

        <View>
          <SectionTitle title={t('dhikr.source')} />
          <Text style={[styles.source, { color: c.textMuted }]}>{dua.source}</Text>
        </View>

        <View style={styles.counterWrap}>
          <TouchableOpacity
            onPress={tap}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${t('dhikr.count')} ${count}/${goal}`}
            style={[styles.counter, { backgroundColor: done ? c.gold : c.accent }]}
          >
            <Text style={styles.counterNum}>{count}</Text>
            <Text style={styles.counterGoal}>{done ? t('dhikr.completed') : `/ ${goal}`}</Text>
          </TouchableOpacity>
          <IconButton filled onPress={() => setCount(0)} label={t('dhikr.reset')}>
            <RotateCcw size={18} color={c.textSecondary} />
          </IconButton>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: SPACING.lg },
  arabic: { textAlign: 'right', writingDirection: 'rtl' },
  translit: { fontFamily: FONT.medium, fontStyle: 'italic' },
  meaning: { fontFamily: FONT.regular },
  source: { fontSize: 13, fontFamily: FONT.medium },
  counterWrap: { alignItems: 'center', gap: 14, marginTop: SPACING.md },
  counter: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  counterNum: { color: '#fff', fontSize: 48, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  counterGoal: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: FONT.semibold },
});

export default DuaDetailScreen;
