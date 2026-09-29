import { useColorScheme } from 'react-native';
import { useSettingsStore, ReadingTheme } from '../store/useSettingsStore';

export interface Palette {
  isDark: boolean;
  style: ReadingTheme;
  bg: string;
  bgElevated: string;
  card: string;
  cardAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  gold: string;
  goldSoft: string;
  danger: string;
  success: string;
  overlay: string;
  tabBar: string;
}

export const LIGHT: Palette = {
  isDark: false,
  style: 'default',
  bg: '#fcfbf9',
  bgElevated: '#ffffff',
  card: '#ffffff',
  cardAlt: '#f5f5f4',
  border: '#ecebe7',
  borderStrong: '#dcdad4',
  text: '#1c1917',
  textSecondary: '#6b655f',
  textMuted: '#9c958d',
  accent: '#0f8a5f',
  accentSoft: '#e6f4ee',
  accentText: '#065f46',
  gold: '#b8860b',
  goldSoft: '#fbf3dc',
  danger: '#dc2626',
  success: '#16a34a',
  overlay: 'rgba(28,25,23,0.45)',
  tabBar: 'rgba(252,251,249,0.94)',
};

export const DARK: Palette = {
  isDark: true,
  style: 'default',
  bg: '#070c17',
  bgElevated: '#0d1424',
  card: '#111a2c',
  cardAlt: '#1a2539',
  border: '#1d283b',
  borderStrong: '#2b3850',
  text: '#f3f5f9',
  textSecondary: '#a3adbf',
  textMuted: '#6c7789',
  accent: '#34d399',
  accentSoft: 'rgba(52,211,153,0.13)',
  accentText: '#7ee2b8',
  gold: '#e6c36a',
  goldSoft: 'rgba(230,195,106,0.13)',
  danger: '#f87171',
  success: '#4ade80',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(7,12,23,0.94)',
};

/** Warm paper look — light. */
export const SEPIA_LIGHT: Palette = {
  ...LIGHT,
  style: 'sepia',
  bg: '#f4ecdc',
  bgElevated: '#faf4e8',
  card: '#fbf7ee',
  cardAlt: '#efe5d0',
  border: '#e6dac2',
  borderStrong: '#d3c3a3',
  text: '#3b2f1e',
  textSecondary: '#77644a',
  textMuted: '#a08c6c',
  accent: '#1f7a55',
  accentSoft: '#e2ecdf',
  accentText: '#175d40',
  gold: '#a8781a',
  goldSoft: '#f3e6c6',
  overlay: 'rgba(59,47,30,0.45)',
  tabBar: 'rgba(244,236,220,0.94)',
};

/** Warm dark ("kahve") — sepia's night twin. */
export const SEPIA_DARK: Palette = {
  ...DARK,
  style: 'sepia',
  bg: '#1a1410',
  bgElevated: '#221a14',
  card: '#27201a',
  cardAlt: '#352b22',
  border: '#352a1f',
  borderStrong: '#4d3e30',
  text: '#f1e7d6',
  textSecondary: '#bfae93',
  textMuted: '#8c7b64',
  accent: '#4fbf8f',
  accentSoft: 'rgba(79,191,143,0.14)',
  accentText: '#8ddab8',
  gold: '#e0b96a',
  goldSoft: 'rgba(224,185,106,0.14)',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(26,20,16,0.94)',
};

/** Pure black for OLED screens. */
export const AMOLED: Palette = {
  ...DARK,
  style: 'amoled',
  bg: '#000000',
  bgElevated: '#050505',
  card: '#0b0b0b',
  cardAlt: '#161616',
  border: '#1c1c1c',
  borderStrong: '#2c2c2c',
  text: '#f5f5f5',
  textSecondary: '#a0a0a0',
  textMuted: '#6a6a6a',
  tabBar: 'rgba(0,0,0,0.94)',
};

export const resolvePalette = (isDark: boolean, style: ReadingTheme): Palette => {
  if (style === 'sepia') return isDark ? SEPIA_DARK : SEPIA_LIGHT;
  if (style === 'amoled') return isDark ? AMOLED : LIGHT;
  return isDark ? DARK : LIGHT;
};

/** Resolves the effective palette from theme mode + style + system scheme. */
export const useTheme = (): Palette => {
  const mode = useSettingsStore((s) => s.themeMode);
  const style = useSettingsStore((s) => s.readingTheme);
  const system = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return resolvePalette(isDark, style);
};

/** Legacy helper for components that still take a `darkMode` boolean. */
export const useIsDark = (): boolean => useTheme().isDark;

/**
 * Non-hook palette lookup for legacy components that receive `darkMode` as a prop.
 * Their parent re-renders on theme changes, so reading the store here is enough.
 */
export const paletteFor = (isDark: boolean): Palette =>
  resolvePalette(isDark, useSettingsStore.getState().readingTheme);

export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 28 };
export const SPACING = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 };
export const FONT = {
  light: 'PlusJakartaSans_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};
