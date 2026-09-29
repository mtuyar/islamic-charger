// Extra Quran data: alternative translation editions, per-ayah comparison, tafsir.
import { TRANSLATION_EDITIONS } from '../store/useSettingsStore';

const ALQURAN = 'https://api.alquran.cloud/v1';
const QURAN_COM = 'https://api.quran.com/api/v4';

export interface EditionAyah { numberInSurah: number; text: string }

const surahEditionCache = new Map<string, EditionAyah[]>();

/** Full surah in a given translation edition (cached in memory). */
export const getSurahEdition = async (surahId: number, edition: string): Promise<EditionAyah[]> => {
  const key = `${surahId}|${edition}`;
  const cached = surahEditionCache.get(key);
  if (cached) return cached;
  const res = await fetch(`${ALQURAN}/surah/${surahId}/${edition}`);
  if (!res.ok) throw new Error(`edition ${res.status}`);
  const json = await res.json();
  const ayahs: EditionAyah[] = (json.data?.ayahs ?? []).map((a: any) => ({ numberInSurah: a.numberInSurah, text: a.text }));
  if (!ayahs.length) throw new Error('empty edition');
  surahEditionCache.set(key, ayahs);
  return ayahs;
};

export interface Comparison { id: string; name: string; text: string }

/** All translations of one ayah in the user's language. */
export const compareAyah = async (globalAyahNumber: number, lang: 'tr' | 'en'): Promise<Comparison[]> => {
  const editions = TRANSLATION_EDITIONS.filter(e => e.lang === lang);
  const res = await fetch(`${ALQURAN}/ayah/${globalAyahNumber}/editions/${editions.map(e => e.id).join(',')}`);
  if (!res.ok) throw new Error(`compare ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map((d: any) => ({
    id: d.edition?.identifier,
    name: editions.find(e => e.id === d.edition?.identifier)?.name ?? d.edition?.name ?? '',
    text: d.text,
  }));
};

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export interface TafsirResult { name: string; text: string }

/** English: Ibn Kathir (abridged). Arabic: al-Muyassar. No Turkish tafsir is available via public APIs. */
export const getTafsir = async (surah: number, ayah: number, lang: 'tr' | 'en'): Promise<TafsirResult | null> => {
  if (lang === 'tr') return null;
  const res = await fetch(`${QURAN_COM}/tafsirs/169/by_ayah/${surah}:${ayah}`);
  if (!res.ok) throw new Error(`tafsir ${res.status}`);
  const json = await res.json();
  const text = stripHtml(json.tafsir?.text ?? '');
  if (!text) return null;
  return { name: json.tafsir?.resource_name ?? 'Ibn Kathir (Abridged)', text };
};

export const audioUrl = (reciterId: string, globalAyahNumber: number) =>
  `https://cdn.islamic.network/quran/audio/128/${reciterId}/${globalAyahNumber}.mp3`;
