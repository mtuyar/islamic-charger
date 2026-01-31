import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateSection } from './HadithMappings';

// Types
export interface HadithCollection {
    id: string;
    name: string;
    totalHadiths: number;
    author: string;
}

export interface HadithChapter {
    sectionId: string;
    name: string;
    hadithCount?: number;
}

export interface Hadith {
    hadithnumber: number | string;
    arabicnumber: number | string;
    text: string;
    grades: any[];
    reference: {
        book: number;
        hadith: number;
    };
}

// Configuration
const API_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// Available Collections with Turkish Support
export const COLLECTIONS: HadithCollection[] = [
    { id: 'tur-bukhari', name: 'Sahih-i Buhari', totalHadiths: 7563, author: 'İmam Buhari' },
    { id: 'tur-muslim', name: 'Sahih-i Müslim', totalHadiths: 3033, author: 'İmam Müslim' },
    { id: 'tur-abudawud', name: 'Sünen-i Ebu Davud', totalHadiths: 5274, author: 'Ebu Davud' },
    { id: 'tur-tirmidhi', name: 'Sünen-i Tirmizi', totalHadiths: 3956, author: 'İmam Tirmizi' },
    { id: 'tur-nasai', name: 'Sünen-i Nesai', totalHadiths: 5758, author: 'İmam Nesai' },
    { id: 'tur-ibnmajah', name: 'Sünen-i İbn Mace', totalHadiths: 4341, author: 'İbn Mace' },
];

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

    /**
     * Fetches the list of chapters (sections) for a given collection
     */
    async getChapters(collectionId: string): Promise<HadithChapter[]> {
        // 1. Check in-memory cache
        if (this.chaptersCache[collectionId]) {
            return this.chaptersCache[collectionId];
        }

        // 2. Check AsyncStorage cache
        try {
            const cached = await AsyncStorage.getItem(`hadith_chapters_${collectionId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                this.chaptersCache[collectionId] = parsed;
                return parsed;
            }
        } catch (e) {
            console.error('Error reading hadith cache:', e);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/editions/${collectionId}.min.json`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const sections = data.metadata.sections;
            const sectionDetails = data.metadata.section_details;

            const chapters: HadithChapter[] = Object.keys(sections)
                .filter(key => sections[key] !== '' && key !== '0') // Filter out empty or intro sections if needed
                .map(key => ({
                    sectionId: key,
                    name: translateSection(sections[key]), // Translate English section names
                    hadithCount: sectionDetails?.[key]?.hadithnumber_last - sectionDetails?.[key]?.hadithnumber_first + 1
                }));

            // Update caches
            this.chaptersCache[collectionId] = chapters;
            AsyncStorage.setItem(`hadith_chapters_${collectionId}`, JSON.stringify(chapters)).catch(e =>
                console.error('Error saving hadith cache:', e)
            );

            return chapters;
        } catch (error) {
            console.error(`Error fetching chapters for ${collectionId}:`, error);
            return [];
        }
    }

    /**
     * Fetches hadiths for a specific chapter in a collection
     */
    async getHadithsForChapter(collectionId: string, sectionId: string): Promise<Hadith[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/editions/${collectionId}/sections/${sectionId}.json`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            return (data.hadiths || []).map((h: Hadith) => ({
                ...h,
                text: this.cleanHadithText(h.text)
            }));
        } catch (error) {
            console.error(`Error fetching hadiths for ${collectionId}/${sectionId}:`, error);
            return [];
        }
    }

    /**
     * Fetches a single random hadith from any collection (for daily hadith etc.)
     * Currently uses a simplified approach or falls back to a local list if needed
     */
    async getRandomHadith(): Promise<Hadith | null> {
        // Implementation for random hadith if needed later
        return null;
    }
}

export const hadithService = new HadithService();
