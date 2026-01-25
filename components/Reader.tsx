import React, { useEffect, useRef, useState } from 'react';
import { DualSurahResponse } from '../types';
import { ArrowLeft, BookOpen, ScrollText, Settings2, X } from 'lucide-react';

interface ReaderProps {
  data: DualSurahResponse;
  onBack: () => void;
}

const Reader: React.FC<ReaderProps> = ({ data, onBack }) => {
  const [mode, setMode] = useState<'meal' | 'mushaf'>('meal'); // meal = List View, mushaf = Full Arabic Page
  const [fontSize, setFontSize] = useState(1); // Scale factor
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo(0, 0);
    }
  }, [data]);

  // Handle Bismi'llah stripping for non-Fatiha surahs
  const getAyahText = (text: string, numberInSurah: number, surahNumber: number) => {
    if (numberInSurah === 1 && surahNumber !== 1 && surahNumber !== 9) {
      return text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ', '');
    }
    return text;
  };

  return (
    <div className="flex flex-col h-full bg-sand-50 dark:bg-night-950 animate-fade-in relative z-20 transition-colors duration-500">
      
      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
           <div className="absolute bottom-0 w-full bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg dark:text-white">Okuma Ayarları</h3>
                 <button onClick={() => setShowSettings(false)}><X className="dark:text-white" /></button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">Görünüm Modu</label>
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                       <button 
                          onClick={() => setMode('meal')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'meal' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                       >
                          Meal & Arapça
                       </button>
                       <button 
                          onClick={() => setMode('mushaf')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'mushaf' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                       >
                          Hafız Modu
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block">Yazı Boyutu</label>
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.5" 
                      step="0.1"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-stone-100 dark:border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm transition-colors duration-500">
        <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
            <h2 className="font-bold text-lg text-emerald-900 dark:text-emerald-400">{data.arabic.englishName}</h2>
            <p className="text-xs text-stone-500 dark:text-slate-500 uppercase tracking-widest">{data.arabic.revelationType === 'Meccan' ? 'Mekke' : 'Medine'} • {data.arabic.numberOfAyahs} Ayet</p>
        </div>
        <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Settings2 size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-3xl mx-auto py-8 px-4">
              
              {/* Basmalah Header for all modes */}
              <div className="text-center mb-8 relative">
                   <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-800 to-transparent"></div>
                   <span className="relative bg-sand-50 dark:bg-night-950 px-4 font-arabic text-3xl text-emerald-800 dark:text-emerald-400 inline-block transition-colors">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                   </span>
              </div>

              {mode === 'mushaf' ? (
                /* MUSHAF (HAFIZ) MODE - Block Text */
                <div className="bg-sand-100 dark:bg-slate-900 rounded-lg p-6 md:p-10 border-2 border-stone-200 dark:border-slate-800 shadow-inner">
                   <div 
                      className="font-arabic text-justify leading-[2.8] text-emerald-950 dark:text-slate-200 dir-rtl"
                      style={{ fontSize: `${2 * fontSize}rem`, textAlignLast: 'center' }}
                   >
                      {data.arabic.ayahs.map((ayah, i) => (
                         <React.Fragment key={ayah.number}>
                            {getAyahText(ayah.text, ayah.numberInSurah, data.arabic.number)}
                            <span className="inline-flex items-center justify-center mx-1 w-[1em] h-[1em] relative align-middle text-emerald-600 dark:text-emerald-500 select-none">
                               <span className="text-[0.6em] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-sans font-bold pt-1">{ayah.numberInSurah.toLocaleString('ar-EG')}</span>
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full opacity-60">
                                  <circle cx="12" cy="12" r="10" />
                               </svg>
                            </span>
                         </React.Fragment>
                      ))}
                   </div>
                </div>
              ) : (
                /* LIST (MEAL) MODE */
                <div className="space-y-6">
                   {data.arabic.ayahs.map((ayah, index) => {
                      const turkishAyah = data.turkish.ayahs[index];
                      return (
                          <div key={ayah.number} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-stone-100 dark:border-slate-800 transition-colors">
                              {/* Top Bar: Ayah Number */}
                              <div className="flex justify-between items-center mb-4 border-b border-stone-50 dark:border-slate-800 pb-2">
                                 <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold font-sans">
                                     {ayah.numberInSurah}
                                 </span>
                              </div>

                              {/* Arabic */}
                              <div className="mb-5 text-right pl-4">
                                  <p 
                                    className="font-arabic leading-[2.5] text-emerald-950 dark:text-slate-100 dir-rtl"
                                    style={{ fontSize: `${1.8 * fontSize}rem` }}
                                  >
                                      {getAyahText(ayah.text, ayah.numberInSurah, data.arabic.number)}
                                  </p>
                              </div>

                              {/* Turkish */}
                              <div className="pt-4 border-t border-stone-100 dark:border-slate-800">
                                  <p 
                                    className="font-sans font-medium leading-relaxed text-slate-600 dark:text-slate-400"
                                    style={{ fontSize: `${1 * fontSize}rem` }}
                                  >
                                      {turkishAyah.text}
                                  </p>
                              </div>
                          </div>
                      )
                   })}
                </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Reader;