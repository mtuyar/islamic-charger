import './global.css';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Amiri_400Regular,
  Amiri_700Bold
} from '@expo-google-fonts/amiri';
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold
} from '@expo-google-fonts/scheherazade-new';
import {
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold
} from '@expo-google-fonts/noto-naskh-arabic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Star, ArrowLeft } from 'lucide-react-native';

// Components
import HomeMenu from './components/HomeMenu';
import Reader from './components/Reader';
import QuranLibrary from './components/QuranLibrary';
import Tasbih from './components/Tasbih';
import EsmaLibrary from './components/EsmaLibrary';
import HadithLibrary from './components/HadithLibrary';
import HadithChapters from './components/HadithChapters';
import HadithReader from './components/HadithReader';
import { getSurahList, getRandomAyah, getRandomHadith, getSurahDetails, getAllHadiths, getHadithList } from './services/api';
import { Surah, TevafukContent, DualSurahResponse, Hadith } from './types';
import { HadithCollection, HadithChapter } from './services/hadith';
import { registerForPushNotificationsAsync } from './services/notifications';

type Page = 'home' | 'quran' | 'tasbih' | 'hadith' | 'esma';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [darkMode, setDarkMode] = useState(false);

  // Data State
  const [tevafukContent, setTevafukContent] = useState<TevafukContent | null>(null);
  const [loadingTevafuk, setLoadingTevafuk] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);

  // Hadith Navigation State
  const [selectedCollection, setSelectedCollection] = useState<HadithCollection | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<HadithChapter | null>(null);

  // Reader Overlay State
  const [readingSurahId, setReadingSurahId] = useState<number | null>(null);
  const [readingData, setReadingData] = useState<DualSurahResponse | null>(null);
  const [loadingReader, setLoadingReader] = useState(false);
  const [lastReadSurahId, setLastReadSurahId] = useState<number | null>(null);

  // Fonts
  let [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
  });

  const bgColor = darkMode ? '#020617' : '#fcfbf9';
  const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const borderColor = darkMode ? '#334155' : '#f5f5f4';
  const textPrimary = darkMode ? '#ffffff' : '#1c1917';
  const textSecondary = darkMode ? '#94a3b8' : '#78716c';

  // Initial Load
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        if (theme === 'dark') {
          setDarkMode(true);
        }

        const savedLastRead = await AsyncStorage.getItem('lastReadSurahId');
        if (savedLastRead) setLastReadSurahId(parseInt(savedLastRead));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };

    loadSettings();
    loadTevafuk('ayah');
    fetchSurahs();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const fetchSurahs = async () => {
    const list = await getSurahList();
    setSurahs(list);
  };

  const loadTevafuk = async (preferType?: 'ayah' | 'hadith') => {
    setLoadingTevafuk(true);
    const type = preferType || (Math.random() > 0.4 ? 'ayah' : 'hadith');
    if (type === 'ayah') {
      const data = await getRandomAyah();
      setTevafukContent(data);
    } else {
      const data = await getRandomHadith();
      setTevafukContent(data);
    }
    setLoadingTevafuk(false);
  };

  const openSurah = async (id: number) => {
    setReadingSurahId(id);
    setLastReadSurahId(id);
    AsyncStorage.setItem('lastReadSurahId', id.toString());

    setLoadingReader(true);
    const data = await getSurahDetails(id);
    setReadingData(data);
    setLoadingReader(false);
  };

  const closeReader = () => {
    setReadingSurahId(null);
    setReadingData(null);
  };

  // Navigation Helper
  const goHome = () => {
    setCurrentPage('home');
    setSelectedCollection(null);
    setSelectedChapter(null);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaProvider>
    );
  }

  // --- RENDER LOGIC ---

  // 1. Reader Overlay (Takes over full screen if active)
  if (readingSurahId) {
    if (loadingReader || !readingData) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.loadingText, { color: darkMode ? '#34d399' : '#065f46' }]}>
                Sure Yükleniyor...
              </Text>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return (
      <SafeAreaProvider>
        <Reader data={readingData} onBack={closeReader} darkMode={darkMode} />
      </SafeAreaProvider>
    );
  }

  // 2. Main Page Routing
  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomeMenu
            tevafukContent={tevafukContent}
            loadingTevafuk={loadingTevafuk}
            onRefreshTevafuk={() => loadTevafuk()}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            onNavigate={setCurrentPage}
          />
        );
      case 'quran':
        return (
          <QuranLibrary
            surahs={surahs}
            onOpenSurah={openSurah}
            lastReadSurahId={lastReadSurahId}
            onBack={goHome}
            darkMode={darkMode}
          />
        );
      case 'tasbih':
        return <Tasbih darkMode={darkMode} onBack={goHome} />;
      case 'esma':
        return <EsmaLibrary onBack={goHome} darkMode={darkMode} />;
      case 'hadith':
        if (selectedChapter && selectedCollection) {
          return (
            <HadithReader
              collection={selectedCollection}
              chapter={selectedChapter}
              onBack={() => setSelectedChapter(null)}
              darkMode={darkMode}
            />
          );
        }
        if (selectedCollection) {
          return (
            <HadithChapters
              collection={selectedCollection}
              onSelectChapter={setSelectedChapter}
              onBack={() => setSelectedCollection(null)}
              darkMode={darkMode}
            />
          );
        }
        return (
          <HadithLibrary
            onSelectCollection={setSelectedCollection}
            onBack={goHome}
            darkMode={darkMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      {renderContent()}
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default App;
