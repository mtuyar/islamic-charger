import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import tr from './tr';
import en from './en';

export type Language = 'tr' | 'en';

export const i18n = new I18n({ tr, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'tr';

export const detectDeviceLanguage = (): Language => {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'tr' ? 'tr' : 'en';
};

i18n.locale = detectDeviceLanguage();

export const setLanguage = (lang: Language) => {
  i18n.locale = lang;
};

/** Shorthand: t('prayer.fajr'), t('home.dueReviews', { count: 3 }) */
export const t = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options);

export const currentLanguage = (): Language => (i18n.locale.startsWith('tr') ? 'tr' : 'en');
