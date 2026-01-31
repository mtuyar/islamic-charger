import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Moon, Sun, Sparkles, Activity, Book, Disc, ScrollText, ArrowRight, BookOpen, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import TevafukCard from './TevafukCard';
import PrayerTimesWidget from './PrayerTimesWidget';
import { TevafukContent, Esma } from '../types';
import { getRandomEsma } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // padding 24*2 + gap 16

interface HomeMenuProps {
  tevafukContent: TevafukContent | null;
  loadingTevafuk: boolean;
  onRefreshTevafuk: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onNavigate: (page: any) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({
  tevafukContent,
  loadingTevafuk,
  onRefreshTevafuk,
  darkMode,
  toggleDarkMode,
  onNavigate
}) => {
  const [dailyEsma, setDailyEsma] = useState<Esma | null>(null);

  const bgColor = darkMode ? '#020617' : '#fcfbf9';
  const textPrimary = darkMode ? '#34d399' : '#022c22';
  const textSecondary = darkMode ? '#94a3b8' : '#78716c';
  const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const borderColor = darkMode ? '#334155' : '#f5f5f4';

  useEffect(() => {
    setDailyEsma(getRandomEsma());
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header with Greeting */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={[styles.turkishGreeting, { color: textPrimary }]}>
              Esselâmü Aleyküm
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Hayırlı günler, bereketli vakitler
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleDarkMode}
            style={[styles.themeButton, {
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              borderColor: darkMode ? 'rgba(255,255,255,0.1)' : '#e7e5e4'
            }]}
          >
            {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#78716c" />}
          </TouchableOpacity>
        </View>

        {/* Prayer Widget */}
        <View style={styles.section}>
          <PrayerTimesWidget darkMode={darkMode} />
        </View>

        {/* Main Actions Grid */}
        <View style={styles.section}>
          {/* Quran Card - Large */}
          <TouchableOpacity
            onPress={() => onNavigate('quran')}
            style={styles.quranCard}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#065f46', '#022c22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quranGradient}
            >
              <View style={styles.quranContent}>
                <View style={styles.quranIconContainer}>
                  <Book color="#d1fae5" size={28} strokeWidth={1.5} />
                </View>
                <View>
                  <Text style={styles.quranTitle}>Kuran-ı</Text>
                  <Text style={styles.quranTitle}>Kerim</Text>
                </View>
              </View>
              <View style={styles.quranArrow}>
                <ArrowRight size={20} color="#d1fae5" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Small Cards Row */}
          <View style={styles.smallCardsRow}>
            {/* Tasbih Card */}
            <TouchableOpacity
              onPress={() => onNavigate('tasbih')}
              style={[styles.smallCard, { backgroundColor: cardBg, borderColor }]}
              activeOpacity={0.9}
            >
              <View style={[styles.smallCardIcon, { backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                <Activity size={24} strokeWidth={1.5} color={darkMode ? '#34d399' : '#059669'} />
              </View>
              <View>
                <Text style={[styles.smallCardLabel, { color: textSecondary }]}>ZİKİR</Text>
                <Text style={[styles.smallCardTitle, { color: darkMode ? '#e2e8f0' : '#1c1917' }]}>Zikirmatik</Text>
              </View>
            </TouchableOpacity>

            {/* Hadith Card */}
            <TouchableOpacity
              onPress={() => onNavigate('hadith')}
              style={[styles.smallCard, { backgroundColor: cardBg, borderColor }]}
              activeOpacity={0.9}
            >
              <View style={[styles.smallCardIcon, { backgroundColor: darkMode ? 'rgba(99,102,241,0.15)' : '#eef2ff' }]}>
                <BookOpen size={24} strokeWidth={1.5} color={darkMode ? '#818cf8' : '#4f46e5'} />
              </View>
              <View>
                <Text style={[styles.smallCardLabel, { color: textSecondary }]}>İLİM</Text>
                <Text style={[styles.smallCardTitle, { color: darkMode ? '#e2e8f0' : '#1c1917' }]}>Hadisler</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Content (Tevafuk) */}
        {/* Daily Content (Tevafuk) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color="#f59e0b" fill="#f59e0b" />
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              {loadingTevafuk ? "NASİP GELİYOR..." : "GÜNÜN NASİBİ"}
            </Text>
          </View>
          <TevafukCard
            content={tevafukContent}
            loading={loadingTevafuk}
            onRefresh={onRefreshTevafuk}
            darkMode={darkMode}
          />
        </View>

        {/* Esma-ul Husna Mini Widget */}
        {dailyEsma && (
          <TouchableOpacity
            onPress={() => onNavigate('esma')}
            style={[styles.esmaCard, {
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
              borderColor
            }]}
            activeOpacity={0.9}
          >
            <View style={styles.esmaHeader}>
              <View style={[styles.esmaNumberBadge, { backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ecfdf5' }]}>
                <Text style={styles.esmaNumber}>{dailyEsma.id}</Text>
              </View>

              {/* Refresh Esma Button */}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  const newEsma = getRandomEsma();
                  setDailyEsma(newEsma);
                }}
                style={[styles.esmaRefreshButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f4' }]}
              >
                <RefreshCw size={16} color={darkMode ? '#94a3b8' : '#78716c'} />
              </TouchableOpacity>
            </View>

            <View style={styles.esmaBody}>
              <Text style={[styles.esmaArabic, { color: darkMode ? '#34d399' : '#065f46' }]}>
                {dailyEsma.name}
              </Text>
              <Text style={[styles.esmaTranslit, { color: textPrimary }]}>
                {dailyEsma.transliteration}
              </Text>
              <Text style={[styles.esmaMeaning, { color: textSecondary }]}>
                {dailyEsma.meaning}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  greetingContainer: {
    flex: 1,
  },
  arabicGreeting: {
    fontSize: 28,
    fontFamily: 'ScheherazadeNew_400Regular',
    marginBottom: 4,
  },
  turkishGreeting: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  section: {
    marginBottom: 24,
  },
  quranCard: {
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#064e3b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  quranGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  quranContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quranIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quranTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  quranArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    height: 120,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  smallCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smallCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  esmaCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  esmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  esmaNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  esmaNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  esmaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  esmaRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  esmaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  esmaBody: {
    alignItems: 'center',
  },
  esmaArabic: {
    fontSize: 52,
    fontFamily: 'Amiri_400Regular',
    marginBottom: 12,
  },
  esmaTranslit: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  esmaMeaning: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HomeMenu;