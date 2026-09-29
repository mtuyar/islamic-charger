import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Repeat } from 'lucide-react-native';
import { Screen, Header, PressableScale } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { duasFor } from '../data/duas';
import { t } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

const DuaListScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DuaList'>>();
  const lang = useSettingsStore(s => s.language);
  const arabicFont = useSettingsStore(s => s.arabicFont);
  const list = duasFor(params.category);

  return (
    <Screen>
      <Header title={t(`dhikr.${params.category}`)} subtitle={`${list.length} ${t('dhikr.duas').toLowerCase()}`} onBack={() => nav.goBack()} />
      <FlatList
        data={list}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <PressableScale onPress={() => nav.navigate('DuaDetail', { duaId: item.id })} style={[styles.item, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLabel={lang === 'tr' ? item.titleTr : item.titleEn}>
            <View style={styles.itemHead}>
              <Text style={[styles.index, { color: c.textMuted }]}>{index + 1}</Text>
              <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{lang === 'tr' ? item.titleTr : item.titleEn}</Text>
              {item.count && item.count > 1 ? (
                <View style={[styles.count, { backgroundColor: c.accentSoft }]}>
                  <Repeat size={11} color={c.accentText} />
                  <Text style={[styles.countText, { color: c.accentText }]}>{item.count}</Text>
                </View>
              ) : null}
              <ChevronRight size={16} color={c.textMuted} />
            </View>
            <Text style={[styles.arabic, { color: c.text, fontFamily: arabicFont === 'MeQuran' ? 'Amiri_400Regular' : arabicFont }]} numberOfLines={2}>{item.arabic}</Text>
            <Text style={[styles.meaning, { color: c.textSecondary }]} numberOfLines={2}>{lang === 'tr' ? item.tr : item.en}</Text>
          </PressableScale>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.sm },
  item: { padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, gap: 6 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  index: { fontSize: 11, fontFamily: FONT.semibold, width: 18 },
  title: { flex: 1, fontSize: 14, fontFamily: FONT.semibold },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  countText: { fontSize: 11, fontFamily: FONT.bold },
  arabic: { fontSize: 20, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' },
  meaning: { fontSize: 13, lineHeight: 19, fontFamily: FONT.regular },
});

export default DuaListScreen;
