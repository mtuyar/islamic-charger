import { paletteFor } from '../theme';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Share, ToastAndroid, Platform, Alert } from 'react-native';
import { ArrowLeft, Share2, Bookmark, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hadithService, HadithCollection, HadithChapter, Hadith, collectionName, chapterDisplayName } from '../services/hadith';
import { SavedHadith, ReadEntry } from '../types';
import { StateView } from './ui';
import { useIsOnline } from '../hooks/useNetwork';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';

interface HadithReaderProps {
    collection: HadithCollection;
    chapter: HadithChapter;
    onBack: () => void;
    darkMode: boolean;
    onSaveHadith?: (hadith: SavedHadith) => void;
    savedHadithIds?: string[];
    onMarkRead?: (entry: ReadEntry) => void;
    initialHadithNumber?: string | number;
}

const HadithReader: React.FC<HadithReaderProps> = ({
    collection,
    chapter,
    onBack,
    darkMode,
    onSaveHadith,
    savedHadithIds = [],
    onMarkRead,
    initialHadithNumber
}) => {
  const pal = paletteFor(darkMode);
    const [hadiths, setHadiths] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const online = useIsOnline();
    useSettingsStore(s => s.language); // re-render on language change
    const listRef = useRef<FlatList>(null);
    const [scrolledToInitial, setScrolledToInitial] = useState(false);

    const bgColor = pal.bg;
    const cardBg = pal.card;
    const borderColor = pal.borderStrong;
    const textSecondary = pal.textSecondary;
    const hadithText = pal.text;

    useEffect(() => {
        loadHadiths();
    }, [collection.id, chapter.sectionId]);

    useEffect(() => {
        if (!loading && hadiths.length > 0 && initialHadithNumber && !scrolledToInitial) {
            const index = hadiths.findIndex(h => h.hadithnumber == initialHadithNumber);
            if (index >= 0) {
                setTimeout(() => {
                    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
                }, 400);
            }
            setScrolledToInitial(true);
        }
    }, [loading, hadiths, initialHadithNumber, scrolledToInitial]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const topItem = viewableItems[0].item;
            if (onMarkRead) {
                onMarkRead({
                    id: `${collection.id}_${chapter.sectionId}`,
                    collectionId: collection.id,
                    collectionName: collection.name,
                    chapterId: chapter.sectionId,
                    chapterName: chapter.name,
                    readAt: Date.now(),
                    hadithNumber: topItem.hadithnumber
                });
            }
        }
    }).current;

    const onScrollToIndexFailed = (info: any) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: true });
        });
    };

    const loadHadiths = async () => {
        setLoading(true);
        setLoadFailed(false);
        const data = await hadithService.getHadithsForChapter(collection.id, chapter.sectionId);
        setHadiths(data);
        // getHadithsForChapter() returns [] when the network fetch fails
        setLoadFailed(data.length === 0);
        setLoading(false);
    };

    const handleBookmark = (item: Hadith) => {
        if (!onSaveHadith) return;
        const id = `${collection.id}_${item.hadithnumber}`;
        onSaveHadith({
            id,
            collectionId: collection.id,
            collectionName: collection.name,
            chapterId: chapter.sectionId,
            chapterName: chapter.name,
            hadithnumber: item.hadithnumber,
            text: item.text,
            savedAt: Date.now(),
        });
    };

    const shareText = (hadith: Hadith) =>
        `"${hadith.text}"\n\n${collectionName(collection)}, ${chapterDisplayName(chapter)}, ${t('hadith.numberRef', { number: hadith.hadithnumber })}`;

    const handleShare = async (hadith: Hadith) => {
        try {
            await Share.share({
                message: shareText(hadith),
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleCopy = async (hadith: Hadith) => {
        const text = shareText(hadith);
        await Clipboard.setStringAsync(text);
        if (Platform.OS === 'android') {
            ToastAndroid.show(t('hadith.copied'), ToastAndroid.SHORT);
        }
    };

    const renderItem = ({ item }: { item: Hadith }) => {
        const hadithId = `${collection.id}_${item.hadithnumber}`;
        const isSaved = savedHadithIds.includes(hadithId);
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                    <View style={[styles.numberBadge, { backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }]}>
                        <Text style={[styles.numberText, { color: pal.accent }]}>
                            {item.hadithnumber}
                        </Text>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, isSaved && styles.actionButtonActive]}
                            accessibilityLabel={t('a11y.bookmark')}
                            onPress={() => handleBookmark(item)}
                        >
                            <Bookmark
                                size={20}
                                color={isSaved ? '#059669' : textSecondary}
                                fill={isSaved ? '#059669' : 'transparent'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCopy(item)}
                            accessibilityLabel={t('common.copy')}
                        >
                            <Copy size={20} color={textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleShare(item)}
                            accessibilityLabel={t('a11y.share')}
                        >
                            <Share2 size={20} color={textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    {item.arabicText && (
                        <Text style={[styles.arabicText, { color: pal.text }]} selectable>
                            {item.arabicText}
                        </Text>
                    )}
                    <Text style={[styles.hadithContent, { color: hadithText }]} selectable>
                        {item.text}
                    </Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                    <Text style={[styles.reference, { color: textSecondary }]}>
                        {collectionName(collection)} • {chapterDisplayName(chapter)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <TouchableOpacity
                    onPress={onBack}
                    accessibilityLabel={t('a11y.back')}
                    style={[styles.backButton, { backgroundColor: pal.cardAlt }]}
                >
                    <ArrowLeft size={24} color={textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.collectionTitle, { color: textSecondary }]} numberOfLines={1}>
                        {collectionName(collection)}
                    </Text>
                    <Text style={[styles.title, { color: pal.accentText }]} numberOfLines={1}>
                        {chapterDisplayName(chapter)}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : loadFailed ? (
                <View style={styles.loadingContainer}>
                    <StateView
                        kind={online ? 'error' : 'offline'}
                        message={t('common.loadFailed')}
                        onRetry={loadHadiths}
                    />
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={hadiths}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.hadithnumber}-${index}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 300 }}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    initialNumToRender={5}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    ListHeaderComponent={
                        <View style={[styles.chapterSummary, { backgroundColor: darkMode ? '#1e293b' : '#f0fdf4', borderColor: darkMode ? '#334155' : '#bbf7d0' }]}>
                            <Text style={[styles.chapterSummaryTitle, { color: pal.accentText }]}>
                                {chapterDisplayName(chapter)}
                            </Text>
                            <Text style={[styles.chapterSummaryMeta, { color: darkMode ? '#94a3b8' : '#6b7280' }]}>
                                {collectionName(collection)} • {t('hadith.count', { count: hadiths.length })}
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
    actionButtonActive: {
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        borderRadius: 8,
    },
    cardContent: {
        padding: 24,
    },
    hadithContent: {
        fontSize: 17,
        lineHeight: 28,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'left',
    },
    arabicText: {
        fontSize: 22,
        lineHeight: 40,
        fontFamily: 'ScheherazadeNew_400Regular',
        textAlign: 'right',
        marginBottom: 16,
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
    chapterSummary: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    chapterSummaryTitle: {
        fontSize: 16,
        fontWeight: "700",
        fontFamily: "PlusJakartaSans_700Bold",
        marginBottom: 4,
    },
    chapterSummaryMeta: {
        fontSize: 12,
        fontFamily: "PlusJakartaSans_500Medium",
    },
});

export default HadithReader;
