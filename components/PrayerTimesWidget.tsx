import React, { useEffect, useState } from 'react';
import { getPrayerTimes } from '../services/api';
import { Clock, MapPin, ChevronRight, X, Calendar, ChevronUp } from 'lucide-react';

const PRAYER_NAMES: { [key: string]: string } = {
  Fajr: 'İmsak',
  Sunrise: 'Güneş',
  Dhuhr: 'Öğle',
  Asr: 'İkindi',
  Maghrib: 'Akşam',
  Isha: 'Yatsı'
};

const PrayerTimesWidget: React.FC = () => {
  const [times, setTimes] = useState<any>(null);
  const [dateInfo, setDateInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<{name: string, timeLeft: string, percent: number} | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchTimes = async () => {
      const data = await getPrayerTimes('Istanbul', 'Turkey'); 
      if (data) {
        setTimes(data.timings);
        setDateInfo(data.date);
        calculateTimeline(data.timings);
      }
      setLoading(false);
    };
    fetchTimes();
    
    const interval = setInterval(() => {
        if (times) calculateTimeline(times);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const calculateTimeline = (timings: any) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const prayerOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextIndex = -1;
    const timeInMinutes = prayerOrder.map(p => {
        const [h, m] = timings[p].split(':').map(Number);
        return h * 60 + m;
    });

    for (let i = 0; i < timeInMinutes.length; i++) {
        if (timeInMinutes[i] > currentMinutes) {
            nextIndex = i;
            break;
        }
    }

    if (nextIndex !== -1) {
        const prevTime = nextIndex === 0 ? 0 : timeInMinutes[nextIndex - 1];
        const nextTime = timeInMinutes[nextIndex];
        const totalDuration = nextTime - prevTime;
        const elapsed = currentMinutes - prevTime;
        const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        const diff = nextTime - currentMinutes;
        const h = Math.floor(diff / 60);
        const m = diff % 60;

        setNextPrayer({
            name: PRAYER_NAMES[prayerOrder[nextIndex]],
            timeLeft: `${h}sa ${m}dk`,
            percent: percent
        });
    } else {
        setNextPrayer({ name: 'İmsak', timeLeft: 'Yarın', percent: 0 });
    }
  };

  if (loading) return (
      <div className="w-full h-48 bg-stone-100 dark:bg-night-800 rounded-[2.5rem] animate-pulse"></div>
  );

  if (!times) return null;

  return (
    <>
        <div 
            onClick={() => setShowDetails(true)}
            className="bg-white dark:bg-night-800 rounded-[2.5rem] p-6 shadow-xl shadow-stone-200/50 dark:shadow-black/20 border border-stone-100 dark:border-night-700 relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer group"
        >
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                    <MapPin size={12} className="text-emerald-700 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">İstanbul</span>
                </div>
                <div className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    Vakitler
                    <ChevronUp size={12} className="rotate-90 text-stone-300" />
                </div>
            </div>

            <div className="flex items-center justify-between px-2">
                {/* Countdown Circle */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-stone-100 dark:border-night-700"></div>
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle
                            cx="50%"
                            cy="50%"
                            r="46%"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeDasharray="290%"
                            strokeDashoffset={`${290 - (nextPrayer ? (nextPrayer.percent / 100 * 290) : 0)}%`}
                            className="text-emerald-500 transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="text-center">
                        <span className="block text-[10px] text-stone-400 dark:text-slate-500 font-bold uppercase mb-0.5">Kalan</span>
                        <span className="text-xl font-bold text-emerald-950 dark:text-white font-mono tracking-tight">{nextPrayer?.timeLeft}</span>
                    </div>
                </div>

                {/* Next Prayer Info */}
                <div className="flex-1 pl-8">
                    <span className="text-xs text-stone-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">Sıradaki Vakit</span>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{nextPrayer?.name}</h2>
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium group-hover:underline decoration-2 underline-offset-2">
                        <span>Tüm vakitleri gör</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>
        </div>

        {/* Detailed Modal (Bottom Sheet Style) */}
        {showDetails && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetails(false)}></div>
                <div className="relative bg-white dark:bg-night-900 w-full max-w-lg rounded-t-[2.5rem] p-8 shadow-2xl animate-slide-up border-t border-stone-200 dark:border-night-700">
                    
                    <div className="w-12 h-1.5 bg-stone-200 dark:bg-night-700 rounded-full mx-auto mb-6"></div>

                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white font-serif mb-1">Namaz Vakitleri</h2>
                            <p className="text-sm text-stone-500 dark:text-slate-400 flex items-center gap-2">
                                <Calendar size={14} />
                                {dateInfo?.hijri?.day} {dateInfo?.hijri?.month.en} {dateInfo?.hijri?.year}
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowDetails(false)} 
                            className="p-2 bg-stone-100 dark:bg-night-800 rounded-full text-stone-500 hover:text-red-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(PRAYER_NAMES).map(([key, name]) => (
                            <div key={key} className={`flex justify-between items-center p-4 rounded-2xl ${nextPrayer?.name === name ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/30' : 'bg-stone-50 dark:bg-night-800 border border-stone-100 dark:border-night-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${nextPrayer?.name === name ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300 dark:bg-night-600'}`}></div>
                                    <span className={`font-bold ${nextPrayer?.name === name ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>{name}</span>
                                </div>
                                <span className={`font-mono text-lg font-bold ${nextPrayer?.name === name ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {times[key]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default PrayerTimesWidget;