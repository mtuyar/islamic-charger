import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, Search, ChevronRight, List } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hadithService, HadithCollection, HadithChapter } from '../services/hadith';

interface HadithChaptersProps {
    collection: HadithCollection;
    onSelectChapter: (chapter: HadithChapter) => void;
    onBack: () => void;
    darkMode: boolean;
}

const HadithChapters: React.FC<HadithChaptersProps> = ({ collection, onSelectChapter, onBack, darkMode }) => {
    const [chapters, setChapters] = useState<HadithChapter[]>([]);
    const [filteredChapters, setFilteredChapters] = useState<HadithChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#e5e7eb';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';
    const inputBg = darkMode ? '#1e293b' : '#f5f5f4';

    useEffect(() => {
        loadChapters();
    }, [collection.id]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredChapters(chapters);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = chapters.filter(chapter =>
                chapter.name.toLowerCase().includes(query) ||
                chapter.sectionId.includes(query)
            );
            setFilteredChapters(filtered);
        }
    }, [searchQuery, chapters]);

    const loadChapters = async () => {
        setLoading(true);
        const data = await hadithService.getChapters(collection.id);
        setChapters(data);
        setFilteredChapters(data);
        setLoading(false);
    };

    const renderItem = ({ item }: { item: HadithChapter }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            onPress={() => onSelectChapter(item)}
        >
            <View style={[styles.numberBadge, { backgroundColor: darkMode ? '#334155' : '#f5f5f4' }]}>
                <Text style={[styles.numberText, { color: textSecondary }]}>{item.sectionId}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.chapterName, { color: textPrimary }]}>{item.name}</Text>
                {item.hadithCount && (
                    <Text style={[styles.hadithCount, { color: textSecondary }]}>
                        {item.hadithCount} Hadis
                    </Text>
                )}
            </View>
            <ChevronRight size={20} color={textSecondary} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={[styles.backButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
                >
                    <ArrowLeft size={24} color={textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.collectionTitle, { color: textSecondary }]}>
                        {collection.name}
                    </Text>
                    <Text style={[styles.title, { color: darkMode ? '#34d399' : '#022c22' }]}>
                        Bölümler
                    </Text>
                </View>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { borderBottomColor: borderColor }]}>
                <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
                    <Search size={20} color={textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: textPrimary }]}
                        placeholder="Bölüm ara..."
                        placeholderTextColor={textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <FlatList
                    data={filteredChapters}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.sectionId}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: textSecondary }]}>
                                Bölüm bulunamadı.
                            </Text>
                        </View>
                    }
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    collectionTitle: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    searchContainer: {
        padding: 16,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 12,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    numberBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberText: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    cardContent: {
        flex: 1,
    },
    chapterName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    hadithCount: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
});

export default HadithChapters;
