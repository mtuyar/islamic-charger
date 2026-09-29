import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrayerKey = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export const PRAYER_KEYS: PrayerKey[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
/** The five obligatory prayers (used by tracker / qada). */
export const FARD_KEYS: Exclude<PrayerKey, 'Sunrise'>[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export type NotificationSound = 'default' | 'chime' | 'adhan' | 'silent';

export interface PrayerLocation {
  label: string;          // "İstanbul, Türkiye"
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;   // ISO2, used to pick a default method
  timezone?: string;      // from Aladhan meta
  source: 'gps' | 'manual';
}

export interface DayTimings {
  date: string;                       // YYYY-MM-DD (gregorian, local to location)
  timings: Record<PrayerKey | 'Imsak' | 'Sunset' | 'Midnight', string>; // "HH:MM"
  hijri: { day: number; month: number; year: number; monthEn: string };
  weekday: number;                    // 0 = Sunday
}

export interface CalendarCache {
  key: string;            // `${lat.toFixed(2)},${lon.toFixed(2)}|${method}|${yyyy}-${mm}`
  fetchedAt: number;
  days: DayTimings[];
}

export type PrayerLog = Record<string, Partial<Record<PrayerKey, boolean>>>; // date -> prayers done
export type KazaCounts = Record<Exclude<PrayerKey, 'Sunrise'> | 'Witr', number>;

interface PrayerState {
  location: PrayerLocation | null;
  method: number;                       // Aladhan method id (13 = Diyanet)
  calendars: CalendarCache[];           // keep current + next month
  notificationPrefs: Record<PrayerKey, boolean>;
  sound: NotificationSound;
  preReminderMinutes: number;           // 0 = off
  holyNightReminders: boolean;
  lastScheduledAt: number;
  // Tracking
  prayerLog: PrayerLog;
  kaza: KazaCounts;
  fastingLog: Record<string, boolean>;  // date -> fasted

  setLocation: (loc: PrayerLocation | null) => void;
  setMethod: (m: number) => void;
  upsertCalendar: (c: CalendarCache) => void;
  setNotificationPref: (k: PrayerKey, v: boolean) => void;
  setSound: (s: NotificationSound) => void;
  setPreReminder: (min: number) => void;
  setHolyNightReminders: (v: boolean) => void;
  setLastScheduledAt: (t: number) => void;
  togglePrayerDone: (date: string, k: PrayerKey) => void;
  setKaza: (k: keyof KazaCounts, n: number) => void;
  toggleFasting: (date: string) => void;
}

export const DEFAULT_KAZA: KazaCounts = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, Witr: 0 };

export const usePrayerStore = create<PrayerState>()(
  persist(
    (set) => ({
      location: null,
      method: 13,
      calendars: [],
      notificationPrefs: { Fajr: true, Sunrise: false, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
      sound: 'chime',
      preReminderMinutes: 0,
      holyNightReminders: true,
      lastScheduledAt: 0,
      prayerLog: {},
      kaza: DEFAULT_KAZA,
      fastingLog: {},

      setLocation: (location) => set({ location }),
      setMethod: (method) => set({ method }),
      upsertCalendar: (c) =>
        set((s) => {
          const others = s.calendars.filter(x => x.key !== c.key);
          // keep at most 3 cached months
          return { calendars: [c, ...others].slice(0, 3) };
        }),
      setNotificationPref: (k, v) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, [k]: v } })),
      setSound: (sound) => set({ sound }),
      setPreReminder: (preReminderMinutes) => set({ preReminderMinutes }),
      setHolyNightReminders: (holyNightReminders) => set({ holyNightReminders }),
      setLastScheduledAt: (lastScheduledAt) => set({ lastScheduledAt }),
      togglePrayerDone: (date, k) =>
        set((s) => {
          const day = { ...(s.prayerLog[date] ?? {}) };
          day[k] = !day[k];
          return { prayerLog: { ...s.prayerLog, [date]: day } };
        }),
      setKaza: (k, n) => set((s) => ({ kaza: { ...s.kaza, [k]: Math.max(0, n) } })),
      toggleFasting: (date) =>
        set((s) => ({ fastingLog: { ...s.fastingLog, [date]: !s.fastingLog[date] } })),
    }),
    {
      name: 'ruhnevaz.prayer',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
