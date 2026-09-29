import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useIsDark } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLibraryStore } from '../store/useLibraryStore';
import type { RootStackParamList } from './types';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PrayerScreen from '../screens/PrayerScreen';
import DhikrScreen from '../screens/DhikrScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import PrayerSettingsScreen from '../screens/PrayerSettingsScreen';
import ImsakiyeScreen from '../screens/ImsakiyeScreen';
import KazaScreen from '../screens/KazaScreen';
import HolyDaysScreen from '../screens/HolyDaysScreen';
import DuaListScreen from '../screens/DuaListScreen';
import DuaDetailScreen from '../screens/DuaDetailScreen';
import TasbihatScreen from '../screens/TasbihatScreen';
import ShareCardScreen from '../screens/ShareCardScreen';
import ReaderScreen from '../screens/ReaderScreen';

// Legacy components (take darkMode + onBack props)
import QuranLibrary from '../components/QuranLibrary';
import Tasbih from '../components/Tasbih';
import EsmaLibrary from '../components/EsmaLibrary';
import HadithLibrary from '../components/HadithLibrary';
import HadithChapters from '../components/HadithChapters';
import HadithReader from '../components/HadithReader';
import SavedItems from '../components/SavedItems';
import MemorizationModule from '../components/MemorizationModule';
import QiblaCompass from '../components/QiblaCompass';
import QuranLearnModule from '../components/QuranLearnModule';
import AboutScreen from '../components/AboutScreen';
import { COLLECTIONS } from '../services/hadith';

const Stack = createNativeStackNavigator<RootStackParamList>();
type Nav = NativeStackNavigationProp<RootStackParamList>;

// ---- Legacy wrappers ----

const QuranScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const darkMode = useIsDark();
  const surahs = useLibraryStore(s => s.surahs);
  const lastReadSurahId = useLibraryStore(s => s.lastReadSurahId);
  const lastReadAyahNumber = useLibraryStore(s => s.lastReadAyahNumber);
  return (
    <QuranLibrary
      surahs={surahs}
      onOpenSurah={(id, startAyah) => nav.navigate('Reader', { surahId: id, startAyah })}
      lastReadSurahId={lastReadSurahId}
      lastReadAyahNumber={lastReadAyahNumber}
      onBack={() => nav.goBack()}
      darkMode={darkMode}
    />
  );
};

const TasbihScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  return <Tasbih darkMode={useIsDark()} onBack={() => nav.goBack()} />;
};
const EsmaScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  return <EsmaLibrary darkMode={useIsDark()} onBack={() => nav.goBack()} />;
};
const QiblaScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  return <QiblaCompass darkMode={useIsDark()} onBack={() => nav.goBack()} />;
};
const WordsScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  return <QuranLearnModule darkMode={useIsDark()} onBack={() => nav.goBack()} />;
};
const MemorizationScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const surahs = useLibraryStore(s => s.surahs);
  return (
    <MemorizationModule
      surahs={surahs}
      darkMode={useIsDark()}
      onBack={() => nav.goBack()}
      onOpenSurah={(id, startAyah) => nav.navigate('Reader', { surahId: id, startAyah })}
    />
  );
};

const openHadithChapter = (nav: Nav, collectionId: string, chapterId: string, chapterName: string, hadithNumber?: string | number) => {
  const collection = COLLECTIONS.find(c => c.id === collectionId);
  if (!collection) return;
  nav.navigate('HadithReader', { collection, chapter: { sectionId: chapterId, name: chapterName }, initialHadithNumber: hadithNumber });
};

const HadithLibraryScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  return (
    <HadithLibrary
      onBack={() => nav.goBack()}
      onSelectCollection={(collection) => nav.navigate('HadithChapters', { collection })}
      onOpenChapter={(col, chap, num) => openHadithChapter(nav, col.id, chap.sectionId, chap.name, num)}
    />
  );
};
const HadithChaptersScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HadithChapters'>>();
  return (
    <HadithChapters
      collection={params.collection}
      darkMode={useIsDark()}
      onBack={() => nav.goBack()}
      onSelectChapter={(chapter) => nav.navigate('HadithReader', { collection: params.collection, chapter })}
    />
  );
};
const HadithReaderScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HadithReader'>>();
  const savedHadiths = useLibraryStore(s => s.savedHadiths);
  const toggleSavedHadith = useLibraryStore(s => s.toggleSavedHadith);
  const addReadEntry = useLibraryStore(s => s.addReadEntry);
  return (
    <HadithReader
      collection={params.collection}
      chapter={params.chapter}
      initialHadithNumber={params.initialHadithNumber}
      darkMode={useIsDark()}
      onBack={() => nav.goBack()}
      onSaveHadith={toggleSavedHadith}
      savedHadithIds={savedHadiths.map(h => h.id)}
      onMarkRead={addReadEntry}
    />
  );
};
const SavedScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const s = useLibraryStore();
  return (
    <SavedItems
      savedAyahs={s.savedAyahs}
      savedHadiths={s.savedHadiths}
      readEntries={s.readEntries}
      onRemoveSavedAyah={s.removeAyah}
      onRemoveSavedHadith={s.removeHadith}
      onClearReadEntries={s.clearRead}
      onOpenSurah={(id, startAyah) => nav.navigate('Reader', { surahId: id, startAyah })}
      onOpenHadithChapter={(colId, chapId, chapName, num) => openHadithChapter(nav, colId, chapId, chapName, num)}
      onBack={() => nav.goBack()}
      darkMode={useIsDark()}
    />
  );
};
const AboutRoute: React.FC = () => {
  const nav = useNavigation<Nav>();
  return <AboutScreen darkMode={useIsDark()} onBack={() => nav.goBack()} />;
};

// ---- Root ----

const RootNavigator: React.FC = () => {
  const c = useTheme();
  const onboardingDone = useSettingsStore(s => s.onboardingDone);
  useSettingsStore(s => s.language);

  const navTheme = {
    ...(c.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(c.isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: c.bg,
      card: c.bgElevated,
      text: c.text,
      border: c.border,
      primary: c.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={onboardingDone ? 'Home' : 'Onboarding'}
        screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.bg } }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Quran" component={QuranScreen} />
        <Stack.Screen name="Prayer" component={PrayerScreen} />
        <Stack.Screen name="Dhikr" component={DhikrScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="HadithLibrary" component={HadithLibraryScreen} />
        <Stack.Screen name="HadithChapters" component={HadithChaptersScreen} />
        <Stack.Screen name="HadithReader" component={HadithReaderScreen} />
        <Stack.Screen name="Esma" component={EsmaScreen} />
        <Stack.Screen name="Saved" component={SavedScreen} />
        <Stack.Screen name="Memorization" component={MemorizationScreen} />
        <Stack.Screen name="Words" component={WordsScreen} />
        <Stack.Screen name="Qibla" component={QiblaScreen} />
        <Stack.Screen name="Tasbih" component={TasbihScreen} />
        <Stack.Screen name="Tasbihat" component={TasbihatScreen} />
        <Stack.Screen name="DuaList" component={DuaListScreen} />
        <Stack.Screen name="DuaDetail" component={DuaDetailScreen} />
        <Stack.Screen name="HolyDays" component={HolyDaysScreen} />
        <Stack.Screen name="Imsakiye" component={ImsakiyeScreen} />
        <Stack.Screen name="Kaza" component={KazaScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="About" component={AboutRoute} />
        <Stack.Screen name="PrayerSettings" component={PrayerSettingsScreen} />
        <Stack.Screen name="LocationPicker" component={LocationPickerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
