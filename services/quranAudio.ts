// Ayah-by-ayah recitation player built on expo-audio, exposed as a tiny Zustand store
// so any screen (Reader, mini player) can observe/control playback.
import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { audioUrl } from './quranExtras';
import { useSettingsStore } from '../store/useSettingsStore';

export interface Track {
  surah: number;
  ayahInSurah: number;
  globalNumber: number;
}

interface AudioState {
  queue: Track[];
  index: number;          // -1 = idle
  playing: boolean;
  loading: boolean;
  error: string | null;
  repeatLeft: number;
  /** Start playing `queue` from `startIndex`. */
  playQueue: (queue: Track[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

let player: AudioPlayer | null = null;
let modeReady = false;
let listenerAttached = false;
let finishHandled = false;

const ensurePlayer = async (): Promise<AudioPlayer> => {
  if (!modeReady) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    } catch { /* web / unsupported */ }
    modeReady = true;
  }
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
  }
  if (!listenerAttached && player) {
    player.addListener('playbackStatusUpdate', (status) => {
      const s = useQuranAudio.getState();
      if (status.didJustFinish) {
        // expo-audio may emit more than one update at the end of a track — advance once per load.
        if (!finishHandled && s.index >= 0) {
          finishHandled = true;
          s.next();
        }
        return;
      }
      if (status.isLoaded && s.loading) useQuranAudio.setState({ loading: false });
      if (status.playing !== s.playing) useQuranAudio.setState({ playing: status.playing });
    });
    listenerAttached = true;
  }
  return player;
};

const loadAndPlay = async (track: Track) => {
  const p = await ensurePlayer();
  const reciter = useSettingsStore.getState().reciterId;
  useQuranAudio.setState({ loading: true, error: null });
  finishHandled = false;
  try {
    p.replace({ uri: audioUrl(reciter, track.globalNumber) });
    p.play();
  } catch (e: any) {
    useQuranAudio.setState({ loading: false, error: e?.message ?? 'audio' });
  }
};

export const useQuranAudio = create<AudioState>()((set, get) => ({
  queue: [],
  index: -1,
  playing: false,
  loading: false,
  error: null,
  repeatLeft: 0,

  playQueue: (queue, startIndex = 0) => {
    const repeat = useSettingsStore.getState().repeatCount;
    set({ queue, index: startIndex, repeatLeft: repeat });
    loadAndPlay(queue[startIndex]);
  },
  toggle: () => {
    const { index, queue } = get();
    if (index < 0 || !player) {
      if (queue.length) get().playQueue(queue, Math.max(0, index));
      return;
    }
    if (player.playing) player.pause(); else player.play();
    set({ playing: !player.playing ? false : true });
  },
  next: () => {
    const { queue, index, repeatLeft } = get();
    if (index < 0) return;
    if (repeatLeft > 0) {
      set({ repeatLeft: repeatLeft - 1 });
      loadAndPlay(queue[index]);
      return;
    }
    if (index + 1 < queue.length) {
      const repeat = useSettingsStore.getState().repeatCount;
      set({ index: index + 1, repeatLeft: repeat });
      loadAndPlay(queue[index + 1]);
    } else {
      get().stop();
    }
  },
  prev: () => {
    const { queue, index } = get();
    if (index <= 0) return;
    const repeat = useSettingsStore.getState().repeatCount;
    set({ index: index - 1, repeatLeft: repeat });
    loadAndPlay(queue[index - 1]);
  },
  stop: () => {
    try { player?.pause(); } catch { /* ignore */ }
    set({ index: -1, playing: false, loading: false, repeatLeft: 0 });
  },
}));

export const currentTrack = (): Track | null => {
  const { queue, index } = useQuranAudio.getState();
  return index >= 0 ? queue[index] ?? null : null;
};
