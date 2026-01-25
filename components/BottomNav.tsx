import React from 'react';
import { Home, BookOpen, ScrollText, Disc } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSwitch: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSwitch }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Ana Sayfa' },
    { id: 'quran', icon: BookOpen, label: 'Kuran' },
    { id: 'tasbih', icon: Disc, label: 'Zikir' },
    { id: 'hadith', icon: ScrollText, label: 'Hadis' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-night-950/90 backdrop-blur-lg border-t border-stone-200 dark:border-night-700 pb-safe pt-2">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onSwitch(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 h-full group"
            >
              {isActive && (
                <div className="absolute -top-2 w-10 h-1 rounded-b-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              )}
              
              <div className={`transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
                  <Icon 
                    size={24} 
                    className={`mb-1 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-slate-600 group-hover:text-stone-600 dark:group-hover:text-slate-400'}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
              </div>
              
              <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'text-emerald-800 dark:text-emerald-300 opacity-100' : 'text-stone-400 dark:text-slate-600 opacity-0 h-0 scale-0'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;