import { paletteFor } from '../theme';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Surah } from '../types';
import { Search, BookOpen, ChevronLeft, LayoutGrid, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlobalSearch from './GlobalSearch';
import KhatmCard from './KhatmCard';
import { JUZ_START } from '../services/api';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';

const KaabaIcon = ({ size = 18, color = '#10b981' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="6" width="16" height="14" rx="1" stroke={color} strokeWidth={1.8} />
        <Path d="M4 13h16" stroke={color} strokeWidth={1.8} />
        <Path d="M10 13v-3h4v3" stroke={color} strokeWidth={1.5} />
    </Svg>
);

const MosqueIcon = ({ size = 18, color = '#10b981' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 20v-6a7 7 0 0114 0v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M3 20h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M12 4v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={12} cy={3} r={1.2} fill={color} />
    </Svg>
);

const { width } = Dimensions.get('window');
const JUZ_CARD_WIDTH = (width - 48 - 12) / 2;

interface QuranLibraryProps {
    surahs: Surah[];
    onOpenSurah: (id: number, startAyah?: number) => void;
    lastReadSurahId: number | null;
    lastReadAyahNumber?: number;
    onBack: () => void;
    darkMode?: boolean;
}

const QuranLibrary: React.FC<QuranLibraryProps> = ({ surahs, onOpenSurah, lastReadSurahId, lastReadAyahNumber, onBack, darkMode = false }) => {
  const pal = paletteFor(darkMode);
    const lang = useSettingsStore(s => s.language); // re-render on language change
    const [activeTab, setActiveTab] = useState<'surah' | 'juz' | 'search'>('surah');
    const [revelationFilter, setRevelationFilter] = useState<'all' | 'Meccan' | 'Medinan'>('all');

    const handleBack = () => {
        if (activeTab !== 'surah') {
            setActiveTab('surah');
        } else {
            onBack();
        }
    };

    const bgColor = pal.bg;
    const cardBg = pal.card;
    const borderColor = pal.border;
    const textPrimary = pal.text;
    const textSecondary = pal.textSecondary;

    const juzs = useMemo(() =>
        Array.from({ length: 30 }, (_, i) => {
            const start = JUZ_START[i];
            const surahName = surahs.find(s => s.number === start.surah)?.englishName ?? '';
            return { id: i + 1, label: t('library.juzLabel', { n: i + 1 }), surahName, surahNumber: start.surah, ayah: start.ayah };
        }),
        [surahs, lang]
    );

    const filteredSurahs = useMemo(() =>
        revelationFilter === 'all'
            ? surahs
            : surahs.filter(s => s.revelationType === revelationFilter),
        [surahs, revelationFilter]
    );

    const lastReadSurah = useMemo(() =>
        surahs.find(s => s.number === lastReadSurahId),
        [surahs, lastReadSurahId]);

    const renderSurahItem = ({ item: surah }: { item: Surah }) => (
        <TouchableOpacity
            onPress={() => onOpenSurah(surah.number)}
            style={[styles.surahCard, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.9}
        >
            <View style={[styles.surahNumber, { backgroundColor: darkMode ? '#0f172a' : '#fafaf9' }]}>
                <Text style={[styles.surahNumberText, { color: pal.accent }]}>
                    {surah.number}
                </Text>
            </View>

            <View style={styles.surahInfo}>
                <View style={styles.surahNameRow}>
                    <Text style={[styles.surahName, { color: textPrimary }]}>{surah.englishName}</Text>
                    <Text style={[styles.surahArabic, { color: pal.accent }]}>
                        {surah.name}
                    </Text>
                </View>
                <View style={styles.surahMeta}>
                    <Text style={[styles.surahMetaText, { color: textSecondary }]}>
                        {surah.revelationType === 'Meccan' ? t('quran.mecca') : t('quran.medina')}
                    </Text>
                    <View style={[styles.metaDot, { backgroundColor: darkMode ? '#475569' : '#d6d3d1' }]} />
                    <Text style={[styles.surahMetaText, { color: textSecondary }]}>{t('quran.ayahCount', { count: surah.numberOfAyahs })}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderJuzItem = ({ item: juz }: { item: { id: number; label: string; surahName: string; surahNumber: number; ayah: number } }) => (
        <TouchableOpacity
            onPress={() => onOpenSurah(juz.surahNumber, juz.ayah)}
            style={[styles.juzCard, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.9}
        >
            <View style={[styles.juzNumber, { backgroundColor: darkMode ? '#0f172a' : '#ecfdf5' }]}>
                <Text style={[styles.juzNumberText, { color: pal.accent }]}>{juz.id}</Text>
            </View>
            <Text style={[styles.juzLabel, { color: textPrimary }]}>{juz.label}</Text>
            <Text style={[styles.juzAction, { color: textSecondary }]} numberOfLines={1}>{juz.surahName}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={handleBack}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.back')}
                        style={[styles.backButton, { backgroundColor: pal.cardAlt }]}
                    >
                        <ChevronLeft size={24} color={textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: pal.accentText }]}>
                        {t('library.title')}
                    </Text>
                </View>

                {/* Revelation Filter — sadece Sureler tabında */}
                {activeTab === 'surah' && (
                    <View style={styles.filterRow}>
                        {(['all', 'Meccan', 'Medinan'] as const).map((type) => {
                            const label = type === 'all' ? t('common.all') : type === 'Meccan' ? t('library.meccan') : t('library.medinan');
                            const isActive = revelationFilter === type;
                            const iconColor = isActive ? '#10b981' : textSecondary;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setRevelationFilter(type)}
                                    style={[
                                        styles.filterChip,
                                        isActive
                                            ? { backgroundColor: pal.accentSoft, borderColor: '#10b981' }
                                            : { backgroundColor: pal.cardAlt, borderColor: pal.borderStrong }
                                    ]}
                                >
                                    <Text style={[styles.filterChipText, { color: isActive ? '#10b981' : textSecondary }]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Tabs */}
                <View style={[styles.tabs, { backgroundColor: pal.cardAlt }]}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('surah')}
                        style={[
                            styles.tab,
                            activeTab === 'surah' && [styles.tabActive, { backgroundColor: cardBg }]
                        ]}
                    >
                        <List size={16} color={activeTab === 'surah' ? '#047857' : textSecondary} />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'surah' ? '#047857' : textSecondary }
                        ]}>{t('quran.surahs')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('juz')}
                        style={[
                            styles.tab,
                            activeTab === 'juz' && [styles.tabActive, { backgroundColor: cardBg }]
                        ]}
                    >
                        <LayoutGrid size={16} color={activeTab === 'juz' ? '#047857' : textSecondary} />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'juz' ? '#047857' : textSecondary }
                        ]}>{t('quran.juz')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('search')}
                        style={[
                            styles.tab,
                            activeTab === 'search' && [styles.tabActive, { backgroundColor: cardBg }]
                        ]}
                    >
                        <Search size={16} color={activeTab === 'search' ? '#047857' : textSecondary} />
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'search' ? '#047857' : textSecondary }
                        ]}>{t('library.searchTab')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            {activeTab === 'surah' ? (
                <FlatList
                    key="surah-list"
                    data={filteredSurahs}
                    keyExtractor={(item) => item.number.toString()}
                    renderItem={renderSurahItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                        <KhatmCard />
                        {lastReadSurah ? (
                            <TouchableOpacity
                                onPress={() => onOpenSurah(lastReadSurah.number, lastReadAyahNumber)}
                                style={styles.lastReadCard}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#064e3b', '#022c22']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.lastReadGradient}
                                >
                                    <View style={styles.lastReadBadge}>
                                        <Text style={styles.lastReadBadgeText}>{t('library.lastReadBadge')}</Text>
                                    </View>

                                    <View style={styles.lastReadContent}>
                                        <View>
                                            <Text style={styles.lastReadTitle}>{lastReadSurah.englishName}</Text>
                                            <Text style={styles.lastReadSubtitle}>{t('library.continueHint')}</Text>
                                        </View>
                                        <View style={styles.lastReadIcon}>
                                            <BookOpen size={18} color="#ffffff" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : null}
                        </>
                    }
                />
            ) : activeTab === 'juz' ? (
                <FlatList
                    key="juz-list"
                    data={juzs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderJuzItem}
                    numColumns={2}
                    columnWrapperStyle={styles.juzRow}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <GlobalSearch onOpenSurah={onOpenSurah} darkMode={darkMode} />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '700',
    },
    filterIcon: {
        fontSize: 16,
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    tabs: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
    },
    listContent: {
        padding: 24,
        gap: 12,
    },
    lastReadCard: {
        borderRadius: 32,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#064e3b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    lastReadGradient: {
        padding: 24,
    },
    lastReadBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
    },
    lastReadBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#d1fae5',
        letterSpacing: 1,
    },
    lastReadContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    lastReadTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    lastReadSubtitle: {
        fontSize: 14,
        color: 'rgba(167,243,208,0.6)',
    },
    lastReadIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    surahCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 8,
    },
    surahNumber: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    surahNumberText: {
        fontSize: 14,
        fontWeight: '700',
    },
    surahInfo: {
        flex: 1,
    },
    surahNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    surahName: {
        fontSize: 16,
        fontWeight: '700',
    },
    surahArabic: {
        fontSize: 24,
        fontFamily: 'ScheherazadeNew_400Regular',
    },
    surahMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    surahMetaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    metaDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    juzRow: {
        gap: 12,
    },
    juzCard: {
        width: JUZ_CARD_WIDTH,
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
    },
    juzNumber: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    juzNumberText: {
        fontSize: 16,
        fontWeight: '800',
    },
    juzLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    juzAction: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default QuranLibrary;