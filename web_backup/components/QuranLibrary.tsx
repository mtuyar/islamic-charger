import React, { useMemo, useState } from 'react';
import { Surah } from '../types';
import { Search, BookOpen, Clock, ChevronRight, Mountain, Moon, Sparkles, LayoutGrid, List } from 'lucide-react';

interface QuranLibraryProps {
  surahs: Surah[];
  onOpenSurah: (id: number) => void;
  lastReadSurahId: number | null;
  onBack: () => void;
}

const QuranLibrary: React.FC<QuranLibraryProps> = ({ surahs, onOpenSurah, lastReadSurahId, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'surah' | 'juz'>('surah');

  // Generate Juz List (Mock data for display logic, mapped to likely starting Surah)
  // In a real app, this would need accurate page/ayah mapping.
  const juzs = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ id: i + 1, label: `${i + 1}. Cüz` })), []);

  const filteredSurahs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return surahs;
    return surahs.filter(s => 
        s.englishName.toLowerCase().includes(query) || 
        s.name.includes(query) || 
        s.number.toString() === query
    );
  }, [surahs, searchQuery]);

  const lastReadSurah = useMemo(() => 
    surahs.find(s => s.number === lastReadSurahId), 
  [surahs, lastReadSurahId]);

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-night-950 animate-slide-up transition-colors duration-500 pb-12">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-sand-50/95 dark:bg-night-950/95 backdrop-blur-md px-6 pt-6 pb-4 border-b border-stone-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 transition-colors">
                    <ChevronRight size={24} className="rotate-180" />
                </button>
                <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-400 font-serif">Kuran Kütüphanesi</h1>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <input 
                    type="text" 
                    placeholder="Sure veya cüz ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-stone-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-stone-400"
                />
                <Search className="absolute left-4 top-4 text-stone-400" size={20} />
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-stone-100 dark:bg-night-800 rounded-xl">
                <button 
                    onClick={() => setActiveTab('surah')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'surah' ? 'bg-white dark:bg-night-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-slate-500'}`}
                >
                    <List size={16} />
                    <span>Sureler</span>
                </button>
                <button 
                    onClick={() => setActiveTab('juz')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'juz' ? 'bg-white dark:bg-night-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-slate-500'}`}
                >
                    <LayoutGrid size={16} />
                    <span>Cüzler</span>
                </button>
            </div>
        </div>

        <div className="px-6 mt-6 space-y-8">
            
            {/* Last Read (Only on Surah tab & no search) */}
            {activeTab === 'surah' && !searchQuery && lastReadSurah && (
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-[2rem] p-6 relative overflow-hidden shadow-xl shadow-emerald-900/20 group cursor-pointer" onClick={() => onOpenSurah(lastReadSurah.number)}>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-white/10 transition-colors"></div>
                    
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                         <div className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Son Okunan</div>
                    </div>
                    
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                            <h3 className="text-white font-serif text-2xl font-bold mb-1">{lastReadSurah.englishName}</h3>
                            <p className="text-emerald-200/60 text-sm">Kaldığınız yerden devam edin</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                            <BookOpen size={18} />
                        </div>
                    </div>
                </div>
            )}

            {/* List Content */}
            <div className="space-y-3">
                {activeTab === 'surah' ? (
                    filteredSurahs.map((surah) => (
                        <button 
                            key={surah.number}
                            onClick={() => onOpenSurah(surah.number)}
                            className="w-full bg-white dark:bg-night-800 p-4 rounded-[1.5rem] border border-stone-100 dark:border-night-700 shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group active:scale-[0.99]"
                        >
                            <div className="w-12 h-12 flex-shrink-0 bg-stone-50 dark:bg-night-900 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-emerald-500 font-bold font-sans text-sm group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                                {surah.number}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{surah.englishName}</h3>
                                    <span className="font-arabic text-xl text-stone-300 dark:text-slate-600 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                        {surah.name}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-slate-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        {surah.revelationType === 'Meccan' ? 'Mekke' : 'Medine'}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-slate-700"></span>
                                    <span>{surah.numberOfAyahs} Ayet</span>
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {juzs.map((juz) => (
                            <button
                                key={juz.id}
                                // For now, Juz click just opens the first Surah (Approximation for prototype)
                                // In a real app, this maps to specific page/ayah
                                onClick={() => onOpenSurah(1)} 
                                className="bg-white dark:bg-night-800 p-6 rounded-[1.5rem] border border-stone-100 dark:border-night-700 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-center group"
                            >
                                <span className="block text-emerald-950 dark:text-white font-bold text-lg mb-1">{juz.label}</span>
                                <span className="text-xs text-stone-400 dark:text-slate-500 font-medium">Başla</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default QuranLibrary;