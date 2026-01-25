import React, { useState, useEffect } from 'react';
import { Moon, Sun, Sparkles, Heart, Activity, Book, Disc, ScrollText, ArrowRight } from 'lucide-react';
import TevafukCard from './TevafukCard';
import PrayerTimesWidget from './PrayerTimesWidget';
import { TevafukContent, Esma } from '../types';
import { getRandomEsma } from '../services/api';

interface HomeMenuProps {
  tevafukContent: TevafukContent | null;
  loadingTevafuk: boolean;
  onRefreshTevafuk: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onNavigate: (page: any) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ 
  tevafukContent, 
  loadingTevafuk, 
  onRefreshTevafuk,
  darkMode,
  toggleDarkMode,
  onNavigate
}) => {
  const [dailyEsma, setDailyEsma] = useState<Esma | null>(null);

  useEffect(() => {
    setDailyEsma(getRandomEsma());
  }, []);

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-night-950 px-6 pt-10 pb-12 transition-colors duration-500 flex flex-col">
      
      {/* Top Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="animate-slide-up">
           <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-400 tracking-tight font-serif">
             Huzur
           </h1>
           <p className="text-stone-500 dark:text-slate-400 text-xs font-medium tracking-wide">
             Hoşgeldin, Bugünün Hayırlı Olsun
           </p>
        </div>
        <button 
           onClick={toggleDarkMode}
           className="w-10 h-10 flex items-center justify-center rounded-full glass-panel border border-stone-200 dark:border-white/10 shadow-sm active:scale-95 transition-all text-stone-500 dark:text-amber-400"
        >
           {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          
          {/* Prayer Widget (Primary Dashboard Item) */}
          <section>
              <PrayerTimesWidget />
          </section>

          {/* Main Actions Grid (The "Soft" Menu) */}
          <section className="grid grid-cols-2 gap-4">
              
              {/* Quran Card - Large */}
              <button 
                onClick={() => onNavigate('quran')}
                className="col-span-2 relative h-32 bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-[2rem] p-6 flex items-center justify-between shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all group overflow-hidden"
              >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors"></div>
                  
                  <div className="relative z-10 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                          <Book className="text-emerald-100" size={28} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                          <h3 className="text-white text-xl font-bold font-serif leading-tight">Kuran-ı<br/>Kerim</h3>
                      </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-100 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <ArrowRight size={20} />
                  </div>
              </button>

              {/* Tasbih Card */}
              <button 
                onClick={() => onNavigate('tasbih')}
                className="h-40 bg-white dark:bg-night-800 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm border border-stone-100 dark:border-night-700 active:scale-[0.98] transition-all group relative overflow-hidden"
              >
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-amber-50 dark:bg-amber-500/5 rounded-full blur-2xl -mr-6 -mb-6"></div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-night-900 flex items-center justify-center text-amber-600 dark:text-amber-500">
                      <Disc size={24} strokeWidth={1.5} />
                  </div>
                  <div className="text-left relative z-10">
                      <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Zikir</span>
                      <h3 className="text-stone-800 dark:text-slate-200 text-lg font-bold">Zikirmatik</h3>
                  </div>
              </button>

              {/* Hadith Card */}
              <button 
                onClick={() => onNavigate('hadith')}
                className="h-40 bg-white dark:bg-night-800 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm border border-stone-100 dark:border-night-700 active:scale-[0.98] transition-all group relative overflow-hidden"
              >
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-500/5 rounded-full blur-2xl -mr-6 -mb-6"></div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-night-900 flex items-center justify-center text-blue-600 dark:text-blue-500">
                      <ScrollText size={24} strokeWidth={1.5} />
                  </div>
                  <div className="text-left relative z-10">
                      <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">İlim</span>
                      <h3 className="text-stone-800 dark:text-slate-200 text-lg font-bold">Hadisler</h3>
                  </div>
              </button>

          </section>

          {/* Daily Content (Tevafuk) */}
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles size={16} className="text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-stone-400 dark:text-slate-500 tracking-widest uppercase">Günün Nasibi</span>
            </div>
            <TevafukCard 
               content={tevafukContent} 
               loading={loadingTevafuk} 
               onRefresh={onRefreshTevafuk} 
            />
          </section>

          {/* Esma-ul Husna Mini Widget */}
          {dailyEsma && (
            <button onClick={() => onNavigate('esma')} className="w-full text-left relative group overflow-hidden bg-stone-100 dark:bg-night-800 rounded-[2rem] p-6 border border-stone-200 dark:border-night-700 active:scale-[0.99] transition-all">
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={14} className="text-emerald-600 dark:text-emerald-500" />
                            <span className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Günün Esması</span>
                        </div>
                        <h3 className="text-emerald-950 dark:text-white font-bold text-xl">{dailyEsma.transliteration}</h3>
                        <p className="text-stone-500 dark:text-slate-400 text-xs mt-1 line-clamp-1">{dailyEsma.meaning}</p>
                    </div>
                    <span className="font-arabic text-5xl text-emerald-800 dark:text-emerald-400 drop-shadow-sm">{dailyEsma.name}</span>
                </div>
            </button>
          )}

      </div>
    </div>
  );
};

export default HomeMenu;