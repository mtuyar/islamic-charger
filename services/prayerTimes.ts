import * as Location from 'expo-location';
import {
  usePrayerStore, PrayerLocation, DayTimings, CalendarCache, PrayerKey, PRAYER_KEYS, NotificationSound,
} from '../store/usePrayerStore';
import { cancelAllNotifications, scheduleAt, hasNotificationPermission, MAX_SCHEDULED } from './notifications';
import { PRAYER_MESSAGES_TR } from '../data/prayerMessages';
import { upcomingHolyDays } from './hijri';
import { t, currentLanguage } from '../i18n';

const API = 'https://api.aladhan.com/v1';

// ---- Method selection by country ----

const METHOD_BY_COUNTRY: Record<string, number> = {
  TR: 13, US: 2, CA: 2, EG: 5, SA: 4, PK: 1, IN: 1, BD: 1, AF: 1, IR: 7,
  AE: 16, OM: 8, BH: 8, KW: 9, QA: 10, SG: 11, MY: 17, ID: 20, FR: 12, RU: 14,
  MA: 21, DZ: 19, TN: 18, JO: 23, DE: 3, NL: 3, GB: 3, BE: 3, AT: 3, CH: 3,
};
export const defaultMethodFor = (countryCode?: string): number =>
  (countryCode && METHOD_BY_COUNTRY[countryCode.toUpperCase()]) || 3;

export const METHODS: { id: number; name: string }[] = [
  { id: 13, name: 'Diyanet İşleri Başkanlığı (Türkiye)' },
  { id: 3, name: 'Muslim World League' },
  { id: 2, name: 'ISNA (North America)' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 4, name: 'Umm Al-Qura (Makkah)' },
  { id: 1, name: 'University of Karachi' },
  { id: 12, name: 'UOIF (France)' },
  { id: 16, name: 'Dubai (UAE)' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Singapore' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
  { id: 7, name: 'Institute of Geophysics, Tehran' },
];

// ---- Location ----

export const resolveGpsLocation = async (): Promise<PrayerLocation> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('permission-denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  let city: string | undefined;
  let country: string | undefined;
  let countryCode: string | undefined;
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
    city = g?.city ?? g?.subregion ?? g?.region ?? undefined;
    country = g?.country ?? undefined;
    countryCode = g?.isoCountryCode ?? undefined;
  } catch { /* offline geocoder may fail; coordinates are enough */ }
  const label = [city, country].filter(Boolean).join(', ') || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  return { label, latitude, longitude, city, country, countryCode, source: 'gps' };
};

export interface CitySuggestion extends PrayerLocation {}

export const searchCities = async (query: string): Promise<CitySuggestion[]> => {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = await Location.geocodeAsync(q);
  const out: CitySuggestion[] = [];
  for (const r of results.slice(0, 5)) {
    let city: string | undefined = q;
    let country: string | undefined;
    let countryCode: string | undefined;
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
      city = g?.city ?? g?.subregion ?? g?.region ?? q;
      country = g?.country ?? undefined;
      countryCode = g?.isoCountryCode ?? undefined;
    } catch { /* keep the typed name */ }
    const label = [city, country].filter(Boolean).join(', ');
    if (!out.some(o => o.label === label)) {
      out.push({ label, latitude: r.latitude, longitude: r.longitude, city, country, countryCode, source: 'manual' });
    }
  }
  return out;
};

// ---- Calendar fetch + cache ----

const pad = (n: number) => n.toString().padStart(2, '0');
const stripTz = (v: string) => v.replace(/\s*\(.*\)$/, '').trim(); // "05:12 (+03)" -> "05:12"

const cacheKey = (loc: PrayerLocation, method: number, y: number, m: number) =>
  `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}|${method}|${y}-${pad(m)}`;

