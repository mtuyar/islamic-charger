// App-wide library state: surah list, saved items, read history, last-read position.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Surah, SavedAyah, SavedHadith, ReadEntry } from '../types';
import { getSurahList } from '../services/api';
import {
  getSavedAyahs, saveAyah, removeSavedAyah, getSavedHadiths, saveHadith, removeSavedHadith,
  getReadEntries, markRead, clearReadEntries,
} from '../services/favorites';

interface LibraryState {
  surahs: Surah[];
  surahsLoading: boolean;
  surahsError: boolean;
  savedAyahs: SavedAyah[];
  savedHadiths: SavedHadith[];
  readEntries: ReadEntry[];
  lastReadSurahId: number | null;
  lastReadAyahNumber: number | undefined;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  loadSurahs: () => Promise<void>;
  toggleSavedAyah: (a: SavedAyah) => Promise<void>;
  removeAyah: (id: string) => Promise<void>;
  toggleSavedHadith: (h: SavedHadith) => Promise<void>;
  removeHadith: (id: string) => Promise<void>;
  addReadEntry: (e: ReadEntry) => Promise<void>;
  clearRead: () => Promise<void>;
  setLastRead: (surahId: number, ayah?: number) => void;
}

const SURAH_CACHE_KEY = 'surahList.v1';

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  surahs: [],
  surahsLoading: false,
  surahsError: false,
  savedAyahs: [],
  savedHadiths: [],
  readEntries: [],
  lastReadSurahId: null,
  lastReadAyahNumber: undefined,
  hydrated: false,

  hydrate: async () => {
    try {
      const [ayahs, hadiths, entries, lastSurah, lastAyah, cachedSurahs] = await Promise.all([
        getSavedAyahs(), getSavedHadiths(), getReadEntries(),
        AsyncStorage.getItem('lastReadSurahId'), AsyncStorage.getItem('lastReadAyahNumber'),
        AsyncStorage.getItem(SURAH_CACHE_KEY),
      ]);
      set({
        savedAyahs: ayahs,
        savedHadiths: hadiths,
        readEntries: entries,
        lastReadSurahId: lastSurah ? parseInt(lastSurah, 10) : null,
        lastReadAyahNumber: lastAyah ? parseInt(lastAyah, 10) : undefined,
        surahs: cachedSurahs ? JSON.parse(cachedSurahs) : [],
        hydrated: true,
      });
    } catch (e) {
      set({ hydrated: true });
    }
    get().loadSurahs();
  },

  loadSurahs: async () => {
    if (get().surahsLoading) return;
    set({ surahsLoading: true, surahsError: false });
    const list = await getSurahList();
    if (list.length) {
      set({ surahs: list, surahsLoading: false });
      AsyncStorage.setItem(SURAH_CACHE_KEY, JSON.stringify(list)).catch(() => {});
    } else {
      set({ surahsLoading: false, surahsError: get().surahs.length === 0 });
    }
  },

  toggleSavedAyah: async (ayah) => {
    const exists = get().savedAyahs.some(a => a.id === ayah.id);
    if (exists) {
      await removeSavedAyah(ayah.id);
      set(s => ({ savedAyahs: s.savedAyahs.filter(a => a.id !== ayah.id) }));
    } else {
      await saveAyah(ayah);
      set(s => ({ savedAyahs: [ayah, ...s.savedAyahs] }));
    }
  },
  removeAyah: async (id) => {
    await removeSavedAyah(id);
    set(s => ({ savedAyahs: s.savedAyahs.filter(a => a.id !== id) }));
  },
  toggleSavedHadith: async (h) => {
    const exists = get().savedHadiths.some(x => x.id === h.id);
    if (exists) {
      await removeSavedHadith(h.id);
      set(s => ({ savedHadiths: s.savedHadiths.filter(x => x.id !== h.id) }));
    } else {
      await saveHadith(h);
      set(s => ({ savedHadiths: [h, ...s.savedHadiths] }));
    }
  },
  removeHadith: async (id) => {
    await removeSavedHadith(id);
    set(s => ({ savedHadiths: s.savedHadiths.filter(x => x.id !== id) }));
  },
  addReadEntry: async (entry) => {
    await markRead(entry);
    set(s => ({ readEntries: [entry, ...s.readEntries.filter(e => e.id !== entry.id)].slice(0, 100) }));
  },
  clearRead: async () => {
    await clearReadEntries();
    set({ readEntries: [] });
  },
  setLastRead: (surahId, ayah) => {
    set({ lastReadSurahId: surahId, ...(ayah !== undefined ? { lastReadAyahNumber: ayah } : {}) });
    AsyncStorage.setItem('lastReadSurahId', String(surahId)).catch(() => {});
    if (ayah !== undefined) AsyncStorage.setItem('lastReadAyahNumber', String(ayah)).catch(() => {});
  },
}));
