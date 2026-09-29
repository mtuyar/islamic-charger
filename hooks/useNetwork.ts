import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** true when the device reports an internet connection (optimistic default). */
export const useIsOnline = (): boolean => {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => sub();
  }, []);
  return online;
};

/** Ticks every `ms` — for countdowns. */
export const useNow = (ms = 1000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};
