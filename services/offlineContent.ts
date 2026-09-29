import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

/**
 * Reads a bundled `.jsondata` asset (see metro.config.js + scripts/buildOfflineContent.py)
 * and parses it as JSON. Results are memoised per module id, so each file is read from disk
 * and parsed at most once per app session.
 */
const cache = new Map<number, Promise<unknown>>();

export function readAssetJson<T>(moduleId: number): Promise<T> {
  let pending = cache.get(moduleId);
  if (!pending) {
    pending = (async () => {
      const asset = Asset.fromModule(moduleId);
      if (!asset.localUri) await asset.downloadAsync(); // copies out of the app bundle on first use
      const text = await new File(asset.localUri!).text();
      return JSON.parse(text.replace(/^\uFEFF/, ''));
    })();
    pending.catch(() => cache.delete(moduleId)); // let a transient failure be retried
    cache.set(moduleId, pending);
  }
  return pending as Promise<T>;
}
