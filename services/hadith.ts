import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateSection } from './HadithMappings';
import { HADITH_META, HADITH_SECTION_ASSETS } from '../data/offlineAssets';
import { readAssetJson } from './offlineContent';
import { t, currentLanguage } from '../i18n';

// Types
export interface HadithCollection {
    id: string;
    name: string;
    totalHadiths: number;
    author: string;
}

export interface HadithChapter {
    sectionId: string;
    /** Turkish display name (translated from the API's English section name) */
    name: string;
    /** Original English section name from the API (shown when the UI language is English) */
    nameEn?: string;
    hadithCount?: number;
}

export interface Hadith {
    hadithnumber: number | string;
    arabicnumber: number | string;
    text: string;
    arabicText?: string;
    grades: any[];
    reference: {
        book: number;
        hadith: number;
    };
}

// Configuration
const API_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

/** Collections shipped inside the app (see scripts/buildOfflineContent.py); the rest stream from the CDN. */
export const isEmbeddedCollection = (collectionId: string): boolean => collectionId in HADITH_SECTION_ASSETS;

// Available Collections with Turkish Support
export const COLLECTIONS: HadithCollection[] = [
    { id: 'tur-bukhari', name: 'Sahih-i Buhari', totalHadiths: 7563, author: 'İmam Buhari' },
    { id: 'tur-muslim', name: 'Sahih-i Müslim', totalHadiths: 3033, author: 'İmam Müslim' },
    { id: 'tur-abudawud', name: 'Sünen-i Ebu Davud', totalHadiths: 5274, author: 'Ebu Davud' },
    { id: 'tur-tirmidhi', name: 'Sünen-i Tirmizi', totalHadiths: 3956, author: 'İmam Tirmizi' },
    { id: 'tur-nasai', name: 'Sünen-i Nesai', totalHadiths: 5758, author: 'İmam Nesai' },
    { id: 'tur-ibnmajah', name: 'Sünen-i İbn Mace', totalHadiths: 4341, author: 'İbn Mace' },
];

/** Localized collection title (e.g. "Sahih-i Buhari" / "Sahih al-Bukhari"). */
export const collectionName = (col: Pick<HadithCollection, 'id' | 'name'>): string => {
    const key = `hadith.col_${col.id.replace(/^tur-/, '')}`;
    const v = t(key);
    return v && !v.startsWith('[missing') ? v : col.name;
};

/** Localized compiler name (e.g. "İmam Buhari" / "Imam al-Bukhari"). */
export const collectionAuthor = (col: Pick<HadithCollection, 'id' | 'author'>): string => {
    const key = `hadith.author_${col.id.replace(/^tur-/, '')}`;
    const v = t(key);
    return v && !v.startsWith('[missing') ? v : col.author;
};

/** Chapter title in the current UI language (English API name when available in EN mode). */
export const chapterDisplayName = (ch: Pick<HadithChapter, 'name' | 'nameEn'>): string =>
    currentLanguage() === 'en' && ch.nameEn ? ch.nameEn : ch.name;

class HadithService {
    // Cache for chapters to avoid repeated network calls
    private chaptersCache: { [key: string]: HadithChapter[] } = {};

    /**
     * Cleans the hadith text from artifacts and fixes encoding issues
     */
    private cleanHadithText(text: string): string {
        if (!text) return '';

        let cleaned = text;

        // Remove "TIKLA" artifacts (common in scraped data)
        cleaned = cleaned.replace(/BUHARİ’NİN.*?TIKLAYIN/gi, '');
        cleaned = cleaned.replace(/İZAH İÇİN BURAYA TIKLAYIN/gi, '');
        cleaned = cleaned.replace(/BURAYA TIKLA/gi, '');
        cleaned = cleaned.replace(/Tekrarı:.*$/gi, ''); // Remove "Tekrarı: 123, 456" at the end
        cleaned = cleaned.replace(/Diğer Tahric:.*$/gi, ''); // Remove "Diğer Tahric: ..."
        cleaned = cleaned.replace(/AÇIKLAMA.*$/gi, ''); // Remove "AÇIKLAMA 123'te"

        // Fix common encoding issues if any (though usually JSON handles this, sometimes source is bad)
        // Example: "Ã¼" -> "ü" (not needed if source is valid UTF-8 JSON, but good to have if we see issues)
        // For now, we trust the JSON parser but keep an eye on specific chars.
        // The user mentioned "ğ" issues. If it's a font issue, we can't fix it here.
        // If it's data, we might need specific replacements.

        return cleaned.trim();
    }

    private buildChapters(
        sections: Record<string, string>,
        sectionDetails?: Record<string, { hadithnumber_first: number; hadithnumber_last: number }>,
    ): HadithChapter[] {
        return Object.keys(sections)
            .filter(key => sections[key] !== '' && key !== '0') // Filter out empty or intro sections if needed
            .map(key => {
                const d = sectionDetails?.[key];
                return {
                    sectionId: key,
                    name: translateSection(sections[key]), // Translate English section names
                    nameEn: sections[key],
                    hadithCount: d ? d.hadithnumber_last - d.hadithnumber_first + 1 : undefined,
                };
            });
    }

