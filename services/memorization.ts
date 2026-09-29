import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { MemorizationEntry, MemorizationSettings } from '../types';
import { t } from '../i18n';

// Days until next review per level (spaced repetition intervals)
export const REVIEW_INTERVALS: number[] = [1, 2, 4, 7, 14, 30];
export const LEVEL_MAX = 5;

const KEYS = {
  entries: 'memorization_entries',
  settings: 'memorization_settings',
  notifId: 'memorization_notif_id',
};

const load = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const persist = async (key: string, value: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const getNextReviewDate = (level: number): number => {
  const days = REVIEW_INTERVALS[Math.min(level, LEVEL_MAX)];
  return Date.now() + days * 24 * 60 * 60 * 1000;
};

export const getStatusFromLevel = (level: number): 'learning' | 'reviewing' | 'memorized' => {
  if (level <= 1) return 'learning';
  if (level <= 4) return 'reviewing';
  return 'memorized';
};

export const getEntries = (): Promise<MemorizationEntry[]> =>
  load<MemorizationEntry[]>(KEYS.entries, []);

export const saveEntries = (entries: MemorizationEntry[]): Promise<void> =>
  persist(KEYS.entries, entries);

export const addEntry = async (entry: MemorizationEntry): Promise<void> => {
  const entries = await getEntries();
  if (entries.find(e => e.id === entry.id)) return;
  await saveEntries([entry, ...entries]);
};

export const updateEntry = async (updated: MemorizationEntry): Promise<void> => {
  const entries = await getEntries();
  await saveEntries(entries.map(e => e.id === updated.id ? updated : e));
};

export const removeEntry = async (id: string): Promise<void> => {
  const entries = await getEntries();
  await saveEntries(entries.filter(e => e.id !== id));
};

export const getDueEntries = async (): Promise<MemorizationEntry[]> => {
  const entries = await getEntries();
  return entries.filter(e => e.status === 'learning' || e.status === 'reviewing');
};

export const getMemorizationSettings = (): Promise<MemorizationSettings> =>
  load<MemorizationSettings>(KEYS.settings, {
    reminderEnabled: false,
    reminderHour: 8,
    reminderMinute: 0,
  });

export const saveMemorizationSettings = (s: MemorizationSettings): Promise<void> =>
  persist(KEYS.settings, s);

export const scheduleReminder = async (hour: number, minute: number): Promise<void> => {
  try {
    const existingId = await AsyncStorage.getItem(KEYS.notifId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('memorize.notifTitle'),
        body: t('memorize.notifBody'),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    await AsyncStorage.setItem(KEYS.notifId, id);
  } catch {}
};

export const cancelReminder = async (): Promise<void> => {
  try {
    const existingId = await AsyncStorage.getItem(KEYS.notifId);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(KEYS.notifId);
    }
  } catch {}
};
