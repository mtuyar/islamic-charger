import { paletteFor } from '../theme';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SearchResult } from '../types';
import { searchQuran, TURKISH_SURAH_NAMES } from '../services/api';
import { Search, ArrowRight } from 'lucide-react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';

interface GlobalSearchProps {
    onOpenSurah: (surahId: number, startAyah?: number) => void;
    darkMode?: boolean;
}

const SURAH_REF_RE = /^(\d{1,3}):(\d{1,3})$/;

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onOpenSurah, darkMode = false }) => {
  const pal = paletteFor(darkMode);
    useSettingsStore(s => s.language); // re-render on language change
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const bgColor = pal.bg;
    const cardBg = pal.card;
    const inputBg = pal.card;
    const borderColor = darkMode ? '#334155' : '#f0f0ef';
    const textColor = darkMode ? '#f1f5f9' : '#1c1917';
    const subTextColor = pal.textSecondary;
    const accentColor = '#047857';
    const arabicColor = pal.accentText;

    const handleSearch = async () => {
        const q = query.trim();
        if (!q) return;

        // "2:255" direkt ayet atla
        const ref = SURAH_REF_RE.exec(q);
        if (ref) {
            const surahNo = parseInt(ref[1], 10);
            const ayahNo = parseInt(ref[2], 10);
            if (surahNo >= 1 && surahNo <= 114 && ayahNo >= 1) {
                onOpenSurah(surahNo, ayahNo);
                return;
            }
        }

        setLoading(true);
        setSearched(true);
        const isArabic = /[؀-ۿ]/.test(q);
        const data = await searchQuran(q, isArabic ? 'ar' : 'tr');
        setResults(data);
        setLoading(false);
    };

    const renderItem = ({ item }: { item: SearchResult }) => {
        const surahName = TURKISH_SURAH_NAMES[item.surah.number] || item.surah.englishName;
        return (
            <TouchableOpacity
                style={[styles.resultCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => onOpenSurah(item.surah.number, item.numberInSurah)}
                activeOpacity={0.9}
            >
                <View style={styles.resultHeader}>
                    <View style={styles.resultMeta}>
                        <Text style={[styles.surahName, { color: textColor }]}>{surahName}</Text>
                        <Text style={[styles.surahArabic, { color: arabicColor }]}>{item.surah.name}</Text>
                    </View>
                    <View style={[styles.ayahBadge, { backgroundColor: pal.accentSoft }]}>
                        <Text style={[styles.ayahBadgeText, { color: accentColor }]}>{t('globalSearch.verseBadge', { n: item.numberInSurah })}</Text>
                    </View>
                </View>

                {item.arabicText ? (
                    <Text style={[styles.arabicText, { color: arabicColor }]} numberOfLines={2}>
                        {item.arabicText}
                    </Text>
                ) : null}

                {item.turkishText ? (
                    <Text style={[styles.turkishText, { color: subTextColor }]} numberOfLines={3}>
                        {item.turkishText}
                    </Text>
                ) : (
                    <Text style={[styles.turkishText, { color: subTextColor }]} numberOfLines={3}>
                        {item.text}
                    </Text>
                )}

                <View style={styles.resultFooter}>
                    <ArrowRight size={14} color={accentColor} />
                    <Text style={[styles.openText, { color: accentColor }]}>{t('globalSearch.openSurah')}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                {/* Arama kutusu */}
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor }]}>
                    <Search size={18} color={subTextColor} />
                    <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder={t('globalSearch.placeholder')}
                        placeholderTextColor={subTextColor}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton} accessibilityRole="button" accessibilityLabel={t('common.search')}>
                        <Search size={18} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* İpucu */}
                {!searched && (
                    <View style={styles.hintContainer}>
                        <Text style={[styles.hintText, { color: subTextColor }]}>
                            {t('globalSearch.hintBefore')}
                            <Text style={{ color: accentColor, fontWeight: '700' }}>2:255</Text>
                            {t('globalSearch.hintAfter')}
                        </Text>
                    </View>
                )}

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={accentColor} />
                        <Text style={[styles.loadingText, { color: subTextColor }]}>{t('globalSearch.searching')}</Text>
                    </View>
                ) : searched && results.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={[styles.emptyText, { color: subTextColor }]}>{t('globalSearch.noResults')}</Text>
                        <Text style={[styles.emptyHint, { color: subTextColor }]}>{t('globalSearch.tryAnother')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.number.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        ListHeaderComponent={
                            results.length > 0 ? (
                                <Text style={[styles.resultCount, { color: subTextColor }]}>
                                    {t('globalSearch.resultCount', { count: results.length })}
                                </Text>
                            ) : null
                        }
                    />
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    searchButton: {
        backgroundColor: '#047857',
        padding: 8,
        borderRadius: 10,
    },
    hintContainer: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    hintText: {
        fontSize: 13,
        lineHeight: 20,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 12,
    },
    resultCount: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    resultCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    resultMeta: {
        flex: 1,
        gap: 2,
    },
    surahName: {
        fontSize: 15,
        fontWeight: '700',
    },
    surahArabic: {
        fontSize: 16,
        fontFamily: 'ScheherazadeNew_400Regular',
    },
    ayahBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 8,
    },
    ayahBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    arabicText: {
        fontSize: 20,
        fontFamily: 'ScheherazadeNew_400Regular',
        textAlign: 'right',
        lineHeight: 36,
    },
    turkishText: {
        fontSize: 14,
        lineHeight: 22,
    },
    resultFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    openText: {
        fontSize: 13,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 60,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyHint: {
        fontSize: 13,
    },
});

export default GlobalSearch;