    /** Turkish hadiths of one section: bundled asset for embedded collections, CDN otherwise. */
    private async loadSection(collectionId: string, sectionId: string): Promise<Hadith[]> {
        const mod = HADITH_SECTION_ASSETS[collectionId]?.[sectionId];
        if (mod) {
            const data = await readAssetJson<{ hadiths: Hadith[] }>(mod);
            return data.hadiths ?? [];
        }
        const response = await fetch(`${API_BASE_URL}/editions/${collectionId}/sections/${sectionId}.json`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.hadiths ?? [];
    }

    /**
     * Fetches the list of chapters (sections) for a given collection
     */
    async getChapters(collectionId: string): Promise<HadithChapter[]> {
        // 1. Check in-memory cache
        if (this.chaptersCache[collectionId]) {
            return this.chaptersCache[collectionId];
        }

        // 1b. Embedded collections: build from bundled metadata, no network / AsyncStorage needed
        const meta = HADITH_META[collectionId];
        if (meta) {
            const chapters = this.buildChapters(meta.sections, meta.section_details);
            this.chaptersCache[collectionId] = chapters;
            return chapters;
        }

        // 2. Check AsyncStorage cache
        let staleCache: HadithChapter[] | null = null;
        try {
            const cached = await AsyncStorage.getItem(`hadith_chapters_${collectionId}`);
            if (cached) {
                const parsed: HadithChapter[] = JSON.parse(cached);
                // Caches written before `nameEn` existed: keep as fallback, but try to refresh from network
                if (parsed.length === 0 || parsed[0].nameEn !== undefined) {
                    this.chaptersCache[collectionId] = parsed;
                    return parsed;
                }
                staleCache = parsed;
            }
        } catch (e) {
            console.error('Error reading hadith cache:', e);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/editions/${collectionId}.min.json`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const chapters = this.buildChapters(data.metadata.sections, data.metadata.section_details);

            // Update caches
            this.chaptersCache[collectionId] = chapters;
            AsyncStorage.setItem(`hadith_chapters_${collectionId}`, JSON.stringify(chapters)).catch(e =>
                console.error('Error saving hadith cache:', e)
            );

            return chapters;
        } catch (error) {
            console.error(`Error fetching chapters for ${collectionId}:`, error);
            if (staleCache) {
                this.chaptersCache[collectionId] = staleCache;
                return staleCache;
            }
            return [];
        }
    }

    /**
     * Fetches hadiths for a specific chapter in a collection
     */
    async getHadithsForChapter(collectionId: string, sectionId: string): Promise<Hadith[]> {
        try {
            const araCollectionId = collectionId.replace('tur-', 'ara-');
            // Arabic text is not bundled; it is a best-effort network enrichment.
            const [hadiths, arabicResponse] = await Promise.all([
                this.loadSection(collectionId, sectionId),
                fetch(`${API_BASE_URL}/editions/${araCollectionId}/sections/${sectionId}.json`).catch(() => null)
            ]);

            let arabicData = null;
            if (arabicResponse && arabicResponse.ok) {
                arabicData = await arabicResponse.json().catch(() => null);
            }

            return hadiths.map((h: Hadith) => {
                const arabicMatch = arabicData?.hadiths?.find((ah: any) => ah.hadithnumber === h.hadithnumber);
                return {
                    ...h,
                    text: this.cleanHadithText(h.text),
                    arabicText: arabicMatch ? this.cleanHadithText(arabicMatch.text) : undefined
                };
            });
        } catch (error) {
            console.error(`Error fetching hadiths for ${collectionId}/${sectionId}:`, error);
            return [];
        }
    }

    // In-memory cache for full collections (search)
    private fullCollectionCache: { [key: string]: Hadith[] } = {};

    async searchInCollection(collectionId: string, query: string): Promise<Hadith[]> {
        if (!query.trim()) return [];

        let hadiths = this.fullCollectionCache[collectionId];

        if (!hadiths) {
            try {
                let raw: Hadith[];
                const embedded = HADITH_SECTION_ASSETS[collectionId];
                if (embedded) {
                    const sections = await Promise.all(Object.keys(embedded).map(id => this.loadSection(collectionId, id)));
                    raw = sections.flat();
                } else {
                    const response = await fetch(`${API_BASE_URL}/editions/${collectionId}.min.json`);
                    if (!response.ok) throw new Error('Network error');
                    raw = (await response.json()).hadiths || [];
                }
                hadiths = raw.map((h: Hadith) => ({
                    ...h,
                    text: this.cleanHadithText(h.text),
                }));
                this.fullCollectionCache[collectionId] = hadiths;
            } catch {
                return [];
            }
        }

        const q = query.toLowerCase().trim();
        const numQuery = parseInt(q, 10);
        
        return hadiths.filter(h => {
            if (!isNaN(numQuery) && h.hadithnumber == numQuery) return true;
            return h.text.toLowerCase().includes(q);
        }).slice(0, 50);
    }

    async getRandomHadith(): Promise<Hadith | null> {
        return null;
    }
}

export const hadithService = new HadithService();
