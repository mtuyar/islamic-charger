import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Book, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLLECTIONS, HadithCollection } from '../services/hadith';

interface HadithLibraryProps {
    onSelectCollection: (collection: HadithCollection) => void;
    onBack: () => void;
    darkMode: boolean;
}

const HadithLibrary: React.FC<HadithLibraryProps> = ({ onSelectCollection, onBack, darkMode }) => {
    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#e5e7eb';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';

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
                <Text style={[styles.title, { color: darkMode ? '#34d399' : '#022c22' }]}>
                    Kütüb-i Sitte
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.heroCard, { backgroundColor: darkMode ? '#064e3b' : '#047857' }]}>
                    <Book size={32} color="#ffffff" style={{ opacity: 0.9 }} />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Hadis Külliyatı</Text>
                        <Text style={styles.heroSubtitle}>
                            Peygamber Efendimiz'in (s.a.v.) sahih hadislerini içeren en güvenilir 6 kaynak eser.
                        </Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                    KAYNAKLAR
                </Text>

                <View style={styles.grid}>
                    {COLLECTIONS.map((collection, index) => (
                        <TouchableOpacity
                            key={collection.id}
                            style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                            onPress={() => onSelectCollection(collection)}
                        >
                            <View style={styles.cardInner}>
                                <View style={[styles.iconContainer, { backgroundColor: darkMode ? 'rgba(52, 211, 153, 0.1)' : '#ecfdf5' }]}>
                                    <Text style={[styles.indexText, { color: darkMode ? '#34d399' : '#059669' }]}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.collectionName, { color: textPrimary }]}>
                                        {collection.name}
                                    </Text>
                                    <Text style={[styles.authorName, { color: textSecondary }]}>
                                        {collection.author}
                                    </Text>
                                    <View style={styles.statsRow}>
                                        <View style={[styles.badge, { backgroundColor: darkMode ? '#334155' : '#f1f5f9' }]}>
                                            <Text style={[styles.statsText, { color: textSecondary }]}>
                                                {collection.totalHadiths.toLocaleString()} Hadis
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.arrowContainer, { backgroundColor: darkMode ? '#334155' : '#f8fafc' }]}>
                                    <ChevronRight size={20} color={textSecondary} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
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
    title: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    content: {
        padding: 20,
    },
    heroCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        shadowColor: '#047857',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    grid: {
        gap: 16,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexText: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    cardContent: {
        flex: 1,
    },
    collectionName: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    authorName: {
        fontSize: 14,
        marginBottom: 8,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statsText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    arrowContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HadithLibrary;
