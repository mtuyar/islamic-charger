import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet, Dimensions, Modal } from 'react-native';
import { getAllEsmas } from '../services/api';
import { Search, ChevronLeft, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface EsmaLibraryProps {
    onBack: () => void;
    darkMode?: boolean;
}

const EsmaLibrary: React.FC<EsmaLibraryProps> = ({ onBack, darkMode = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEsma, setSelectedEsma] = useState<typeof esmas[0] | null>(null);
    const esmas = getAllEsmas();

    const bgColor = darkMode ? '#020617' : '#fcfbf9';
    const cardBg = darkMode ? '#1e293b' : '#ffffff';
    const borderColor = darkMode ? '#334155' : '#e7e5e4';
    const textPrimary = darkMode ? '#ffffff' : '#1c1917';
    const textSecondary = darkMode ? '#94a3b8' : '#78716c';
    const inputBg = darkMode ? '#0f172a' : '#ffffff';

    const filteredEsmas = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return esmas;
        return esmas.filter(e =>
            e.transliteration.toLowerCase().includes(query) ||
            e.meaning.toLowerCase().includes(query) ||
            e.name.includes(query)
        );
    }, [esmas, searchQuery]);

    const renderEsmaItem = ({ item: esma }: { item: typeof esmas[0] }) => (
        <TouchableOpacity
            onPress={() => setSelectedEsma(esma)}
            style={[styles.esmaCard, { backgroundColor: cardBg, borderColor }]}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.esmaNumberBadge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ecfdf5' }]}>
                    <Text style={styles.esmaNumberText}>{esma.id}</Text>
                </View>
                <Text style={[styles.esmaArabicCard, { color: darkMode ? '#34d399' : '#065f46' }]}>
                    {esma.name}
                </Text>
            </View>
            <Text style={[styles.esmaTranslitCard, { color: textPrimary }]}>
                {esma.transliteration}
            </Text>
            <Text style={[styles.esmaMeaningCard, { color: textSecondary }]} numberOfLines={2}>
                {esma.meaning}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Detail Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!selectedEsma}
                onRequestClose={() => setSelectedEsma(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setSelectedEsma(null)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: darkMode ? '#0f172a' : '#ffffff' }]}>
                        <TouchableOpacity
                            onPress={() => setSelectedEsma(null)}
                            style={[styles.closeButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
                        >
                            <X size={20} color={textSecondary} />
                        </TouchableOpacity>

                        {selectedEsma && (
                            <View style={styles.modalCenter}>
                                <View style={[styles.modalNumberBadge, { backgroundColor: darkMode ? '#065f46' : '#ecfdf5' }]}>
                                    <Text style={[styles.modalNumberText, { color: darkMode ? '#ffffff' : '#047857' }]}>
                                        {selectedEsma.id}
                                    </Text>
                                </View>
                                <Text style={[styles.modalArabic, { color: darkMode ? '#34d399' : '#065f46' }]}>
                                    {selectedEsma.name}
                                </Text>
                                <Text style={[styles.modalTransliteration, { color: textPrimary }]}>
                                    {selectedEsma.transliteration}
                                </Text>

                                <View style={[styles.meaningContainer, { backgroundColor: darkMode ? '#1e293b' : '#fafaf9', borderColor }]}>
                                    <Text style={[styles.meaningLabel, { color: textSecondary }]}>ANLAMI</Text>
                                    <Text style={[styles.meaningText, { color: textPrimary }]}>
                                        {selectedEsma.meaning}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={onBack}
                        style={[styles.backButton, { backgroundColor: darkMode ? '#1e293b' : '#f5f5f4' }]}
                    >
                        <ChevronLeft size={24} color={textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerArabic, { color: darkMode ? '#34d399' : '#065f46' }]}>
                            أَسْمَاءُ الْحُسْنَى
                        </Text>
                        <Text style={[styles.headerTitle, { color: textPrimary }]}>
                            Esma-ül Hüsna
                        </Text>
                    </View>
                </View>

                {/* Search */}
                <View style={[styles.searchInput, { backgroundColor: inputBg, borderColor }]}>
                    <Search size={18} color={textSecondary} />
                    <TextInput
                        placeholder="İsim veya anlam ara..."
                        placeholderTextColor={textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={[styles.searchTextInput, { color: textPrimary }]}
                    />
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredEsmas}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEsmaItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
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
        marginBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerArabic: {
        fontSize: 20,
        fontFamily: 'Amiri_400Regular',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 2,
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    listContent: {
        padding: 24,
    },
    esmaCard: {
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    esmaNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    esmaNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#047857',
    },
    esmaArabicCard: {
        fontSize: 28,
        fontFamily: 'Amiri_400Regular',
    },
    esmaTranslitCard: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    esmaMeaningCard: {
        fontSize: 13,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        width: width - 48,
        borderRadius: 24,
        padding: 24,
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    modalCenter: {
        alignItems: 'center',
        paddingTop: 8,
    },
    modalNumberBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    modalNumberText: {
        fontSize: 15,
        fontWeight: '700',
    },
    modalArabic: {
        fontSize: 44,
        fontFamily: 'Amiri_400Regular',
        marginBottom: 8,
    },
    modalTransliteration: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    meaningContainer: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    meaningLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        textAlign: 'center',
    },
    meaningText: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default EsmaLibrary;