import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen, StateView } from '../components/ui';
import Reader from '../components/Reader';
import { getSurahDetails } from '../services/api';
import { useLibraryStore } from '../store/useLibraryStore';
import { useIsDark } from '../theme';
import { useIsOnline } from '../hooks/useNetwork';
import { t } from '../i18n';
import type { DualSurahResponse } from '../types';
import type { RootStackParamList } from '../navigation/types';

const ReaderScreen: React.FC = () => {
  const nav = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Reader'>>();
  const darkMode = useIsDark();
  const online = useIsOnline();
  const savedAyahs = useLibraryStore(s => s.savedAyahs);
  const toggleSavedAyah = useLibraryStore(s => s.toggleSavedAyah);
  const setLastRead = useLibraryStore(s => s.setLastRead);
  const [data, setData] = useState<DualSurahResponse | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    setData(null);
    const d = await getSurahDetails(params.surahId);
    if (d) setData(d); else setError(true);
  };

  useEffect(() => {
    setLastRead(params.surahId, params.startAyah);
    load();
  }, [params.surahId]);

  if (error) {
    return (
      <Screen>
        <StateView kind={online ? 'error' : 'offline'} message={online ? undefined : t('common.offlineHint')} onRetry={load} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }
  return (
    <Reader
      data={data}
      onBack={() => nav.goBack()}
      darkMode={darkMode}
      initialAyah={params.startAyah}
      onSaveAyah={toggleSavedAyah}
      savedAyahIds={savedAyahs.map(a => a.id)}
      onLastAyahChange={(n) => setLastRead(params.surahId, n)}
    />
  );
};

export default ReaderScreen;
