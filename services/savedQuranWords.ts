import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuranApiWord } from './quranWordApi';

export interface SavedQuranWord extends QuranApiWord {
  savedAt: number;
}

const STORAGE_KEY = '@saved_quran_words';

export const getSavedWords = async (): Promise<SavedQuranWord[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleSavedWord = async (word: QuranApiWord): Promise<SavedQuranWord[]> => {
  const words = await getSavedWords();
  // Unique by normalized arabic or id? Using id is safer.
  const index = words.findIndex(w => w.id === word.id);
  
  if (index >= 0) {
    words.splice(index, 1);
  } else {
    words.unshift({ ...word, savedAt: Date.now() });
  }
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  return words;
};

export const removeSavedWord = async (id: string): Promise<SavedQuranWord[]> => {
  const words = await getSavedWords();
  const updated = words.filter(w => w.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
