import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedAyah, SavedHadith, ReadEntry } from '../types';

const KEYS = {
    savedAyahs: 'saved_ayahs',
    savedHadiths: 'saved_hadiths',
    readEntries: 'read_entries',
};

const load = async <T>(key: string): Promise<T[]> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const save = async <T>(key: string, items: T[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch {
        // ignore storage errors
    }
};

// --- Saved Ayahs ---
export const getSavedAyahs = (): Promise<SavedAyah[]> => load(KEYS.savedAyahs);

export const saveAyah = async (ayah: SavedAyah): Promise<void> => {
    const items = await getSavedAyahs();
    if (items.find(a => a.id === ayah.id)) return;
    await save(KEYS.savedAyahs, [ayah, ...items]);
};

export const removeSavedAyah = async (id: string): Promise<void> => {
    const items = await getSavedAyahs();
    await save(KEYS.savedAyahs, items.filter(a => a.id !== id));
};

// --- Saved Hadiths ---
export const getSavedHadiths = (): Promise<SavedHadith[]> => load(KEYS.savedHadiths);

export const saveHadith = async (hadith: SavedHadith): Promise<void> => {
    const items = await getSavedHadiths();
    if (items.find(h => h.id === hadith.id)) return;
    await save(KEYS.savedHadiths, [hadith, ...items]);
};

export const removeSavedHadith = async (id: string): Promise<void> => {
    const items = await getSavedHadiths();
    await save(KEYS.savedHadiths, items.filter(h => h.id !== id));
};

// --- Read Entries (Okunanlar) ---
export const getReadEntries = (): Promise<ReadEntry[]> => load(KEYS.readEntries);

export const markRead = async (entry: ReadEntry): Promise<void> => {
    const items = await getReadEntries();
    const filtered = items.filter(e => e.id !== entry.id);
    const newItems = [entry, ...filtered].slice(0, 100);
    await save(KEYS.readEntries, newItems);
};

export const clearReadEntries = async (): Promise<void> => {
    await save(KEYS.readEntries, []);
};
