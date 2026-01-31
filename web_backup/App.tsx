import React, { useState, useEffect } from 'react';
import HomeMenu from './components/HomeMenu';
import Reader from './components/Reader';
import QuranLibrary from './components/QuranLibrary';
import Tasbih from './components/Tasbih';
import EsmaLibrary from './components/EsmaLibrary';
import { getSurahList, getRandomAyah, getRandomHadith, getSurahDetails, getAllHadiths } from './services/api';
import { Surah, TevafukContent, DualSurahResponse, Hadith } from './types';
import { Star, ArrowLeft } from 'lucide-react';

type Page = 'home' | 'quran' | 'tasbih' | 'hadith' | 'esma';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [darkMode, setDarkMode] = useState(false);
  
  // Data State
  const [tevafukContent, setTevafukContent] = useState<TevafukContent | null>(null);
  const [loadingTevafuk, setLoadingTevafuk] = useState(false);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);

  // Reader Overlay State
  const [readingSurahId, setReadingSurahId] = useState<number | null>(null);
  const [readingData, setReadingData] = useState<DualSurahResponse | null>(null);
  const [loadingReader, setLoadingReader] = useState(false);
  const [lastReadSurahId, setLastReadSurahId] = useState<number | null>(null);

  // Initial Load
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
                   (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    toggleDarkMode(isDark);

    const savedLastRead = localStorage.getItem('lastReadSurahId');
    if (savedLastRead) setLastReadSurahId(parseInt(savedLastRead));

    loadTevafuk('ayah'); 
    fetchSurahs();
    setHadiths(getAllHadiths());
  }, []);

  const toggleDarkMode = (forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !darkMode;
    setDarkMode(newState);
    if (newState) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const fetchSurahs = async () => {
    const list = await getSurahList();
    setSurahs(list);
  };

  const loadTevafuk = async (preferType?: 'ayah' | 'hadith') => {
    setLoadingTevafuk(true);
    const type = preferType || (Math.random() > 0.4 ? 'ayah' : 'hadith');
    if (type === 'ayah') {
      const data = await getRandomAyah();
      setTevafukContent(data);
    } else {
      const data = getRandomHadith();
      setTevafukContent(data);
    }
    setLoadingTevafuk(false);
  };

  const openSurah = async (id: number) => {
      setReadingSurahId(id);
      setLastReadSurahId(id);
      localStorage.setItem('lastReadSurahId', id.toString());

      setLoadingReader(true);
      const data = await getSurahDetails(id);
      setReadingData(data);
      setLoadingReader(false);
  };

  const closeReader = () => {
      setReadingSurahId(null);
      setReadingData(null);
  };

  // Navigation Helper
  const goHome = () => setCurrentPage('home');

  // --- RENDER LOGIC ---

  // 1. Reader Overlay (Takes over full screen if active)
  if (readingSurahId) {
    if (loadingReader || !readingData) {
        return (
            <div className="flex items-center justify-center h-screen bg-sand-50 dark:bg-night-950 transition-colors duration-500">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-emerald-800 dark:text-emerald-400 font-medium animate-pulse">Sure Yükleniyor...</p>
                </div>
            </div>
        );
    }
    return <Reader data={readingData} onBack={closeReader} />;
  }

  // 2. Main Page Routing
  const renderContent = () => {
      switch (currentPage) {
          case 'home':
              return (
                <HomeMenu 
                    tevafukContent={tevafukContent}
                    loadingTevafuk={loadingTevafuk}
                    onRefreshTevafuk={() => loadTevafuk()}
                    darkMode={darkMode}
                    toggleDarkMode={() => toggleDarkMode()}
                    onNavigate={setCurrentPage}
                />
              );
          case 'quran':
              return (
                <QuranLibrary 
                    surahs={surahs} 
                    onOpenSurah={openSurah} 
                    lastReadSurahId={lastReadSurahId}
                    onBack={goHome}
                />
              );
          case 'tasbih':
              return (
                <div className="relative">
                    <button 
                        onClick={goHome}
                        className="absolute top-6 left-6 z-30 p-3 rounded-full bg-white dark:bg-night-800 shadow-sm border border-stone-100 dark:border-night-700 text-stone-600 dark:text-slate-300"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <Tasbih />
                </div>
              );
          case 'esma':
              return <EsmaLibrary onBack={goHome} />;
          case 'hadith':
              return (
                <div className="min-h-screen bg-sand-50 dark:bg-night-950 animate-fade-in pb-12 pt-6">
                     <div className="sticky top-0 z-20 bg-sand-50/95 dark:bg-night-950/95 backdrop-blur-sm pb-4 px-6 border-b border-stone-100 dark:border-night-700 mb-6 flex items-center gap-4">
                        <button 
                            onClick={goHome}
                            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-400 font-serif">Hadis-i Şerifler</h1>
                     </div>
                     <div className="max-w-md mx-auto space-y-4 px-6">
                         {hadiths.map((hadith) => (
                             <div key={hadith.id} className="bg-white dark:bg-night-800 p-6 rounded-[1.5rem] border border-stone-100 dark:border-night-700 shadow-sm hover:shadow-lg transition-all">
                                 <div className="flex items-center gap-2 mb-3">
                                     <Star size={14} className="text-amber-400 fill-amber-400" />
                                     <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{hadith.topic}</span>
                                 </div>
                                 <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-4">
                                     "{hadith.text}"
                                 </p>
                                 <div className="flex justify-end">
                                     <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                                         {hadith.source}
                                     </span>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
              );
          default:
              return null;
      }
  };

  return renderContent();
};

export default App;