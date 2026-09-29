import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MapPin, Navigation, Search, Check } from 'lucide-react-native';
import { Screen, Header, Card, SectionTitle, Chip, haptic } from '../components/ui';
import { useTheme, FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore, PrayerLocation } from '../store/usePrayerStore';
import { resolveGpsLocation, searchCities, defaultMethodFor, METHODS, ensureCalendars, rescheduleAllNotifications } from '../services/prayerTimes';
import { TURKEY_CITIES } from '../data/turkeyCities';
import { syncWidgets } from '../services/widgets';
import { t } from '../i18n';

const LocationPickerScreen: React.FC = () => {
  const c = useTheme();
  const nav = useNavigation();
  const location = usePrayerStore(s => s.location);
  const method = usePrayerStore(s => s.method);
  const setLocation = usePrayerStore(s => s.setLocation);
  const setMethod = usePrayerStore(s => s.setMethod);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PrayerLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchCities(query)); } catch { setResults([]); }
      setSearching(false);
    }, 450);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const turkishMatches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return TURKEY_CITIES.slice(0, 0);
    return TURKEY_CITIES.filter(ci => ci.label.toLocaleLowerCase('tr').startsWith(q) || ci.name.toLowerCase().startsWith(q)).slice(0, 6);
  }, [query]);

  const commit = async (loc: PrayerLocation, keepMethod = false) => {
    haptic('success');
    setLocation(loc);
    if (!keepMethod) setMethod(defaultMethodFor(loc.countryCode));
    nav.goBack();
    await ensureCalendars();
    await rescheduleAllNotifications();
    await syncWidgets();
  };

  const useGps = async () => {
    setLocating(true);
    try {
      const loc = await resolveGpsLocation();
      await commit(loc);
    } catch (e: any) {
      Alert.alert(t('prayer.location'), e?.message === 'permission-denied' ? t('prayer.locationDenied') : t('common.error'));
    } finally {
      setLocating(false);
    }
  };

  const pickTurkishCity = async (city: { name: string; label: string }) => {
    setSearching(true);
    try {
      const list = await searchCities(`${city.label}, Türkiye`);
      const best = list[0];
      if (best) {
        await commit({ ...best, label: `${city.label}, Türkiye`, city: city.label, country: 'Türkiye', countryCode: 'TR' });
      } else {
        Alert.alert(t('common.error'), t('common.offlineHint'));
      }
    } finally {
      setSearching(false);
    }
  };

  const changeMethod = async (id: number) => {
    haptic('selection');
    setMethod(id);
    setShowMethods(false);
    await ensureCalendars();
    await rescheduleAllNotifications();
    await syncWidgets();
  };

  return (
    <Screen>
      <Header title={t('prayer.location')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={useGps}
          disabled={locating}
          style={[styles.gps, { backgroundColor: c.accent }]}
          accessibilityRole="button"
          accessibilityLabel={t('prayer.useGps')}
        >
          {locating ? <ActivityIndicator color="#fff" /> : <Navigation size={18} color="#fff" />}
          <Text style={styles.gpsText}>{locating ? t('prayer.locating') : t('prayer.useGps')}</Text>
        </TouchableOpacity>

        <View style={[styles.search, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
          <Search size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('prayer.searchCity')}
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text }]}
            autoCorrect={false}
            accessibilityLabel={t('prayer.searchCity')}
          />
          {searching ? <ActivityIndicator size="small" color={c.accent} /> : null}
        </View>

        {turkishMatches.length > 0 ? (
          <View>
            <SectionTitle title="Türkiye" />
            <Card padded={false}>
              {turkishMatches.map((ci, i) => (
                <TouchableOpacity key={ci.name} onPress={() => pickTurkishCity(ci)} style={[styles.result, { borderBottomColor: c.border, borderBottomWidth: i === turkishMatches.length - 1 ? 0 : StyleSheet.hairlineWidth }]} accessibilityRole="button">
                  <MapPin size={16} color={c.accent} />
                  <Text style={[styles.resultText, { color: c.text }]}>{ci.label}, Türkiye</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ) : null}

        {results.length > 0 ? (
          <View>
            <SectionTitle title={t('common.search')} />
            <Card padded={false}>
              {results.map((r, i) => (
                <TouchableOpacity key={`${r.latitude}-${r.longitude}`} onPress={() => commit(r)} style={[styles.result, { borderBottomColor: c.border, borderBottomWidth: i === results.length - 1 ? 0 : StyleSheet.hairlineWidth }]} accessibilityRole="button">
                  <MapPin size={16} color={c.textSecondary} />
                  <Text style={[styles.resultText, { color: c.text }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ) : null}

        {location ? (
          <View>
            <SectionTitle title={t('prayer.location')} />
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Check size={18} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.currentLabel, { color: c.text }]}>{location.label}</Text>
                <Text style={[styles.currentMeta, { color: c.textMuted }]}>{location.source === 'gps' ? 'GPS' : t('onboarding.chooseCity')} · {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</Text>
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionTitle title={t('prayer.method')} action={showMethods ? t('common.close') : t('common.edit')} onAction={() => setShowMethods(v => !v)} />
          {showMethods ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {METHODS.map(m => (
                <Chip key={m.id} label={m.name} active={m.id === method} onPress={() => changeMethod(m.id)} />
              ))}
            </View>
          ) : (
            <Card>
              <Text style={[styles.currentLabel, { color: c.text }]}>{METHODS.find(m => m.id === method)?.name ?? `#${method}`}</Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: SPACING.lg },
  gps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: RADIUS.md },
  gpsText: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 50, borderRadius: RADIUS.md, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: FONT.medium },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: SPACING.lg },
  resultText: { fontSize: 15, fontFamily: FONT.medium },
  currentLabel: { fontSize: 15, fontFamily: FONT.semibold },
  currentMeta: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
});

export default LocationPickerScreen;
