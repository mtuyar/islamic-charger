// Account-less backup: dumps every AsyncStorage key to a JSON file the user can
// share (iCloud Drive, Google Drive, AirDrop…) and restore later.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { t } from '../i18n';

const VERSION = 1;
/** Keys that are pure caches — skipped to keep the file small. */
const SKIP_PREFIXES = ['hadith_chapters_', '@quranwords/cache', 'surahList.'];

interface BackupFile {
  app: 'ruhnevaz';
  version: number;
  createdAt: string;
  data: Record<string, string>;
}

export const exportBackup = async (): Promise<string> => {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => !SKIP_PREFIXES.some(p => k.startsWith(p)));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) if (v !== null) data[k] = v;
  const payload: BackupFile = { app: 'ruhnevaz', version: VERSION, createdAt: new Date().toISOString(), data };
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}ruhnevaz-yedek-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: t('backup.dialogTitle') });
  }
  return uri;
};

/** Returns number of restored keys, or null if the user cancelled. Throws on invalid file. */
export const importBackup = async (): Promise<number | null> => {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  const raw = await FileSystem.readAsStringAsync(res.assets[0].uri);
  const parsed = JSON.parse(raw) as BackupFile;
  if (parsed?.app !== 'ruhnevaz' || typeof parsed.data !== 'object') throw new Error('invalid-backup');
  const entries = Object.entries(parsed.data).filter(([, v]) => typeof v === 'string') as [string, string][];
  await AsyncStorage.multiSet(entries);
  return entries.length;
};

export const clearCaches = async (): Promise<void> => {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => SKIP_PREFIXES.some(p => k.startsWith(p)));
  if (keys.length) await AsyncStorage.multiRemove(keys);
};
