import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOTAL_PAGES = 604;

interface QuranState {
  /** Pages marked as read in the current khatm (1–604). */
  pagesRead: Record<number, string>; // page -> ISO date read
  khatmStartedAt: number;
  khatmCount: number;               // completed khatms
  dailyPageGoal: number;
  lastPage: number | null;

  markPageRead: (page: number) => void;
  unmarkPageRead: (page: number) => void;
  setDailyPageGoal: (n: number) => void;
  setLastPage: (p: number) => void;
  resetKhatm: () => void;
}

export const useQuranStore = create<QuranState>()(
  persist(
    (set) => ({
      pagesRead: {},
      khatmStartedAt: Date.now(),
      khatmCount: 0,
      dailyPageGoal: 4,
      lastPage: null,

      markPageRead: (page) =>
        set((s) => {
          if (s.pagesRead[page]) return {};
          const pagesRead = { ...s.pagesRead, [page]: new Date().toISOString() };
          const done = Object.keys(pagesRead).length >= TOTAL_PAGES;
          return done
            ? { pagesRead: {}, khatmCount: s.khatmCount + 1, khatmStartedAt: Date.now() }
            : { pagesRead };
        }),
      unmarkPageRead: (page) =>
        set((s) => {
          const pagesRead = { ...s.pagesRead };
          delete pagesRead[page];
          return { pagesRead };
        }),
      setDailyPageGoal: (dailyPageGoal) => set({ dailyPageGoal: Math.min(40, Math.max(1, dailyPageGoal)) }),
      setLastPage: (lastPage) => set({ lastPage }),
      resetKhatm: () => set({ pagesRead: {}, khatmStartedAt: Date.now() }),
    }),
    { name: 'ruhnevaz.quran', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const khatmStats = (s: Pick<QuranState, 'pagesRead' | 'dailyPageGoal'>) => {
  const read = Object.keys(s.pagesRead).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = Object.values(s.pagesRead).filter(d => d.slice(0, 10) === today).length;
  const remaining = TOTAL_PAGES - read;
  const daysLeft = Math.ceil(remaining / Math.max(1, s.dailyPageGoal));
  const finish = new Date();
  finish.setDate(finish.getDate() + daysLeft);
  return { read, todayCount, remaining, daysLeft, finish, percent: Math.round((read / TOTAL_PAGES) * 100) };
};
