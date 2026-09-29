// Offline Hijri conversion (Kuwaiti / tabular algorithm) + Islamic holy days.
// Accuracy: ±1 day vs. moon-sighting based calendars. When the Aladhan calendar
// cache is available we prefer its Umm al-Qura dates (see prayerTimes.ts).

export interface HijriDate {
  day: number;
  month: number; // 1–12
  year: number;
}

export const HIJRI_MONTHS_TR = [
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir',
  'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
];
export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah',
];

const gregorianToJD = (y: number, m: number, d: number): number => {
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;
};

const jdToGregorian = (jd: number): Date => {
  const z = Math.floor(jd + 0.5);
  const a0 = Math.floor((z - 1867216.25) / 36524.25);
  const a = z + 1 + a0 - Math.floor(a0 / 4);
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return new Date(year, month - 1, day);
};

const HIJRI_EPOCH = 1948439.5;

const hijriToJD = (y: number, m: number, d: number): number =>
  d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + HIJRI_EPOCH - 1;

export const gregorianToHijri = (date: Date): HijriDate => {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const year = Math.floor((30 * (jd - HIJRI_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + hijriToJD(year, 1, 1))) / 29.5) + 1);
  const day = jd - hijriToJD(year, month, 1) + 1;
  return { day, month, year };
};

export const hijriToGregorian = (h: HijriDate): Date => jdToGregorian(hijriToJD(h.year, h.month, h.day));

export const formatHijri = (h: HijriDate, lang: 'tr' | 'en'): string =>
  `${h.day} ${(lang === 'tr' ? HIJRI_MONTHS_TR : HIJRI_MONTHS_EN)[h.month - 1]} ${h.year}`;

// ---- Holy days ----

export type HolyDayKey =
  | 'hijriNewYear' | 'ashura' | 'mawlid' | 'ragaib' | 'miraj' | 'baraat'
  | 'ramadanStart' | 'qadr' | 'eidFitr' | 'arafah' | 'eidAdha';

export interface HolyDay {
  key: HolyDayKey;
  /** Gregorian date of the day itself. */
  date: Date;
  /** Kandil nights are observed on the evening *before* `date`. */
  isNight: boolean;
  hijri: HijriDate;
  durationDays: number;
}

const firstFridayOfMonth = (year: number, month: number): number => {
  for (let d = 1; d <= 7; d++) {
    if (hijriToGregorian({ year, month, day: d }).getDay() === 5) return d;
  }
  return 1;
};

/** All holy days for a hijri year. */
export const holyDaysForHijriYear = (year: number): HolyDay[] => {
  const mk = (key: HolyDayKey, month: number, day: number, isNight: boolean, durationDays = 1): HolyDay => {
    const hijri = { year, month, day };
    return { key, date: hijriToGregorian(hijri), isNight, hijri, durationDays };
  };
  return [
    mk('hijriNewYear', 1, 1, false),
    mk('ashura', 1, 10, false),
    mk('mawlid', 3, 12, true),
    // Regaib: the night before the first Friday of Rajab
    mk('ragaib', 7, firstFridayOfMonth(year, 7), true),
    mk('miraj', 7, 27, true),
    mk('baraat', 8, 15, true),
    mk('ramadanStart', 9, 1, false),
    mk('qadr', 9, 27, true),
    mk('eidFitr', 10, 1, false, 3),
    mk('arafah', 12, 9, false),
    mk('eidAdha', 12, 10, false, 4),
  ];
};

/** Holy days from today across the next ~13 months, sorted. */
export const upcomingHolyDays = (from: Date = new Date(), includePastDays = 0): HolyDay[] => {
  const h = gregorianToHijri(from);
  const all = [...holyDaysForHijriYear(h.year), ...holyDaysForHijriYear(h.year + 1)];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - includePastDays);
  return all
    .filter(d => d.date.getTime() >= start.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const isRamadan = (h: HijriDate): boolean => h.month === 9;

export const daysUntil = (date: Date, from: Date = new Date()): number => {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(date); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
};
