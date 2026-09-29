import { paletteFor } from '../theme';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Info, Mail, ExternalLink } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useSettingsStore } from '../store/useSettingsStore';
import { t } from '../i18n';

interface AboutScreenProps {
    onBack: () => void;
    darkMode: boolean;
}

// Hosted copy of PRIVACY_POLICY.md — the same URL goes into App Store Connect /
// Play Console. Update if the policy is hosted somewhere else.
export const PRIVACY_URL = 'https://mtuyar.github.io/ruhnevaz/privacy.html';
export const CONTACT_EMAIL = 'mehmettahauyarr@gmail.com';

// `key` → about.src.<key> (localized description); `name` is the proper name of the source.
const DATA_SOURCES: { name: string; key: string }[] = [
    { name: 'Tanzil (quran-simple) · alquran.cloud', key: 'quranText' },
    { name: 'Diyanet İşleri Başkanlığı', key: 'meal' },
    { name: 'Islamic Network / EveryAyah (cdn.islamic.network)', key: 'audio' },
    { name: 'quran.com · Açık Kuran (acikkuran.com) · Diyanet Açık Kaynak Kur\'an API', key: 'words' },
    { name: 'KFGQPC · QuranHub', key: 'pages' },
    { name: 'fawazahmed0/hadith-api', key: 'hadith' },
    { name: 'Aladhan API', key: 'prayer' },
    { name: 'Amiri · Noto Naskh Arabic · Scheherazade New', key: 'fonts' },
    { name: 'me_quran', key: 'mushafFont' },
];

const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, darkMode }) => {
  const pal = paletteFor(darkMode);
    useSettingsStore(s => s.language); // re-render on language change
    const bgColor = pal.bg;
    const cardBg = pal.card;
    const borderColor = pal.border;
    const textPrimary = pal.text;
    const textSecondary = pal.textSecondary;
    const accent = pal.accentText;

    const version = Constants.expoConfig?.version ?? '1.0.0';
    const build =
        Constants.expoConfig?.ios?.buildNumber ??
        Constants.expoConfig?.android?.versionCode?.toString() ??
        '';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel={t('a11y.back')}>
                    <ArrowLeft size={22} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('about.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.brand}>
                    <Text style={[styles.appName, { color: accent }]}>Ruhnevâz</Text>
                    <Text style={[styles.tagline, { color: textSecondary }]}>{t('about.tagline')}</Text>
                    <Text style={[styles.version, { color: textSecondary }]}>
                        {t('about.version', { version })}{build ? ` (${build})` : ''}
                    </Text>
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <Info size={18} color={accent} />
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>{t('about.appTitle')}</Text>
                    </View>
                    <Text style={[styles.body, { color: textSecondary }]}>{t('about.appBody')}</Text>
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <Shield size={18} color={accent} />
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>{t('about.privacyTitle')}</Text>
                    </View>
                    <Text style={[styles.body, { color: textSecondary }]}>{t('about.privacyBody')}</Text>

                    <Text style={[styles.subTitle, { color: textPrimary }]}>{t('about.sourcesTitle')}</Text>
                    {DATA_SOURCES.map(src => (
                        <View key={src.key} style={styles.sourceRow}>
                            <Text style={[styles.sourceName, { color: textPrimary }]}>{src.name}</Text>
                            <Text style={[styles.sourcePurpose, { color: textSecondary }]}>{t(`about.src.${src.key}`)}</Text>
                        </View>
                    ))}
                    <Text style={[styles.body, { color: textSecondary, marginTop: 8 }]}>{t('about.sourcesNote')}</Text>

                    <TouchableOpacity style={[styles.linkButton, { borderColor }]} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
                        <ExternalLink size={16} color={accent} />
                        <Text style={[styles.linkText, { color: accent }]}>{t('about.privacyLink')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <Mail size={18} color={accent} />
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>{t('about.contactTitle')}</Text>
                    </View>
                    <Text style={[styles.body, { color: textSecondary }]}>{t('about.contactBody')}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} accessibilityRole="link">
                        <Text style={[styles.linkText, { color: accent, marginTop: 6 }]}>{CONTACT_EMAIL}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.footer, { color: textSecondary }]}>{t('about.footer')}</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    backButton: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    content: {
        padding: 20,
        paddingBottom: 48,
        gap: 16,
    },
    brand: {
        alignItems: 'center',
        paddingVertical: 12,
        gap: 4,
    },
    appName: {
        fontSize: 32,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    tagline: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    version: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 4,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    subTitle: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginTop: 6,
    },
    body: {
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    sourceRow: {
        gap: 2,
    },
    sourceName: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    sourcePurpose: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    linkText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    footer: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 8,
    },
});

export default AboutScreen;
