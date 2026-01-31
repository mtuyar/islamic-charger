import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, ChevronDown, ArrowRight } from 'lucide-react';

const PRESETS = [
    { id: 1, label: "Sübhanallah", target: 33 },
    { id: 2, label: "Elhamdülillah", target: 33 },
    { id: 3, label: "Allahuekber", target: 33 },
    { id: 4, label: "Lâ ilâhe illallah", target: 99 },
    { id: 5, label: "Salavat-ı Şerife", target: 100 },
    { id: 6, label: "Serbest Zikir", target: 9999 }
];

const Tasbih: React.FC = () => {
  const [count, setCount] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [showPresets, setShowPresets] = useState(false);

  // Load saved count
  useEffect(() => {
    const saved = localStorage.getItem('tasbihCount');
    if (saved) setCount(parseInt(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('tasbihCount', count.toString());
  }, [count]);

  const increment = () => {
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(10);
    
    // Check target reach
    if (selectedPreset.id !== 6 && count + 1 === selectedPreset.target) {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
    
    setCount(c => c + 1);
  };

  const reset = () => {
    // Direct reset, no confirm dialog to break flow
    // Visual feedback could be added here
    setCount(0);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const changePreset = (preset: typeof PRESETS[0]) => {
      setSelectedPreset(preset);
      setCount(0);
      setShowPresets(false);
  };

  const progress = Math.min((count % selectedPreset.target) / selectedPreset.target * 100, 100);
  const isTargetReached = selectedPreset.id !== 6 && count >= selectedPreset.target;

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-night-950 flex flex-col items-center pt-8 pb-32 px-6 transition-colors duration-500">
        
        {/* Preset Selector */}
        <div className="relative z-20 mb-10 w-full max-w-xs">
            <button 
                onClick={() => setShowPresets(!showPresets)}
                className="w-full flex items-center justify-between bg-white dark:bg-night-800 border border-stone-200 dark:border-night-700 px-5 py-4 rounded-2xl shadow-sm active:scale-95 transition-all"
            >
                <div className="text-left">
                    <span className="text-xs text-stone-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Seçili Zikir</span>
                    <span className="text-emerald-950 dark:text-white font-bold text-lg">{selectedPreset.label}</span>
                </div>
                <ChevronDown className={`text-stone-400 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>

            {showPresets && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-night-800 border border-stone-200 dark:border-night-700 rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-64 overflow-y-auto z-50">
                    {PRESETS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => changePreset(p)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-night-700 border-b border-stone-100 dark:border-night-700 last:border-0 text-left transition-colors"
                        >
                            <span className={`font-medium ${selectedPreset.id === p.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{p.label}</span>
                            {selectedPreset.id === p.id && <Check size={16} className="text-emerald-600" />}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Counter UI */}
        <div className="w-full max-w-xs aspect-square relative flex items-center justify-center mb-12">
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-emerald-500/5 rounded-full blur-3xl transition-all duration-500 ${isTargetReached ? 'bg-emerald-500/30 scale-110' : ''}`}></div>

            {/* Background Ring */}
            <div className="absolute inset-0 rounded-full border-[24px] border-stone-100 dark:border-night-800"></div>
            
            {/* Progress Ring (SVG) */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                <circle
                    cx="50%"
                    cy="50%"
                    r="43%" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="24"
                    strokeLinecap="round"
                    strokeDasharray="270%" 
                    strokeDashoffset={`${270 - (progress / 100 * 270)}%`}
                    className={`transition-all duration-300 ease-out ${isTargetReached ? 'text-emerald-500' : 'text-emerald-500/80 dark:text-emerald-500/60'}`}
                />
            </svg>

            {/* Click Button */}
            <button 
                onClick={increment}
                className="w-48 h-48 rounded-full bg-white dark:bg-night-800 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-stone-50 dark:border-night-700 flex flex-col items-center justify-center active:scale-95 active:shadow-inner transition-all duration-100 group z-10"
            >
                <span className="text-6xl font-bold text-emerald-950 dark:text-white font-mono tabular-nums tracking-tighter group-active:scale-110 transition-transform">
                    {count}
                </span>
                <span className="text-xs text-stone-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-2">
                   Hedef: {selectedPreset.target}
                </span>
            </button>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
            <button 
                onClick={reset}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-stone-100 dark:bg-night-800 border border-stone-200 dark:border-night-700 text-stone-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shadow-sm active:scale-95"
            >
                <RotateCcw size={20} />
                <span className="font-bold text-sm">Sıfırla</span>
            </button>
        </div>

    </div>
  );
};

export default Tasbih;