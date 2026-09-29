import { paletteFor } from '../theme';
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { Search, BookOpen, ChevronDown } from 'lucide-react-native';
import { hadithService, COLLECTIONS, HadithCollection, Hadith, HadithChapter, collectionName } from '../services/hadith';
import { t, currentLanguage } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

interface HadithSearchProps {
    onSelectCollection: (collection: HadithCollection) => void;
    onOpenChapter?: (collection: HadithCollection, chapter: HadithChapter, hadithNumber?: string | number) => void;
    darkMode: boolean;
}

const HadithSearch: React.FC<HadithSearchProps> = ({ onSelectCollection, onOpenChapter, darkMode }) => {
  useSettingsStore(s => s.language); // re-render on language change
  const pal = paletteFor(darkMode);
    const [query, setQuery] = useState('');
    const [selectedCollection, setSelectedCollection] = useState<HadithCollection>(COLLECTIONS[0]);
    const [showPicker, setShowPicker] = useState(false);
    const [results, setResults] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const bgColor = pal.bg;
    const cardBg = pal.card;
    const borderColor = pal.borderStrong;
    const textPrimary = pal.text;
    const textSecondary = pal.textSecondary;
    const inputBg = pal.card;
    const accentColor = '#059669';

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        const data = await hadithService.searchInCollection(selectedCollection.id, query.trim());
        setResults(data);
        setLoading(false);
    };

    const handleOpenChapter = async (item: Hadith) => {
        const bookId = item.reference?.book?.toString();
        if (bookId && onOpenChapter) {
            const chapters = await hadithService.getChapters(selectedCollection.id);
            const chapter = chapters.find(c => c.sectionId === bookId);
            if (chapter) {
                onOpenChapter(selectedCollection, chapter, item.hadithnumber);
                return;
            }
        }
        onSelectCollection(selectedCollection);
    };

    const renderItem = ({ item }: { item: Hadith }) => (
        <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.resultHeader, { borderBottomColor: borderColor }]}>
                <View style={[styles.numberBadge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    <Text style={[styles.numberText, { color: accentColor }]}>
                        #{item.hadithnumber}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.goButton, { backgroundColor: pal.border }]}
                    onPress={() => handleOpenChapter(item)}
                >
                    <BookOpen size={14} color={accentColor} />
                    <Text style={[styles.goButtonText, { color: accentColor }]}>{t('hadith.openChapter')}</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.hadithText, { color: pal.text }]}>
                {item.text}
            </Text>
            <View style={[styles.resultFooter, { borderTopColor: borderColor }]}>
                <Text style={[styles.resultRef, { color: textSecondary }]}>
                    {collectionName(selectedCollection)} • {t('hadith.numberRef', { number: item.hadithnumber })}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Collection Picker */}
            <TouchableOpacity
                style={[styles.picker, { backgroundColor: cardBg, borderColor }]}
                onPress={() => setShowPicker(v => !v)}
            >
                <Text style={[styles.pickerLabel, { color: textSecondary }]}>{t('hadith.collection')}</Text>
                <View style={styles.pickerRight}>
                    <Text style={[styles.pickerValue, { color: textPrimary }]} numberOfLines={1}>
                        {collectionName(selectedCollection)}
                    </Text>
                    <ChevronDown size={18} color={textSecondary} />
                </View>
            </TouchableOpacity>

            {showPicker && (
                <View style={[styles.pickerList, { backgroundColor: cardBg, borderColor }]}>
                    {COLLECTIONS.map(col => (
                        <TouchableOpacity
                            key={col.id}
                            style={[
                                styles.pickerItem,
                                { borderBottomColor: borderColor },
                                selectedCollection.id === col.id && {
                                    backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5'
                                }
                            ]}
                            onPress={() => {
                                setSelectedCollection(col);
                                setShowPicker(false);
                                setResults([]);
                                setSearched(false);
                            }}
                        >
                            <Text style={[
                                styles.pickerItemText,
                                { color: selectedCollection.id === col.id ? accentColor : textPrimary }
                            ]}>
                                {collectionName(col)}
                            </Text>
                            <Text style={[styles.pickerItemSub, { color: textSecondary }]}>
                                {t('hadith.count', { count: col.totalHadiths.toLocaleString(currentLanguage() === 'tr' ? 'tr-TR' : 'en-US') })}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Search Input */}
            <View style={styles.searchRow}>
                <View style={[styles.searchInput, { backgroundColor: inputBg, borderColor }]}>
                    <Search size={18} color={textSecondary} />
                    <TextInput
                        style={[styles.searchTextInput, { color: textPrimary }]}
                        placeholder={t('hadith.searchPlaceholder')}
                        placeholderTextColor={textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    style={[styles.searchButton, { opacity: query.trim() ? 1 : 0.5 }]}
                    onPress={handleSearch}
                    disabled={!query.trim()}
                >
                    <Text style={styles.searchButtonText}>{t('common.search')}</Text>
                </TouchableOpacity>
            </View>

            {/* Results */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                    <Text style={[styles.loadingText, { color: textSecondary }]}>
                        {t('hadith.collectionLoading', { name: collectionName(selectedCollection) })}
                    </Text>
                </View>
            ) : searched && results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: textSecondary }]}>
                        {t('hadith.noResults')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.hadithnumber}-${index}`}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    ListHeaderComponent={
                        results.length > 0 ? (
                            <Text style={[styles.resultCount, { color: textSecondary }]}>
                                {t('hadith.resultCount', { count: results.length })}
                            </Text>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    picker: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginRight: 8,
    },
    pickerRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    pickerValue: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
        textAlign: 'right',
    },
    pickerList: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
        overflow: 'hidden',
    },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    pickerItemText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 2,
    },
    pickerItemSub: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: 14,
        borderWidth: 1,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    searchButton: {
        backgroundColor: '#059669',
        borderRadius: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 60,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    emptyContainer: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    list: {
        gap: 16,
        paddingBottom: 40,
    },
    resultCount: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        letterSpacing: 0.5,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    resultCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
    },
    numberBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    numberText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    goButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    goButtonText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    hadithText: {
        fontSize: 15,
        lineHeight: 26,
        fontFamily: 'PlusJakartaSans_500Medium',
        padding: 16,
    },
    resultFooter: {
        padding: 10,
        paddingHorizontal: 14,
        borderTopWidth: 1,
    },
    resultRef: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
});

export default HadithSearch;