export const fetchMonth = async (loc: PrayerLocation, method: number, year: number, month: number): Promise<CalendarCache> => {
  const url = `${API}/calendar/${year}/${month}?latitude=${loc.latitude.toFixed(2)}&longitude=${loc.longitude.toFixed(2)}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`aladhan ${res.status}`);
  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('aladhan bad payload');
  const days: DayTimings[] = json.data.map((d: any) => {
    const [dd, mm, yyyy] = String(d.date.gregorian.date).split('-');
    const timings: any = {};
    for (const k of [...PRAYER_KEYS, 'Imsak', 'Sunset', 'Midnight']) timings[k] = stripTz(d.timings[k] ?? '');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      timings,
      hijri: {
        day: Number(d.date.hijri.day),
        month: Number(d.date.hijri.month.number),
        year: Number(d.date.hijri.year),
        monthEn: d.date.hijri.month.en,
      },
      weekday: new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getDay(),
    } as DayTimings;
  });
  return { key: cacheKey(loc, method, year, month), fetchedAt: Date.now(), days };
};

/** Makes sure this month (and next month, when close to month end) are cached. Never throws. */
export const ensureCalendars = async (): Promise<void> => {
  const { location, method, calendars, upsertCalendar } = usePrayerStore.getState();
  if (!location) return;
  const now = new Date();
  const wanted: [number, number][] = [[now.getFullYear(), now.getMonth() + 1]];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (daysInMonth - now.getDate() < 12) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    wanted.push([next.getFullYear(), next.getMonth() + 1]);
  }
  for (const [y, m] of wanted) {
    const key = cacheKey(location, method, y, m);
    if (calendars.some(c => c.key === key)) continue;
    try {
      upsertCalendar(await fetchMonth(location, method, y, m));
    } catch (e) {
      console.warn('calendar fetch failed', e);
    }
  }
};

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const getDayTimings = (date: Date = new Date()): DayTimings | null => {
  const { location, method, calendars } = usePrayerStore.getState();
  if (!location) return null;
  const key = cacheKey(location, method, date.getFullYear(), date.getMonth() + 1);
  const cal = calendars.find(c => c.key === key);
  return cal?.days.find(d => d.date === toDateKey(date)) ?? null;
};

export const timingToDate = (day: DayTimings, key: keyof DayTimings['timings']): Date => {
  const [y, m, d] = day.date.split('-').map(Number);
  const [hh, mm] = day.timings[key].split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

export interface NextPrayerInfo {
  key: PrayerKey;
  at: Date;
  previousKey: PrayerKey;
  previousAt: Date;
  /** 0..1 progress from previous prayer to next */
  progress: number;
  /** Currently active prayer window (the prayer whose time has come). */
  currentKey: PrayerKey;
}

export const getNextPrayer = (now: Date = new Date()): NextPrayerInfo | null => {
  const today = getDayTimings(now);
  if (!today) return null;
  const tomorrowDate = new Date(now); tomorrowDate.setDate(now.getDate() + 1);
  const yesterdayDate = new Date(now); yesterdayDate.setDate(now.getDate() - 1);
  const tomorrow = getDayTimings(tomorrowDate);
  const yesterday = getDayTimings(yesterdayDate);

  const seq: { key: PrayerKey; at: Date }[] = [];
  if (yesterday) seq.push({ key: 'Isha', at: timingToDate(yesterday, 'Isha') });
  for (const k of PRAYER_KEYS) seq.push({ key: k, at: timingToDate(today, k) });
  if (tomorrow) seq.push({ key: 'Fajr', at: timingToDate(tomorrow, 'Fajr') });
  else {
    // Fallback: today's Fajr + 24h
    const f = timingToDate(today, 'Fajr'); f.setDate(f.getDate() + 1);
    seq.push({ key: 'Fajr', at: f });
  }

  const idx = seq.findIndex(s => s.at.getTime() > now.getTime());
  if (idx <= 0) return null;
  const next = seq[idx];
  const prev = seq[idx - 1];
  const span = next.at.getTime() - prev.at.getTime();
  const progress = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - prev.at.getTime()) / span)) : 0;
  return { key: next.key, at: next.at, previousKey: prev.key, previousAt: prev.at, progress, currentKey: prev.key };
};

export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

export const prayerName = (k: PrayerKey): string => t(`prayer.${k.toLowerCase()}`);

// ---- Scheduling ----

const messageFor = (key: PrayerKey, date: Date): string => {
  if (currentLanguage() === 'tr') {
    const list = PRAYER_MESSAGES_TR[key] ?? [];
    if (list.length) return list[Math.floor(date.getTime() / 86_400_000) % list.length];
  }
  const en: Record<PrayerKey, string> = {
    Fajr: 'A new day begins with remembrance. Time for Fajr.',
    Sunrise: 'The sun has risen. Fajr time has ended.',
    Dhuhr: 'Pause the day for a moment of peace. Time for Dhuhr.',
    Asr: 'The afternoon calls you to prayer. Time for Asr.',
    Maghrib: 'The day closes; turn back to your Lord. Time for Maghrib.',
    Isha: 'Seal the day with prayer. Time for Isha.',
  };
  return en[key];
};

/**
 * Re-schedules every local notification from scratch:
 * prayer times for the next N days (+ optional pre-reminders) and holy-night reminders.
 * Safe to call often; it's a no-op without permission or location.
 */
export const rescheduleAllNotifications = async (): Promise<void> => {
  const s = usePrayerStore.getState();
  if (!s.location) return;
  if (!(await hasNotificationPermission())) return;

  await ensureCalendars();
  await cancelAllNotifications();

  const enabled = PRAYER_KEYS.filter(k => s.notificationPrefs[k]);
  const holyBudget = s.holyNightReminders ? 3 : 0;
  const perDay = enabled.length * (s.preReminderMinutes > 0 ? 2 : 1);
  const days = perDay > 0 ? Math.max(1, Math.min(12, Math.floor((MAX_SCHEDULED - holyBudget) / perDay))) : 0;

  const now = new Date();
  let scheduled = 0;
  for (let i = 0; i < days; i++) {
    const date = new Date(now); date.setDate(now.getDate() + i);
    const day = getDayTimings(date);
    if (!day) continue;
    for (const key of enabled) {
      const at = timingToDate(day, key);
      if (at.getTime() <= now.getTime()) continue;
      const name = prayerName(key);
      const isFriday = key === 'Dhuhr' && date.getDay() === 5;
      const title = isFriday ? `${t('prayer.friday')} · ${name}` : t('prayer.notifTitle', { name });
      await scheduleAt({ title, body: messageFor(key, date), date: at, sound: s.sound, data: { prayer: key } });
      scheduled++;
      if (s.preReminderMinutes > 0) {
        const pre = new Date(at.getTime() - s.preReminderMinutes * 60_000);
        await scheduleAt({
          title: t('prayer.preReminderTitle', { prayer: name, min: s.preReminderMinutes }),
          body: t('prayer.preReminderBody'),
          date: pre,
          sound: 'silent',
          data: { prayer: key, pre: true },
        });
        scheduled++;
      }
    }
  }

  if (s.holyNightReminders) {
    for (const hd of upcomingHolyDays(now).slice(0, holyBudget)) {
      const evening = new Date(hd.date);
      evening.setDate(evening.getDate() - 1);
      evening.setHours(18, 0, 0, 0);
      const name = t(`calendar.names.${hd.key}`);
      const body = t(hd.isNight ? 'prayer.holyTonight' : 'prayer.holyTomorrow', { name });
      await scheduleAt({ title: name, body, date: evening, holy: true, data: { holy: hd.key } });
    }
  }

  s.setLastScheduledAt(Date.now());
};

/** Call on app start / resume: refresh calendars and top up notifications at most once a day. */
export const refreshPrayerData = async (force = false): Promise<void> => {
  await ensureCalendars();
  const { lastScheduledAt } = usePrayerStore.getState();
  if (force || Date.now() - lastScheduledAt > 20 * 3600_000) {
    await rescheduleAllNotifications();
  }
};

export const soundLabel = (s: NotificationSound): string => t(`prayer.sound${s.charAt(0).toUpperCase()}${s.slice(1)}`);
