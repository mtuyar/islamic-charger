// Pushes data to the native home/lock-screen widgets.
// iOS: App Group UserDefaults via @bacons/apple-targets (read by targets/widget/*.swift)
// Android: react-native-android-widget re-render (widgets/widgetTaskHandler.tsx)
import { Platform } from 'react-native';
import { DAILY_CONTENT, ayahRange } from '../data/dailyContent';
import { usePrayerStore, PRAYER_KEYS } from '../store/usePrayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { toDateKey } from './prayerTimes';

export const APP_GROUP = 'group.com.mtuyarr.ruhnevaz';
export const WIDGET_DAILY = 'RuhnevazDaily';
export const WIDGET_PRAYER = 'RuhnevazPrayer';

/** Compact prayer payload the widgets can render without network: next ~40 days. */
export const buildPrayerPayload = () => {
  const { location, calendars, method } = usePrayerStore.getState();
  if (!location) return null;
  const today = toDateKey(new Date());
  const days = calendars
    .filter(c => c.key.startsWith(`${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}|${method}|`))
    .flatMap(c => c.days)
    .filter(d => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 40)
    .map(d => {
      const o: Record<string, string> = { date: d.date };
      for (const k of PRAYER_KEYS) o[k] = d.timings[k];
      o.Imsak = d.timings.Imsak;
      o.hijri = `${d.hijri.day}/${d.hijri.month}/${d.hijri.year}`;
      return o;
    });
  return { location: location.label, days };
};

export const buildDailyPayload = () =>
  DAILY_CONTENT.map(d => ({
    id: d.id,
    type: d.type,
    arabic: d.arabic ?? '',
    tr: d.tr,
    en: d.en,
    sourceTr: d.sourceTr ?? (d.surah ? `${d.surah}:${ayahRange(d)}` : ''),
    sourceEn: d.sourceEn ?? (d.surah ? `${d.surah}:${ayahRange(d)}` : ''),
  }));

let iosStorage: { set: (k: string, v: any) => void } | null = null;
let reloadIos: (() => void) | null = null;

const loadIos = () => {
  if (Platform.OS !== 'ios' || iosStorage) return;
  try {
    const mod = require('@bacons/apple-targets');
    iosStorage = new mod.ExtensionStorage(APP_GROUP);
    reloadIos = () => mod.ExtensionStorage.reloadWidget();
  } catch (e) {
    // Not available in Expo Go
    iosStorage = null;
  }
};

/** Write everything the widgets need and ask the OS to refresh them. Safe to call often. */
export const syncWidgets = async (): Promise<void> => {
  const lang = useSettingsStore.getState().language;
  const daily = buildDailyPayload();
  const prayer = buildPrayerPayload();
  const labels = {
    fajr: lang === 'tr' ? 'İmsak' : 'Fajr',
    sunrise: lang === 'tr' ? 'Güneş' : 'Sunrise',
    dhuhr: lang === 'tr' ? 'Öğle' : 'Dhuhr',
    asr: lang === 'tr' ? 'İkindi' : 'Asr',
    maghrib: lang === 'tr' ? 'Akşam' : 'Maghrib',
    isha: lang === 'tr' ? 'Yatsı' : 'Isha',
    next: lang === 'tr' ? 'Sıradaki' : 'Next',
    dailyTitle: lang === 'tr' ? 'Günün Nasibi' : 'Daily Reflection',
    ayah: lang === 'tr' ? 'Ayet' : 'Ayah',
    hadith: lang === 'tr' ? 'Hadis' : 'Hadith',
    wisdom: lang === 'tr' ? 'Hikmet' : 'Wisdom',
    noLocation: lang === 'tr' ? 'Konum seçilmedi' : 'No location set',
  };

  if (Platform.OS === 'ios') {
    loadIos();
    if (iosStorage) {
      iosStorage.set('lang', lang);
      iosStorage.set('labels', JSON.stringify(labels));
      iosStorage.set('daily', JSON.stringify(daily));
      iosStorage.set('prayer', prayer ? JSON.stringify(prayer) : '');
      reloadIos?.();
    }
  } else if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { renderDailyWidget, renderPrayerWidget } = require('../widgets/render');
      await requestWidgetUpdate({ widgetName: WIDGET_DAILY, renderWidget: (info: any) => renderDailyWidget(info) });
      await requestWidgetUpdate({ widgetName: WIDGET_PRAYER, renderWidget: (info: any) => renderPrayerWidget(info) });
    } catch (e) {
      // Not available in Expo Go
    }
  }
};
