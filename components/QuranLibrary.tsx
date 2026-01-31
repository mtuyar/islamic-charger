import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Surah } from '../types';
import { Search, BookOpen, ChevronLeft, LayoutGrid, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const JUZ_CARD_WIDTH = (width - 48 - 12) / 2;

interface QuranLibraryProps {
    surahs: Surah[];
    onOpenSurah: (id: number) => void;
    lastReadSurahId: number | null;
    onBack: () => void;
    darkMode?: boolean;
}

const QuranLibrary: React.FC<QuranLibraryProps> = ({ surahs, onOpenSurah, lastReadSurahId, onBack, darkMode = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'surah' | 'juz'>('surah');

    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#f5f5f4';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';
    const inputBg = darkMode ? '#0f172a' : '#ffffff';

    const juzs = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ id: i + 1, label: `${i + 1}. Cüz` })), []);

    const filteredSurahs = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return surahs;
        return surahs.filter(s =>
            s.englishName.toLowerCase().includes(query) ||
            s.name.includes(query) ||
            s.number.toString() === query
        );
    }, [surahs, searchQuery]);

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
                <Text style={[styles.surahNumberText, { color: darkMode ? '#34d399' : '#047857' }]}>
                    {surah.number}
                </Text>
            </View>

            <View style={styles.surahInfo}>
                <View style={styles.surahNameRow}>
                    <Text style={[styles.surahName, { color: textPrimary }]}>{surah.englishName}</Text>
                    <Text style={[styles.surahArabic, { color: darkMode ? '#475569' : '#d6d3d1' }]}>
                        {surah.name}
                    </Text>
                </View>
                <View style={styles.surahMeta}>
                    <Text style={[styles.surahMetaText, { color: textSecondary }]}>
                        {surah.revelationType === 'Meccan' ? 'Mekke' : 'Medine'}
                    </Text>
                    <View style={[styles.metaDot, { backgroundColor: darkMode ? '#475569' : '#d6d3d1' }]} />
                    <Text style={[styles.surahMetaText, { color: textSecondary }]}>{surah.numberOfAyahs} Ayet</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderJuzItem = ({ item: juz }: { item: { id: number; label: string } }) => (
        <TouchableOpacity
            onPress={() => onOpenSurah(1)}
            style={[styles.juzCard, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.9}
        >
            <Text style={[styles.juzLabel, { color: textPrimary }]}>{juz.label}</Text>
            <Text style={[styles.juzAction, { color: textSecondary }]}>Başla</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={onBack}
                        style={[styles.backButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
                    >
                        <ChevronLeft size={24} color={textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: darkMode ? '#34d399' : '#022c22' }]}>
                        Kuran Kütüphanesi
                    </Text>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchInput, { backgroundColor: inputBg, borderColor }]}>
                        <Search size={20} color={textSecondary} />
                        <TextInput
                            placeholder="Sure veya cüz ara..."
                            placeholderTextColor={textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={[styles.searchTextInput, { color: textPrimary }]}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabs, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}>
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
                        ]}>Sureler</Text>
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
                        ]}>Cüzler</Text>
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
                        !searchQuery && lastReadSurah ? (
                            <TouchableOpacity
                                onPress={() => onOpenSurah(lastReadSurah.number)}
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
                                        <Text style={styles.lastReadBadgeText}>SON OKUNAN</Text>
                                    </View>

                                    <View style={styles.lastReadContent}>
                                        <View>
                                            <Text style={styles.lastReadTitle}>{lastReadSurah.englishName}</Text>
                                            <Text style={styles.lastReadSubtitle}>Kaldığınız yerden devam edin</Text>
                                        </View>
                                        <View style={styles.lastReadIcon}>
                                            <BookOpen size={18} color="#ffffff" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : null
                    }
                />
            ) : (
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
    searchContainer: {
        marginBottom: 16,
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
        marginBottom: 12,
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
        fontSize: 20,
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
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 12,
    },
    juzLabel: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    juzAction: {
        fontSize: 12,
        fontWeight: '500',
    },
});

export default QuranLibrary;