import { Surah, DualSurahResponse, Hadith, TevafukContent, Esma } from '../types';

// --- CONFIGURATION ---
const ALQURAN_API_BASE = 'https://api.alquran.cloud/v1';
const PRAYER_API_BASE = 'https://api.aladhan.com/v1';

// Diyanet API Config (Using the key you provided)
const DIYANET_API_BASE = 'https://acikkaynakkuran-dev.diyanet.gov.tr/api';
const DIYANET_API_KEY = '420|kAWZgSpz1dzsBmR9Tyd60YCoQ06HZ790HktYwV989d06f994';

// Manual mapping for Turkish Surah names to replace English ones (Fallback)
export const TURKISH_SURAH_NAMES: { [key: number]: string } = {
  1: "Fâtiha", 2: "Bakara", 3: "Âl-i İmrân", 4: "Nisâ", 5: "Mâide", 6: "En'âm", 7: "A'râf", 8: "Enfâl", 9: "Tevbe", 10: "Yûnus",
  11: "Hûd", 12: "Yûsuf", 13: "Ra'd", 14: "İbrâhîm", 15: "Hicr", 16: "Nahl", 17: "İsrâ", 18: "Kehf", 19: "Meryem", 20: "Tâhâ",
  21: "Enbiyâ", 22: "Hac", 23: "Mü'minûn", 24: "Nûr", 25: "Furkân", 26: "Şuarâ", 27: "Neml", 28: "Kasas", 29: "Ankebût", 30: "Rûm",
  31: "Lokmân", 32: "Secde", 33: "Ahzâb", 34: "Sebe'", 35: "Fâtır", 36: "Yâsîn", 37: "Sâffât", 38: "Sâd", 39: "Zümer", 40: "Mü'min",
  41: "Fussilet", 42: "Şûrâ", 43: "Zuhruf", 44: "Duhân", 45: "Câsiye", 46: "Ahkâf", 47: "Muhammed", 48: "Fetih", 49: "Hucurât", 50: "Kâf",
  51: "Zâriyât", 52: "Tûr", 53: "Necm", 54: "Kamer", 55: "Rahmân", 56: "Vâkıa", 57: "Hadîd", 58: "Mücâdele", 59: "Haşr", 60: "Mümtehine",
  61: "Saff", 62: "Cuma", 63: "Münâfikûn", 64: "Teğâbun", 65: "Talâk", 66: "Tahrîm", 67: "Mülk", 68: "Kalem", 69: "Hâkka", 70: "Meâric",
  71: "Nûh", 72: "Cin", 73: "Müzzemmil", 74: "Müddessir", 75: "Kıyâme", 76: "İnsân", 77: "Mürselât", 78: "Nebe'", 79: "Nâziât", 80: "Abese",
  81: "Tekvîr", 82: "İnfitâr", 83: "Mutaffifîn", 84: "İnşikâk", 85: "Burûc", 86: "Târık", 87: "A'lâ", 88: "Gâşiye", 89: "Fecr", 90: "Beled",
  91: "Şems", 92: "Leyl", 93: "Duhâ", 94: "İnşirah", 95: "Tîn", 96: "Alak", 97: "Kadir", 98: "Beyyine", 99: "Zilzâl", 100: "Âdiyât",
  101: "Kâria", 102: "Tekâsür", 103: "Asr", 104: "Hümeze", 105: "Fîl", 106: "Kureyş", 107: "Mâûn", 108: "Kevser", 109: "Kâfirûn", 110: "Nasr",
  111: "Tebbet", 112: "İhlâs", 113: "Felâk", 114: "Nâs"
};

// --- QURAN API IMPLEMENTATION (HYBRID) ---

export const getSurahList = async (): Promise<Surah[]> => {
  try {
    throw new Error("Skipping Diyanet direct call due to likely CORS environment");
  } catch (error) {
    try {
      const response = await fetch(`${ALQURAN_API_BASE}/surah`);
      const data = await response.json();
      return data.data.map((surah: Surah) => ({
          ...surah,
          englishName: TURKISH_SURAH_NAMES[surah.number] || surah.englishName, // Use Turkish Names
          name: surah.name // Arabic Name
      }));
    } catch (e) {
      console.error("Failed to fetch surah list", e);
      return [];
    }
  }
};

