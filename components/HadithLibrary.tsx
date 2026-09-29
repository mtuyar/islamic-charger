import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BookOpen, ChevronRight, Search, Library, WifiOff } from 'lucide-react-native';
import { Screen, Header, SectionTitle, Chip, Card, PressableScale } from './ui';
import { useTheme, useIsDark, FONT, RADIUS, SPACING } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { COLLECTIONS, HadithCollection, HadithChapter, isEmbeddedCollection, collectionName, collectionAuthor } from '../services/hadith';
import { t } from '../i18n';
import HadithSearch from './HadithSearch';

type Tab = 'collections' | 'search';

interface HadithLibraryProps {
  onSelectCollection: (collection: HadithCollection) => void;
  onOpenChapter?: (collection: HadithCollection, chapter: HadithChapter, hadithNumber?: string | number) => void;
  onBack: () => void;
}

const formatCount = (n: number, lang: string) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'tr' ? '.' : ',');

const HadithLibrary: React.FC<HadithLibraryProps> = ({ onSelectCollection, onOpenChapter, onBack }) => {
  const c = useTheme();
  const isDark = useIsDark();
  const lang = useSettingsStore(s => s.language);
  const [tab, setTab] = useState<Tab>('collections');
  const total = COLLECTIONS.reduce((sum, col) => sum + col.totalHadiths, 0);

  return (
    <Screen>
      <Header title={t('hadith.title')} subtitle={t('hadith.subtitle')} onBack={onBack} />

      <View style={styles.tabs}>
        <Chip label={t('hadith.sources')} active={tab === 'collections'} onPress={() => setTab('collections')}
          icon={<Library size={14} color={tab === 'collections' ? '#fff' : c.textSecondary} />} />
        <Chip label={t('hadith.search')} active={tab === 'search'} onPress={() => setTab('search')}
          icon={<Search size={14} color={tab === 'search' ? '#fff' : c.textSecondary} />} />
      </View>

      {tab === 'search' ? (
        <HadithSearch onSelectCollection={onSelectCollection} onOpenChapter={onOpenChapter} darkMode={isDark} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card accent style={styles.intro}>
            <View style={[styles.introIcon, { backgroundColor: c.card }]}>
              <BookOpen size={20} color={c.accentText} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.introTitle, { color: c.accentText }]}>{t('hadith.introTitle')}</Text>
              <Text style={[styles.introText, { color: c.accentText }]}>
                {t('hadith.intro', { count: formatCount(total, lang) })}
              </Text>
            </View>
          </Card>

          <SectionTitle title={t('hadith.sources')} style={{ marginTop: SPACING.xs }} />

          <View style={{ gap: SPACING.sm }}>
            {COLLECTIONS.map((col, i) => {
              const offline = isEmbeddedCollection(col.id);
              return (
                <PressableScale
                  key={col.id}
                  onPress={() => onSelectCollection(col)}
                  accessibilityLabel={`${collectionName(col)}, ${collectionAuthor(col)}`}
                  style={[styles.item, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  <View style={[styles.index, { backgroundColor: c.accentSoft }]}>
                    <Text style={[styles.indexText, { color: c.accentText }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{collectionName(col)}</Text>
                    <Text style={[styles.author, { color: c.textSecondary }]} numberOfLines={1}>{collectionAuthor(col)}</Text>
                    <View style={styles.meta}>
                      <Text style={[styles.count, { color: c.textMuted }]}>
                        {t('hadith.count', { count: formatCount(col.totalHadiths, lang) })}
                      </Text>
                      {offline ? (
                        <View style={[styles.badge, { backgroundColor: c.cardAlt }]}>
                          <WifiOff size={10} color={c.textSecondary} />
                          <Text style={[styles.badgeText, { color: c.textSecondary }]}>{t('hadith.offline')}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight size={18} color={c.textMuted} />
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs, paddingBottom: 40, gap: SPACING.sm },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
  introIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 14, fontFamily: FONT.bold },
  introText: { fontSize: 12, lineHeight: 17, fontFamily: FONT.regular, opacity: 0.9 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  index: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  indexText: { fontSize: 15, fontFamily: FONT.bold },
  name: { fontSize: 15, fontFamily: FONT.semibold },
  author: { fontSize: 12, fontFamily: FONT.regular },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  count: { fontSize: 11, fontFamily: FONT.medium },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontFamily: FONT.semibold },
});

export default HadithLibrary;
