import React, { useState } from 'react';
import { TevafukContent } from '../types';
import { Share2, RefreshCw, Quote } from 'lucide-react';

interface TevafukCardProps {
  content: TevafukContent | null;
  loading: boolean;
  onRefresh: () => void;
}

const TevafukCard: React.FC<TevafukCardProps> = ({ content, loading, onRefresh }) => {
  const [isRevealed, setIsRevealed] = useState(true);

  const handleRefresh = () => {
    setIsRevealed(false);
    setTimeout(() => {
        onRefresh();
        setTimeout(() => setIsRevealed(true), 300);
    }, 200);
  };

  return (
    <div className="w-full relative perspective-1000">
      
      {/* Main Card */}
      <div className={`
        relative w-full bg-white dark:bg-night-800 rounded-[2rem] shadow-xl shadow-stone-200/50 dark:shadow-black/40 border border-white/60 dark:border-night-700
        transition-all duration-700 ease-out transform overflow-hidden
        ${loading ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'}
        ${isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}>
        
        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-50 dark:bg-amber-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

        {/* Content Container */}
        <div className="p-8 flex flex-col items-center justify-center text-center relative z-10">
          
          <div className="mb-6 p-3 bg-emerald-50 dark:bg-night-900/80 rounded-full transition-colors border border-emerald-100/50 dark:border-night-700">
            <Quote className="text-emerald-700 dark:text-emerald-400 w-5 h-5 opacity-80" />
          </div>

          {loading ? (
             <div className="flex flex-col items-center animate-pulse w-full max-w-xs py-8">
                <div className="w-full h-4 bg-slate-100 dark:bg-night-900 rounded mb-3"></div>
                <div className="w-5/6 h-4 bg-slate-100 dark:bg-night-900 rounded mb-3"></div>
                <div className="w-2/3 h-4 bg-slate-100 dark:bg-night-900 rounded"></div>
             </div>
          ) : content ? (
            <div className="flex-1 flex flex-col justify-center w-full">
              {content.content.arabic && (
                <p className="font-arabic text-2xl md:text-3xl leading-[2.4] text-emerald-950 dark:text-slate-200 mb-6 dir-rtl drop-shadow-sm">
                  {content.content.arabic}
                </p>
              )}
              
              <p className="font-sans text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                "{content.content.turkish}"
              </p>
              
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-night-700 w-full">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-500 tracking-widest uppercase">
                  {content.content.source}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 py-8">Bir hata oluştu.</div>
          )}
        </div>

        {/* Action Bar */}
        <div className="bg-slate-50 dark:bg-night-900/50 p-4 border-t border-slate-100 dark:border-night-700 flex justify-between items-center gap-3">
            <button 
                onClick={handleRefresh}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-night-800 rounded-xl text-stone-600 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider shadow-sm border border-stone-200 dark:border-night-700 active:scale-95 transition-all hover:bg-stone-50 dark:hover:bg-night-700"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Nasibi Değiştir</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-800 dark:bg-emerald-600 rounded-xl text-white font-semibold text-xs uppercase tracking-wider shadow-md shadow-emerald-900/10 active:scale-95 transition-all hover:bg-emerald-900 dark:hover:bg-emerald-500">
                <Share2 size={14} />
                <span>Paylaş</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default TevafukCard;