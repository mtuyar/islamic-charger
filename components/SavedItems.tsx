import { paletteFor } from '../theme';
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, StyleSheet,
    Alert,
} from 'react-native';
import { ArrowLeft, Bookmark, BookOpen, Clock, Trash2, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavedAyah, SavedHadith, ReadEntry } from '../types';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';
import { collectionName } from '../services/hadith';

interface SavedItemsProps {
    savedAyahs: SavedAyah[];
    savedHadiths: SavedHadith[];
    readEntries: ReadEntry[];
    onRemoveSavedAyah: (id: string) => void;
    onRemoveSavedHadith: (id: string) => void;
    onClearReadEntries: () => void;
    onOpenSurah: (surahId: number, startAyah?: number) => void;
    onOpenHadithChapter?: (collectionId: string, chapterId: string, chapterName: string, hadithNumber?: string | number) => void;
    onBack: () => void;
    darkMode: boolean;
}

type Tab = 'ayah' | 'hadith' | 'read';

const SavedItems: React.FC<SavedItemsProps> = ({
    savedAyahs,
    savedHadiths,
    readEntries,
    onRemoveSavedAyah,
    onRemoveSavedHadith,
    onClearReadEntries,
    onOpenSurah,
    onOpenHadithChapter,
    onBack,
    darkMode,
}) => {
  const pal = paletteFor(darkMode);
    const lang = useSettingsStore(s => s.language); // re-render on language change
    const [activeTab, setActiveTab] = useState<Tab>('ayah');

    const bgColor = pal.bg;
    const cardBg = pal.card;
    const borderColor = pal.borderStrong;
    const textPrimary = pal.text;
    const textSecondary = pal.textSecondary;
    const accentColor = '#059669';

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const renderAyah = ({ item }: { item: SavedAyah }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            onPress={() => onOpenSurah(item.surahNumber, item.ayahNumber)}
            activeOpacity={0.85}
        >
            <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                <View style={[styles.badge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>
                        {t('saved.ayahBadge', { surah: item.surahName, ayah: item.ayahNumber })}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <Text style={[styles.dateText, { color: textSecondary }]}>{formatDate(item.savedAt)}</Text>
                    <TouchableOpacity
                        onPress={() => onRemoveSavedAyah(item.id)}
                        style={styles.deleteButton}
                    >
                        <Trash2 size={16} color={darkMode ? '#ef4444' : '#dc2626'} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text
                style={[styles.arabicText, { color: pal.text }]}
                numberOfLines={2}
            >
                {item.arabic}
            </Text>
            <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                <Text style={[styles.turkishText, { color: textSecondary }]} numberOfLines={2}>
                    {item.turkish}
                </Text>
                <ChevronRight size={16} color={textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const renderHadith = ({ item }: { item: SavedHadith }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.85}
            onPress={() => {
                if (onOpenHadithChapter && item.chapterId) {
                    onOpenHadithChapter(item.collectionId, item.chapterId, item.chapterName, item.hadithnumber);
                }
            }}
        >
            <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                <View style={[styles.badge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>
                        {collectionName({ id: item.collectionId, name: item.collectionName })} #{item.hadithnumber}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <Text style={[styles.dateText, { color: textSecondary }]}>{formatDate(item.savedAt)}</Text>
                    <TouchableOpacity
                        onPress={() => onRemoveSavedHadith(item.id)}
                        style={styles.deleteButton}
                    >
                        <Trash2 size={16} color={darkMode ? '#ef4444' : '#dc2626'} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={[styles.hadithText, { color: pal.text }]} numberOfLines={4}>
                {item.text}
            </Text>
            <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                <Text style={[styles.refText, { color: textSecondary }]}>
                    {item.chapterName}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderRead = ({ item }: { item: ReadEntry }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            onPress={() => onOpenHadithChapter && onOpenHadithChapter(item.collectionId, item.chapterId, item.chapterName, item.hadithNumber)}
            activeOpacity={0.85}
        >
            <View style={styles.readCardInner}>
                <View style={[styles.readIcon, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    <BookOpen size={18} color={accentColor} />
                </View>
                <View style={styles.readContent}>
                    <Text style={[styles.readCollection, { color: textSecondary }]} numberOfLines={1}>
                        {collectionName({ id: item.collectionId, name: item.collectionName })}
                    </Text>
                    <Text style={[styles.readChapter, { color: textPrimary }]} numberOfLines={1}>
                        {item.chapterName} {item.hadithNumber ? t('saved.hadithNo', { n: item.hadithNumber }) : ''}
                    </Text>
                    <Text style={[styles.dateText, { color: textSecondary }]}>
                        {formatDate(item.readAt)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const tabCount = (tab: Tab) => {
        if (tab === 'ayah') return savedAyahs.length;
        if (tab === 'hadith') return savedHadiths.length;
        return readEntries.length;
    };

    const EmptyView = ({ message }: { message: string }) => (
        <View style={styles.emptyContainer}>
            <Bookmark size={48} color={pal.borderStrong} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>{message}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <TouchableOpacity
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.back')}
                    style={[styles.backButton, { backgroundColor: pal.cardAlt }]}
                >
                    <ArrowLeft size={24} color={textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: pal.accentText }]}>
                    {t('saved.title')}
                </Text>
                {activeTab === 'read' && readEntries.length > 0 && (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t('saved.clearTitle')}
                        onPress={() =>
                            Alert.alert(
                                t('saved.clearTitle'),
                                t('saved.clearConfirm'),
                                [
                                    { text: t('common.cancel'), style: 'cancel' },
                                    { text: t('saved.clear'), style: 'destructive', onPress: onClearReadEntries },
                                ]
                            )
                        }
                        style={[styles.clearButton, { backgroundColor: pal.cardAlt }]}
                    >
                        <Trash2 size={18} color={darkMode ? '#ef4444' : '#dc2626'} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: pal.cardAlt }]}>
                {([
                    { id: 'ayah', label: t('saved.ayahs'), icon: <BookOpen size={14} color={activeTab === 'ayah' ? accentColor : textSecondary} /> },
                    { id: 'hadith', label: t('saved.hadiths'), icon: <Bookmark size={14} color={activeTab === 'hadith' ? accentColor : textSecondary} /> },
                    { id: 'read', label: t('saved.read'), icon: <Clock size={14} color={activeTab === 'read' ? accentColor : textSecondary} /> },
                ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[
                            styles.tab,
                            activeTab === tab.id && [styles.tabActive, { backgroundColor: cardBg }]
                        ]}
                    >
                        {tab.icon}
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab.id ? accentColor : textSecondary }
                        ]}>
                            {tab.label}
                        </Text>
                        {tabCount(tab.id) > 0 && (
                            <View style={[styles.tabCount, { backgroundColor: activeTab === tab.id ? accentColor : (pal.borderStrong) }]}>
                                <Text style={[styles.tabCountText, { color: activeTab === tab.id ? '#fff' : textSecondary }]}>
                                    {tabCount(tab.id)}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'ayah' && (
                savedAyahs.length === 0
                    ? <EmptyView message={t('saved.emptyAyahs')} />
                    : <FlatList
                        data={savedAyahs}
                        renderItem={renderAyah}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
            )}
            {activeTab === 'hadith' && (
                savedHadiths.length === 0
                    ? <EmptyView message={t('saved.emptyHadiths')} />
                    : <FlatList
                        data={savedHadiths}
                        renderItem={renderHadith}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
            )}
            {activeTab === 'read' && (
                readEntries.length === 0
                    ? <EmptyView message={t('saved.emptyRead')} />
                    : <FlatList
                        data={readEntries}
                        renderItem={renderRead}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        gap: 14,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    clearButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabs: {
        flexDirection: 'row',
        margin: 16,
        padding: 4,
        borderRadius: 14,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 5,
    },
    tabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    tabCount: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabCountText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingBottom: 80,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    deleteButton: {
        padding: 4,
    },
    arabicText: {
        fontSize: 20,
        fontFamily: 'ScheherazadeNew_400Regular',
        textAlign: 'right',
        lineHeight: 40,
        padding: 14,
        paddingHorizontal: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 14,
        borderTopWidth: 1,
    },
    turkishText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 20,
    },
    hadithText: {
        fontSize: 15,
        lineHeight: 26,
        fontFamily: 'PlusJakartaSans_500Medium',
        padding: 14,
    },
    refText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    readCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 14,
    },
    readIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    readContent: {
        flex: 1,
        gap: 3,
    },
    readCollection: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    readChapter: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});

export default SavedItems;
