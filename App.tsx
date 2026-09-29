import './global.css';
import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, AppState, AppStateStatus, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  PlusJakartaSans_300Light, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ScheherazadeNew_400Regular, ScheherazadeNew_700Bold } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './navigation/RootNavigator';
import { useTheme } from './theme';
import { useSettingsStore } from './store/useSettingsStore';
import { useLibraryStore } from './store/useLibraryStore';
import { usePrayerStore } from './store/usePrayerStore';
import { refreshPrayerData } from './services/prayerTimes';
import { syncWidgets } from './services/widgets';
import { ensureChannels } from './services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** One-time migration from the pre-1.0 storage layout ('theme' key → settings store). */
const migrateLegacy = async () => {
  try {
    const legacyTheme = await AsyncStorage.getItem('theme');
    if (legacyTheme && !(await AsyncStorage.getItem('ruhnevaz.settings'))) {
      useSettingsStore.getState().setThemeMode(legacyTheme === 'dark' ? 'dark' : 'light');
    }
  } catch { /* ignore */ }
};

const App: React.FC = () => {
  const c = useTheme();
  const [ready, setReady] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [fontsLoaded] = useFonts({
    Amiri_400Regular, Amiri_700Bold,
    PlusJakartaSans_300Light, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    ScheherazadeNew_400Regular, ScheherazadeNew_700Bold,
    NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold,
    MeQuran: require('./assets/fonts/me_quran.ttf'),
  });

  useEffect(() => {
    (async () => {
      await migrateLegacy();
      await useLibraryStore.getState().hydrate();
      await ensureChannels();
      setReady(true);
      // Background-ish work after first paint
      refreshPrayerData().then(syncWidgets).catch(() => {});
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refreshPrayerData().then(syncWidgets).catch(() => {});
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // Keep widgets in sync when prayer settings change.
  useEffect(() => {
    const unsub = usePrayerStore.subscribe((s, prev) => {
      if (s.location !== prev.location || s.calendars !== prev.calendars) syncWidgets().catch(() => {});
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={c.isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
