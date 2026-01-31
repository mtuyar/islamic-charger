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
    const response = await fetch(`${PRAYER_API_BASE}/timingsByCity/${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}?city=${city}&country=${country}&method=13`);
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

// --- ESMA-UL HUSNA DATA (99 Names) ---
export const ESMA_UL_HUSNA: Esma[] = [
  { id: 1, name: "اللّٰه", transliteration: "Allah", meaning: "Kâinatı yaratan ve idare eden en yüce varlık." },
  { id: 2, name: "الرَّحْمٰنُ", transliteration: "Er-Rahman", meaning: "Dünyada bütün mahlûkata merhamet eden." },
  { id: 3, name: "الرَّحِيمُ", transliteration: "Er-Rahim", meaning: "Ahirette müminlere merhamet eden." },
  { id: 4, name: "الْمَلِكُ", transliteration: "El-Melik", meaning: "Mülkün tek sahibi, hükümdar." },
  { id: 5, name: "الْقُدُّوسُ", transliteration: "El-Kuddüs", meaning: "Her türlü eksiklikten münezzeh." },
  { id: 6, name: "السَّلَامُ", transliteration: "Es-Selam", meaning: "Selamet veren, esenlik kaynağı." },
  { id: 7, name: "الْمُؤْمِنُ", transliteration: "El-Mü'min", meaning: "Güven veren, iman nurunu kalplere yerleştiren." },
  { id: 8, name: "الْمُهَيْمِنُ", transliteration: "El-Müheymin", meaning: "Her şeyi görüp gözeten." },
  { id: 9, name: "الْعَزِيزُ", transliteration: "El-Aziz", meaning: "İzzet sahibi, mağlup edilemeyen." },
  { id: 10, name: "الْجَبَّارُ", transliteration: "El-Cebbar", meaning: "Azamet ve kudret sahibi." },
  { id: 11, name: "الْمُتَكَبِّرُ", transliteration: "El-Mütekebbir", meaning: "Büyüklükte eşsiz." },
  { id: 12, name: "الْخَالِقُ", transliteration: "El-Halık", meaning: "Yoktan var eden." },
  { id: 13, name: "الْبَارِئُ", transliteration: "El-Bari", meaning: "Her şeyi kusursuz yaratan." },
  { id: 14, name: "الْمُصَوِّرُ", transliteration: "El-Musavvir", meaning: "Şekil ve suret veren." },
  { id: 15, name: "الْغَفَّارُ", transliteration: "El-Gaffar", meaning: "Günahları çokça bağışlayan." },
  { id: 16, name: "الْقَهَّارُ", transliteration: "El-Kahhar", meaning: "Her şeye galip ve hakim." },
  { id: 17, name: "الْوَهَّابُ", transliteration: "El-Vehhab", meaning: "Karşılıksız bol bol veren." },
  { id: 18, name: "الرَّزَّاقُ", transliteration: "Er-Rezzak", meaning: "Rızık veren, besleyen." },
  { id: 19, name: "الْفَتَّاحُ", transliteration: "El-Fettah", meaning: "Her şeyi açan, kolaylaştıran." },
  { id: 20, name: "الْعَلِيمُ", transliteration: "El-Alim", meaning: "Her şeyi bilen." },
  { id: 21, name: "الْقَابِضُ", transliteration: "El-Kabid", meaning: "Sıkan, daraltan." },
  { id: 22, name: "الْبَاسِطُ", transliteration: "El-Basit", meaning: "Açan, genişleten." },
  { id: 23, name: "الْخَافِضُ", transliteration: "El-Hafid", meaning: "Alçaltan, küçülten." },
  { id: 24, name: "الرَّافِعُ", transliteration: "Er-Rafi", meaning: "Yükselten, şeref veren." },
  { id: 25, name: "الْمُعِزُّ", transliteration: "El-Muizz", meaning: "İzzet ve şeref veren." },
  { id: 26, name: "الْمُذِلُّ", transliteration: "El-Müzill", meaning: "Zillete düşüren." },
  { id: 27, name: "السَّمِيعُ", transliteration: "Es-Semi", meaning: "Her şeyi işiten." },
  { id: 28, name: "الْبَصِيرُ", transliteration: "El-Basir", meaning: "Her şeyi gören." },
  { id: 29, name: "الْحَكَمُ", transliteration: "El-Hakem", meaning: "Hükmeden, hakim." },
  { id: 30, name: "الْعَدْلُ", transliteration: "El-Adl", meaning: "Mutlak adil olan." },
  { id: 31, name: "اللَّطِيفُ", transliteration: "El-Latif", meaning: "Lütuf sahibi, en ince işleri bilen." },
  { id: 32, name: "الْخَبِيرُ", transliteration: "El-Habir", meaning: "Her şeyden haberdar olan." },
  { id: 33, name: "الْحَلِيمُ", transliteration: "El-Halim", meaning: "Yumuşak davranan, aceleci olmayan." },
  { id: 34, name: "الْعَظِيمُ", transliteration: "El-Azim", meaning: "Azamet sahibi, çok büyük." },
  { id: 35, name: "الْغَفُورُ", transliteration: "El-Gafur", meaning: "Çok bağışlayıcı." },
  { id: 36, name: "الشَّكُورُ", transliteration: "Eş-Şekur", meaning: "Şükredenleri ödüllendiren." },
  { id: 37, name: "الْعَلِيُّ", transliteration: "El-Aliyy", meaning: "Yücelik sahibi, en yüce." },
  { id: 38, name: "الْكَبِيرُ", transliteration: "El-Kebir", meaning: "Büyüklükte sonsuz." },
  { id: 39, name: "الْحَفِيظُ", transliteration: "El-Hafiz", meaning: "Koruyup gözeten." },
  { id: 40, name: "الْمُقِيتُ", transliteration: "El-Mukit", meaning: "Her şeyin gıdasını veren." },
  { id: 41, name: "الْحَسِيبُ", transliteration: "El-Hasib", meaning: "Hesaba çeken." },
  { id: 42, name: "الْجَلِيلُ", transliteration: "El-Celil", meaning: "Celal ve azamet sahibi." },
  { id: 43, name: "الْكَرِيمُ", transliteration: "El-Kerim", meaning: "İkram eden, cömert." },
  { id: 44, name: "الرَّقِيبُ", transliteration: "Er-Rakib", meaning: "Gözeten, kontrol eden." },
  { id: 45, name: "الْمُجِيبُ", transliteration: "El-Mucib", meaning: "Dualara icabet eden." },
  { id: 46, name: "الْوَاسِعُ", transliteration: "El-Vasi", meaning: "İlmi ve rahmeti geniş." },
  { id: 47, name: "الْحَكِيمُ", transliteration: "El-Hakim", meaning: "Hikmet sahibi." },
  { id: 48, name: "الْوَدُودُ", transliteration: "El-Vedud", meaning: "Çok seven, sevilen." },
  { id: 49, name: "الْمَجِيدُ", transliteration: "El-Mecid", meaning: "Şanlı, şerefli, yüce." },
  { id: 50, name: "الْبَاعِثُ", transliteration: "El-Bais", meaning: "Öldükten sonra dirilten." },
  { id: 51, name: "الشَّهِيدُ", transliteration: "Eş-Şehid", meaning: "Her şeye şahit olan." },
  { id: 52, name: "الْحَقُّ", transliteration: "El-Hakk", meaning: "Varlığı değişmez, gerçek." },
  { id: 53, name: "الْوَكِيلُ", transliteration: "El-Vekil", meaning: "Güvenilen, işleri üstlenen." },
  { id: 54, name: "الْقَوِيُّ", transliteration: "El-Kaviyy", meaning: "Güç ve kuvvet sahibi." },
  { id: 55, name: "الْمَتِينُ", transliteration: "El-Metin", meaning: "Çok güçlü, sarsılmaz." },
  { id: 56, name: "الْوَلِيُّ", transliteration: "El-Veliyy", meaning: "Dost, yardımcı." },
  { id: 57, name: "الْحَمِيدُ", transliteration: "El-Hamid", meaning: "Övülmeye layık." },
  { id: 58, name: "الْمُحْصِي", transliteration: "El-Muhsi", meaning: "Her şeyi sayan." },
  { id: 59, name: "الْمُبْدِئُ", transliteration: "El-Mübdi", meaning: "Yoktan yaratan." },
  { id: 60, name: "الْمُعِيدُ", transliteration: "El-Muid", meaning: "Tekrar yaratan." },
  { id: 61, name: "الْمُحْيِي", transliteration: "El-Muhyi", meaning: "Dirilten, hayat veren." },
  { id: 62, name: "الْمُمِيتُ", transliteration: "El-Mümit", meaning: "Öldüren." },
  { id: 63, name: "الْحَيُّ", transliteration: "El-Hayy", meaning: "Diri, hayat sahibi." },
  { id: 64, name: "الْقَيُّومُ", transliteration: "El-Kayyum", meaning: "Kendi kendine var olan." },
  { id: 65, name: "الْوَاجِدُ", transliteration: "El-Vacid", meaning: "Bulan, zengin." },
  { id: 66, name: "الْمَاجِدُ", transliteration: "El-Macid", meaning: "Şanlı, şerefli." },
  { id: 67, name: "الْوَاحِدُ", transliteration: "El-Vahid", meaning: "Tek, bir." },
  { id: 68, name: "الصَّمَدُ", transliteration: "Es-Samed", meaning: "Hiçbir şeye muhtaç olmayan." },
  { id: 69, name: "الْقَادِرُ", transliteration: "El-Kadir", meaning: "Güç yetiren, kudretli." },
  { id: 70, name: "الْمُقْتَدِرُ", transliteration: "El-Muktedir", meaning: "Kudretiyle her şeyi yapan." },
  { id: 71, name: "الْمُقَدِّمُ", transliteration: "El-Mukaddim", meaning: "Öne alan, öne geçiren." },
  { id: 72, name: "الْمُؤَخِّرُ", transliteration: "El-Muahhir", meaning: "Geri bırakan, erteleyen." },
  { id: 73, name: "الْأَوَّلُ", transliteration: "El-Evvel", meaning: "İlk, başlangıcı olmayan." },
  { id: 74, name: "الْآخِرُ", transliteration: "El-Ahir", meaning: "Son, sonu olmayan." },
  { id: 75, name: "الظَّاهِرُ", transliteration: "Ez-Zahir", meaning: "Varlığı açık olan." },
  { id: 76, name: "الْبَاطِنُ", transliteration: "El-Batın", meaning: "Gizli, görünmeyen." },
  { id: 77, name: "الْوَالِي", transliteration: "El-Vali", meaning: "Her şeyi idare eden." },
  { id: 78, name: "الْمُتَعَالِي", transliteration: "El-Müteali", meaning: "Yüce, aşkın." },
  { id: 79, name: "الْبَرُّ", transliteration: "El-Berr", meaning: "İyilik eden, iyilik sahibi." },
  { id: 80, name: "التَّوَّابُ", transliteration: "Et-Tevvab", meaning: "Tövbeleri kabul eden." },
  { id: 81, name: "الْمُنْتَقِمُ", transliteration: "El-Müntekim", meaning: "İntikam alan." },
  { id: 82, name: "الْعَفُوُّ", transliteration: "El-Afüvv", meaning: "Çok affeden." },
  { id: 83, name: "الرَّؤُوفُ", transliteration: "Er-Rauf", meaning: "Çok şefkatli." },
  { id: 84, name: "مَالِكُ الْمُلْكِ", transliteration: "Malik-ül Mülk", meaning: "Mülkün sahibi." },
  { id: 85, name: "ذُو الْجَلَالِ وَالْإِكْرَامِ", transliteration: "Zül-Celali vel-İkram", meaning: "Celal ve ikram sahibi." },
  { id: 86, name: "الْمُقْسِطُ", transliteration: "El-Muksit", meaning: "Adaletle hükmeden." },
  { id: 87, name: "الْجَامِعُ", transliteration: "El-Cami", meaning: "Toplayan, bir araya getiren." },
  { id: 88, name: "الْغَنِيُّ", transliteration: "El-Ganiyy", meaning: "Zengin, muhtaç olmayan." },
  { id: 89, name: "الْمُغْنِي", transliteration: "El-Muğni", meaning: "Zengin eden." },
  { id: 90, name: "الْمَانِعُ", transliteration: "El-Mani", meaning: "Engelleyen, koruyan." },
  { id: 91, name: "الضَّارُّ", transliteration: "Ed-Darr", meaning: "Zarar verici şeyleri yaratan." },
  { id: 92, name: "النَّافِعُ", transliteration: "En-Nafi", meaning: "Fayda veren." },
  { id: 93, name: "النُّورُ", transliteration: "En-Nur", meaning: "Nur, aydınlatan." },
  { id: 94, name: "الْهَادِي", transliteration: "El-Hadi", meaning: "Hidayet veren." },
  { id: 95, name: "الْبَدِيعُ", transliteration: "El-Bedi", meaning: "Eşsiz yaratan." },
  { id: 96, name: "الْبَاقِي", transliteration: "El-Baki", meaning: "Varlığı daim olan." },
  { id: 97, name: "الْوَارِثُ", transliteration: "El-Varis", meaning: "Her şeyin varisi." },
  { id: 98, name: "الرَّشِيدُ", transliteration: "Er-Reşid", meaning: "Doğruya eriştiren." },
  { id: 99, name: "الصَّبُورُ", transliteration: "Es-Sabur", meaning: "Çok sabırlı." }
];

