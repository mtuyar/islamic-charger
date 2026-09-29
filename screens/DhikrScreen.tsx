import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Sunrise, Sunset, Hand, Home, BookOpen, Heart, CircleDot, Sparkles, ChevronRight, ListOrdered } from 'lucide-react-native';
import { Screen, Header, Card, SectionTitle, PressableScale } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { DUA_CATEGORIES, duasFor, DuaCategory } from '../data/duas';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const ICONS: Record<string, React.ComponentType<any>> = { sunrise: Sunrise, sunset: Sunset, hands: Hand, home: Home, book: BookOpen, heart: Heart };

const DhikrScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const colWidth = (width - SPACING.lg * 2 - 10) / 2;
  const hour = new Date().getHours();
  const suggested: DuaCategory = hour < 12 ? 'morning' : hour >= 16 ? 'evening' : 'afterPrayer';

  return (
    <Screen>
      <Header large title={t('dhikr.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PressableScale onPress={() => nav.navigate('Tasbih')} style={{ flex: 1 }} accessibilityLabel={t('dhikr.tasbih')}>
            <LinearGradient colors={[c.accent, '#065f46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <CircleDot size={22} color="#fff" />
              <Text style={styles.heroTitle}>{t('dhikr.tasbih')}</Text>
              <Text style={styles.heroSub}>{t('dhikr.count')} · {t('dhikr.goal')}</Text>
            </LinearGradient>
          </PressableScale>
          <PressableScale onPress={() => nav.navigate('Tasbihat')} style={{ flex: 1 }} accessibilityLabel={t('dhikr.startTasbihat')}>
            <LinearGradient colors={['#b8860b', '#7c5a05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <ListOrdered size={22} color="#fff" />
              <Text style={styles.heroTitle}>{t('dhikr.afterPrayer')}</Text>
              <Text style={styles.heroSub}>33 · 33 · 33</Text>
            </LinearGradient>
          </PressableScale>
        </View>

        <Card accent onPress={() => nav.navigate('DuaList', { category: suggested })} accessibilityLabel={t(`dhikr.${suggested}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sparkles size={18} color={c.accentText} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.suggestKicker, { color: c.accentText }]}>{t('home.quickActions').toUpperCase()}</Text>
            <Text style={[styles.suggestTitle, { color: c.text }]}>{t(`dhikr.${suggested}`)}</Text>
          </View>
          <ChevronRight size={18} color={c.accentText} />
        </Card>

        <View>
          <SectionTitle title={t('dhikr.duas')} />
          <View style={styles.grid}>
            {DUA_CATEGORIES.map(cat => {
              const Icon = ICONS[cat.icon] ?? BookOpen;
              const count = duasFor(cat.key).length;
              return (
                <PressableScale key={cat.key} onPress={() => nav.navigate('DuaList', { category: cat.key })} style={[styles.gridItem, { width: colWidth, backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel={t(`dhikr.${cat.key}`)}>
                  <View style={[styles.gridIcon, { backgroundColor: c.accentSoft }]}>
                    <Icon size={20} color={c.accent} />
                  </View>
                  <Text style={[styles.gridTitle, { color: c.text }]} numberOfLines={2}>{t(`dhikr.${cat.key}`)}</Text>
                  <Text style={[styles.gridCount, { color: c.textMuted }]}>{count}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <Card onPress={() => nav.navigate('Esma')} accessibilityLabel={t('dhikr.esma')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.esmaGlyph, { color: c.gold }]}>ٱللَّٰه</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.gridTitle, { color: c.text }]}>{t('dhikr.esma')}</Text>
            <Text style={[styles.gridCount, { color: c.textMuted }]}>99</Text>
          </View>
          <ChevronRight size={18} color={c.textMuted} />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.lg },
  hero: { borderRadius: RADIUS.xl, padding: SPACING.lg, gap: 6, minHeight: 120, justifyContent: 'flex-end' },
  heroTitle: { color: '#fff', fontSize: 15, fontFamily: FONT.bold },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: FONT.medium },
  suggestKicker: { fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 1.4 },
  suggestTitle: { fontSize: 15, fontFamily: FONT.semibold, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, gap: 6, minHeight: 124, justifyContent: 'flex-end' },
  gridIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridTitle: { fontSize: 14, fontFamily: FONT.semibold },
  gridCount: { fontSize: 12, fontFamily: FONT.medium },
  esmaGlyph: { fontSize: 30, fontFamily: 'Amiri_400Regular', lineHeight: 46 },
});

export default DhikrScreen;
