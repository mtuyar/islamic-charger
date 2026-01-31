import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hadithService, HadithCollection, HadithChapter, Hadith } from '../services/hadith';

interface HadithReaderProps {
    collection: HadithCollection;
    chapter: HadithChapter;
    onBack: () => void;
    darkMode: boolean;
}

const HadithReader: React.FC<HadithReaderProps> = ({ collection, chapter, onBack, darkMode }) => {
    const [hadiths, setHadiths] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#e5e7eb';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';
    const hadithText = darkMode ? '#e2e8f0' : '#334155';

    useEffect(() => {
        loadHadiths();
    }, [collection.id, chapter.sectionId]);

    const loadHadiths = async () => {
        setLoading(true);
        const data = await hadithService.getHadithsForChapter(collection.id, chapter.sectionId);
        setHadiths(data);
        setLoading(false);
    };

    const handleShare = async (hadith: Hadith) => {
        try {
            await Share.share({
                message: `"${hadith.text}"\n\n${collection.name}, ${chapter.name}, No: ${hadith.hadithnumber}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item, index }: { item: Hadith; index: number }) => (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                <View style={[styles.numberBadge, { backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }]}>
                    <Text style={[styles.numberText, { color: darkMode ? '#34d399' : '#059669' }]}>
                        {item.hadithnumber}
                    </Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleShare(item)}
                    >
                        <Share2 size={20} color={textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={[styles.hadithContent, { color: hadithText }]}>
                    {item.text}
                </Text>
            </View>

            <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                <Text style={[styles.reference, { color: textSecondary }]}>
                    {collection.name} • {chapter.name}
                </Text>
            </View>
        </View>
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
                    <Text style={[styles.collectionTitle, { color: textSecondary }]} numberOfLines={1}>
                        {collection.name}
                    </Text>
                    <Text style={[styles.title, { color: darkMode ? '#34d399' : '#022c22' }]} numberOfLines={1}>
                        {chapter.name}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={hadiths}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.hadithnumber}-${index}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={5}
                    maxToRenderPerBatch={10}
                    windowSize={5}
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
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 20,
        gap: 24,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    numberBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    numberText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
    },
    cardContent: {
        padding: 24,
    },
    hadithContent: {
        fontSize: 17,
        lineHeight: 28,
        fontFamily: 'PlusJakartaSans_500Medium', // Changed to Latin font for better Turkish support
        textAlign: 'left',
    },
    cardFooter: {
        padding: 16,
        borderTopWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    reference: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
    },
});

export default HadithReader;