export const getRandomEsma = (): Esma => {
  return ESMA_UL_HUSNA[Math.floor(Math.random() * ESMA_UL_HUSNA.length)];
};

export const getAllEsmas = (): Esma[] => {
  return ESMA_UL_HUSNA;
};

// --- Hadith API & Data ---
const HADITH_EDITION = 'tur-bukhari';
const HADITH_API_BASE_URL = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${HADITH_EDITION}`;

// Comprehensive curated hadith collection (Fallback)
const CURATED_HADITHS: Hadith[] = [
  { id: 1, source: 'Sahih Bukhari', text: "Ameller niyetlere göredir. Herkese niyet ettiği şey vardır.", topic: "Niyet", book: "Bedül-Vahy", number: 1 },
  { id: 2, source: 'Sahih Muslim', text: "Müslüman, elinden ve dilinden Müslümanların emin olduğu kimsedir.", topic: "Ahlak", book: "İman", number: 64 },
  { id: 3, source: 'Sahih Bukhari', text: "Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.", topic: "Tebliğ", book: "İlim", number: 69 },
  { id: 4, source: 'Sahih Bukhari', text: "Sizin en hayırlınız, Kuran'ı öğrenen ve öğretendir.", topic: "İlim", book: "Fezailü'l-Kuran", number: 5027 },
  { id: 5, source: 'Sahih Bukhari', text: "İki nimet vardır ki, insanların çoğu bu konuda aldanmıştır: Sağlık ve boş vakit.", topic: "Zaman", book: "Rikak", number: 6412 },
];

export const fetchRandomHadithFromAPI = async (): Promise<Hadith | null> => {
  try {
    // Bukhari has around 7563 hadiths. Picking a random one.
    const randomId = Math.floor(Math.random() * 7000) + 1;
    const response = await fetch(`${HADITH_API_BASE_URL}/${randomId}.json`);

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.hadiths && data.hadiths.length > 0) {
      const hadith = data.hadiths[0];
      return {
        id: randomId,
        source: 'Sahih Buhari',
        text: hadith.text,
        topic: 'Hadis-i Şerif',
        book: 'Buhari',
        number: hadith.hadithnumber
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch hadith from API", error);
    return null;
  }
};

export const getRandomHadith = async (): Promise<TevafukContent> => {
  // Try API first
  const apiHadith = await fetchRandomHadithFromAPI();
  if (apiHadith) {
    return {
      type: 'hadith',
      content: {
        turkish: apiHadith.text,
        source: `${apiHadith.source} | No: ${apiHadith.number}`
      }
    };
  }

  // Fallback to local
  const randomIndex = Math.floor(Math.random() * CURATED_HADITHS.length);
  const hadith = CURATED_HADITHS[randomIndex];
  return {
    type: 'hadith',
    content: {
      turkish: hadith.text,
      source: `${hadith.source} | ${hadith.topic}`
    }
  };
};

export const getHadithList = async (count: number = 20): Promise<Hadith[]> => {
  const hadiths: Hadith[] = [];
  // Fetch a few random hadiths
  // Since fetching one by one is slow, we might want to fetch a section or just parallel fetch a few
  // For now, let's try to fetch 5 random ones in parallel and mix with curated

  const promises = Array(5).fill(0).map(() => fetchRandomHadithFromAPI());
  const results = await Promise.all(promises);

  const validResults = results.filter((h): h is Hadith => h !== null);

  return validResults;
};

export const getAllHadiths = (): Hadith[] => {
  return CURATED_HADITHS;
};

export const getHadithsByTopic = (topic: string): Hadith[] => {
  return CURATED_HADITHS.filter(h => h.topic?.toLowerCase() === topic.toLowerCase());
};

export const getHadithsBySource = (source: string): Hadith[] => {
  return CURATED_HADITHS.filter(h => h.source.toLowerCase().includes(source.toLowerCase()));
};

export const searchHadiths = (query: string): Hadith[] => {
  const q = query.toLowerCase();
  return CURATED_HADITHS.filter(h =>
    h.text.toLowerCase().includes(q) ||
    (h.topic?.toLowerCase().includes(q) ?? false) ||
    h.source.toLowerCase().includes(q)
  );
};