import React, { useMemo, useState } from 'react';
import { getAllEsmas } from '../services/api';
import { Search, ChevronRight, Activity } from 'lucide-react';

interface EsmaLibraryProps {
    onBack: () => void;
}

const EsmaLibrary: React.FC<EsmaLibraryProps> = ({ onBack }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const esmas = getAllEsmas();

    const filteredEsmas = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return esmas;
        return esmas.filter(e => 
            e.transliteration.toLowerCase().includes(query) || 
            e.meaning.toLowerCase().includes(query)
        );
    }, [esmas, searchQuery]);

    return (
        <div className="min-h-screen bg-sand-50 dark:bg-night-950 animate-slide-up transition-colors duration-500 pb-12">
            
            {/* Header */}
            <div className="sticky top-0 z-20 bg-sand-50/95 dark:bg-night-950/95 backdrop-blur-md px-6 pt-6 pb-4 border-b border-stone-100 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 transition-colors">
                        <ChevronRight size={24} className="rotate-180" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-400 font-serif">Esma-ül Hüsna</h1>
                        <p className="text-xs text-stone-500 dark:text-slate-500">En güzel isimler O'nundur</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="İsim veya anlam ara..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-stone-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-stone-400"
                    />
                    <Search className="absolute left-4 top-4 text-stone-400" size={20} />
                </div>
            </div>

            {/* Grid */}
            <div className="px-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEsmas.map((esma) => (
                    <div key={esma.id} className="bg-white dark:bg-night-800 rounded-[2rem] p-6 shadow-sm border border-stone-100 dark:border-night-700 relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/20 transition-colors"></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-night-900 flex items-center justify-center text-emerald-700 dark:text-emerald-500 font-bold text-xs">
                                {esma.id}
                            </span>
                            <span className="font-arabic text-4xl text-emerald-800 dark:text-emerald-400">{esma.name}</span>
                        </div>

                        <div className="relative z-10">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">{esma.transliteration}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{esma.meaning}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EsmaLibrary;