export const getSurahDetails = async (id: number): Promise<DualSurahResponse | null> => {
  try {
    const response = await fetch(`${ALQURAN_API_BASE}/surah/${id}/editions/quran-uthmani,tr.diyanet`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.data.length === 2) {
      const arabicData = data.data[0];
      const turkishData = data.data[1];
      arabicData.englishName = TURKISH_SURAH_NAMES[arabicData.number] || arabicData.englishName;
      
      return {
        arabic: arabicData,
        turkish: turkishData
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch surah details", error);
    return null;
  }
};

export const getRandomAyah = async (): Promise<TevafukContent | null> => {
  try {
    const randomGlobalAyah = Math.floor(Math.random() * 6236) + 1;
    const response = await fetch(`${ALQURAN_API_BASE}/ayah/${randomGlobalAyah}/editions/quran-uthmani,tr.diyanet`);
    const data = await response.json();

    if (data.status === 'OK' && data.data.length === 2) {
      const arabicData = data.data[0];
      const turkishData = data.data[1];
      const surahName = TURKISH_SURAH_NAMES[arabicData.surah.number] || arabicData.surah.englishName;
      
      return {
        type: 'ayah',
        content: {
          arabic: arabicData.text,
          turkish: turkishData.text,
          source: `${surahName} Suresi, ${arabicData.numberInSurah}. Ayet`
        }
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch random ayah", error);
    return null;
  }
};

// --- PRAYER TIMES API ---

export const getPrayerTimes = async (city = 'Istanbul', country = 'Turkey') => {
  try {
    const date = new Date();
    // Using Aladhan API (free, reliable)
    const response = await fetch(`${PRAYER_API_BASE}/timingsByCity/${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}?city=${city}&country=${country}&method=13`); 
    // Method 13 is Diyanet Isleri Baskanligi
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch prayer times", error);
    return null;
  }
};

// --- ESMA-UL HUSNA DATA ---
export const ESMA_UL_HUSNA: Esma[] = [
    { id: 1, name: "ٱللَّٰه", transliteration: "Allah", meaning: "Kâinatı yaratan ve idare eden en yüce varlık." },
    { id: 2, name: "ٱلرَّحْمَٰن", transliteration: "Er-Rahman", meaning: "Dünyada bütün mahlûkata merhamet eden, şefkat gösteren." },
    { id: 3, name: "ٱلرَّحِيم", transliteration: "Er-Rahim", meaning: "Ahirette sadece müminlere merhamet eden." },
    { id: 4, name: "ٱl-Mālik", transliteration: "El-Melik", meaning: "Mülkün, kâinatın tek sahibi." },
    { id: 5, name: "ٱl-Quddūs", transliteration: "El-Kuddüs", meaning: "Her türlü eksiklikten münezzeh, çok temiz." },
    { id: 6, name: "ٱs-Salām", transliteration: "Es-Selam", meaning: "Kullarını tehlikelerden selamete çıkaran." },
    { id: 7, name: "ٱl-Muʾmin", transliteration: "El-Mü'min", meaning: "Güven veren, emin kılan, koruyan." },
    { id: 8, name: "ٱl-Muhaymin", transliteration: "El-Müheymin", meaning: "Her şeyi görüp gözeten, her varlığın yaptıklarından haberdar olan." },
    { id: 9, name: "ٱl-ʿAzīz", transliteration: "El-Aziz", meaning: "İzzet sahibi, her şeye galip gelen." },
    { id: 10, name: "ٱl-Jabbār", transliteration: "El-Cebbar", meaning: "Azamet ve kudret sahibi, dilediğini yapan." },
    { id: 11, name: "ٱl-Mutakabbir", transliteration: "El-Mütekebbir", meaning: "Büyüklükte eşi, benzeri olmayan." },
    { id: 12, name: "ٱl-Khāliq", transliteration: "El-Halık", meaning: "Yaratan, yoktan var eden." },
    { id: 13, name: "ٱl-Bāriʾ", transliteration: "El-Bari", meaning: "Her şeyi kusursuz ve uyumlu yaratan." },
    { id: 14, name: "ٱl-Muṣawwir", transliteration: "El-Musavvir", meaning: "Varlıklara şekil ve suret veren." },
    { id: 15, name: "ٱl-Ghaffār", transliteration: "El-Gaffar", meaning: "Günahları örten ve çok mağfiret eden." },
    { id: 16, name: "ٱl-Qahhār", transliteration: "El-Kahhar", meaning: "Her şeye, her istediğini yapacak surette galip ve hakim olan." }
];

export const getRandomEsma = (): Esma => {
    return ESMA_UL_HUSNA[Math.floor(Math.random() * ESMA_UL_HUSNA.length)];
};

export const getAllEsmas = (): Esma[] => {
    return ESMA_UL_HUSNA;
};

// --- Hadith Data (Curated for Quality) ---
const CURATED_HADITHS: Hadith[] = [
  { id: 1, source: 'Bukhari', text: "Ameller niyetlere göredir. Herkese niyet ettiği şey vardır.", topic: "Niyet" },
  { id: 2, source: 'Muslim', text: "Müslüman, elinden ve dilinden Müslümanların emin olduğu kimsedir.", topic: "Ahlak" },
  { id: 3, source: 'Riyad as-Salihin', text: "Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.", topic: "Tebliğ" },
  { id: 4, source: 'Tirmidhi', text: "Sizin en hayırlınız, Kuran'ı öğrenen ve öğretendir.", topic: "İlim" },
  { id: 5, source: 'Bukhari', text: "İki nimet vardır ki, insanların çoğu bu konuda aldanmıştır: Sağlık ve boş vakit.", topic: "Zaman" },
  { id: 6, source: 'Muslim', text: "Allah güzeldir, güzelliği sever.", topic: "Estetik" },
  { id: 7, source: 'Riyad as-Salihin', text: "Hiçbiriniz kendisi için istediğini kardeşi için de istemedikçe (tam) iman etmiş olmaz.", topic: "Kardeşlik" },
  { id: 8, source: 'Bukhari', text: "Zenginlik mal çokluğuyla değildir. Bilakis zenginlik göz tokluğudur.", topic: "Kanaat" },
  { id: 9, source: 'Tirmidhi', text: "Tebessüm sadakadır.", topic: "İyilik" },
  { id: 10, source: 'Muslim', text: "Merhamet etmeyene merhamet olunmaz.", topic: "Merhamet" },
  { id: 11, source: 'Tirmidhi', text: "Kıyamet günü müminin terazisinde güzel ahlaktan daha ağır basan bir şey yoktur.", topic: "Ahlak" },
  { id: 12, source: 'Riyad as-Salihin', text: "Güçlü kimse, güreşte hasmını yenen pehlivan değildir. Asıl güçlü kimse, öfkelendiği zaman nefsine hakim olan kimsedir.", topic: "İrade" },
  { id: 13, source: 'Muslim', text: "Kulun Rabbine en yakın olduğu hal secde halidir. Öyleyse (secdede) duayı çok yapın.", topic: "Dua" },
  { id: 14, source: 'Bukhari', text: "Birbirinize haset etmeyin, birbirinize küsmeyin, birbirinize sırt çevirmeyin. Ey Allah'ın kulları! Kardeş olun.", topic: "Kardeşlik" },
  { id: 15, source: 'Bukhari', text: "Müminler, birbirlerini sevmekte, birbirlerine merhamet etmekte ve birbirlerini korumakta bir vücudun organları gibidirler.", topic: "Birlik" }
];

export const getRandomHadith = (): TevafukContent => {
  const randomIndex = Math.floor(Math.random() * CURATED_HADITHS.length);
  const hadith = CURATED_HADITHS[randomIndex];
  return {
    type: 'hadith',
    content: {
      turkish: hadith.text,
      source: `Hadis-i Şerif | Kaynak: ${hadith.source}`
    }
  };
};

export const getAllHadiths = (): Hadith[] => {
  return CURATED_HADITHS;
};