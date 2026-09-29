import { paletteFor } from '../theme';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import { ChevronLeft, RotateCcw, Check, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptic } from './ui';
import { t } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

// ---- Types ----
interface DhikrPreset {
  id: number;
  label: string;
  /** i18n key overriding `label` for non-transliteration names */
  labelKey?: string;
  arabic: string;
  target: number;
}

interface TasbihData {
  counts:    Record<string, number>;
  rounds:    Record<string, number>;
  totals:    Record<string, number>;
  todayDate: string;
  todayTotal: number;
}

// ---- Presets ----
const PRESETS: DhikrPreset[] = [
  { id: 1, label: 'Sübhanallah',        arabic: 'سُبْحَانَ اللّٰهِ',                  target: 33   },
  { id: 2, label: 'Elhamdülillah',      arabic: 'اَلْحَمْدُ لِلّٰهِ',                  target: 33   },
  { id: 3, label: 'Allahu Ekber',       arabic: 'اَللّٰهُ أَكْبَرُ',                  target: 34   },
  { id: 4, label: 'Lâ ilâhe illallah',  arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ',         target: 99   },
  { id: 5, label: 'Salavat',            labelKey: 'tasbih.salawat',    arabic: 'اللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ',   target: 100  },
  { id: 6, label: 'İstiğfar',           labelKey: 'tasbih.istighfar',  arabic: 'أَسْتَغْفِرُ اللّٰهَ',               target: 100  },
  { id: 7, label: 'Serbest',            labelKey: 'tasbih.free',       arabic: '',                                  target: 9999 },
];

const presetLabel = (p: DhikrPreset) => (p.labelKey ? t(p.labelKey) : p.label);

const STORAGE_KEY = '@tasbih/v2';
const todayStr = () => new Date().toISOString().slice(0, 10);

const DEFAULT: TasbihData = {
  counts: {}, rounds: {}, totals: {},
  todayDate: todayStr(), todayTotal: 0,
};

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width - 80, 280);
const RING_W = 14;

interface TasbihProps {
  darkMode?: boolean;
  onBack: () => void;
}

const Tasbih: React.FC<TasbihProps> = ({ darkMode = false, onBack }) => {
  useSettingsStore(s => s.language); // re-render on language change
  const pal = paletteFor(darkMode);
  const bg     = pal.bg;
  const cardBg = pal.card;
  const border = pal.borderStrong;
  const textP  = pal.text;
  const textS  = pal.textSecondary;

  const [data,       setData]       = useState<TasbihData>(DEFAULT);
  const [preset,     setPreset]     = useState(PRESETS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [completed,  setCompleted]  = useState(false);

  const scaleAnim     = useRef(new Animated.Value(1)).current;
  const completionOp  = useRef(new Animated.Value(0)).current;

  const key       = String(preset.id);
  const count     = data.counts[key]  ?? 0;
  const rounds    = data.rounds[key]  ?? 0;
  const total     = data.totals[key]  ?? 0;
  const isUnlimited = preset.target === 9999;
  const progress  = isUnlimited ? 0 : count / preset.target;

  const radius        = (CIRCLE_SIZE - RING_W * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset  = circumference * (1 - Math.min(progress, 1));

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved: TasbihData = { ...DEFAULT, ...JSON.parse(raw) };
        if (saved.todayDate !== todayStr()) {
          saved.todayDate  = todayStr();
          saved.todayTotal = 0;
        }
        setData(saved);
      } catch {}
    })();
  }, []);

  const persist = async (next: TasbihData) => {
    setData(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  // Scale bounce on tap (no vibration)
  const tapAnim = () => {
    scaleAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1,    useNativeDriver: true, bounciness: 12, speed: 25 }),
    ]).start();
  };

  const flashCompletion = () => {
    setCompleted(true);
    Animated.sequence([
      Animated.timing(completionOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(850),
      Animated.timing(completionOp, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setCompleted(false));
  };

  const increment = () => {
    haptic((count + 1) % 33 === 0 ? 'heavy' : 'light');
    tapAnim();
    const newCount      = count + 1;
    const newTotal      = total + 1;
    const d             = data.todayDate === todayStr() ? data : { ...data, todayDate: todayStr(), todayTotal: 0 };
    const newTodayTotal = d.todayTotal + 1;

    if (!isUnlimited && newCount >= preset.target) {
      haptic('success');
      flashCompletion();
      persist({
        ...d,
        counts: { ...d.counts, [key]: 0 },
        rounds: { ...d.rounds, [key]: (d.rounds[key] ?? 0) + 1 },
        totals: { ...d.totals, [key]: newTotal },
        todayTotal: newTodayTotal,
      });
    } else {
      persist({
        ...d,
        counts: { ...d.counts, [key]: newCount },
        totals: { ...d.totals, [key]: newTotal },
        todayTotal: newTodayTotal,
      });
    }
  };

  const reset = () => {
    persist({
      ...data,
      counts: { ...data.counts, [key]: 0 },
      rounds: { ...data.rounds, [key]: 0 },
    });
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: bg }]}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: border }]}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn} accessibilityLabel={t('a11y.back')}>
          <ChevronLeft size={24} color={textP} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: textP }]}>{t('dhikr.tasbih')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Dhikr Picker */}
      <View style={[s.pickerWrap, { zIndex: 30 }]}>
        <TouchableOpacity
          style={[s.pickerBtn, { backgroundColor: cardBg, borderColor: border }]}
          onPress={() => setShowPicker(v => !v)}
          activeOpacity={0.85}
        >
          <View style={s.pickerLeft}>
            {preset.arabic ? (
              <Text style={[s.pickerArabicSmall, { color: '#10b981', fontFamily: 'Amiri_400Regular' }]}>
                {preset.arabic}
              </Text>
            ) : null}
            <Text style={[s.pickerLabel, { color: textP }]}>{presetLabel(preset)}</Text>
          </View>
          <View style={s.pickerRight}>
            <Text style={[s.pickerTarget, { color: textS }]}>
              {isUnlimited ? '∞' : `×${preset.target}`}
            </Text>
            <ChevronDown
              size={18}
              color={textS}
              style={showPicker ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </View>
        </TouchableOpacity>

        {showPicker && (
          <View style={[s.dropdown, { backgroundColor: cardBg, borderColor: border }]}>
            {PRESETS.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  s.dropdownItem,
                  i < PRESETS.length - 1 && { borderBottomWidth: 1, borderBottomColor: border },
                ]}
                onPress={() => { setPreset(p); setShowPicker(false); }}
              >
                <View style={s.dropdownLeft}>
                  {p.arabic ? (
                    <Text style={[s.dropdownArabic, {
                      color: p.id === preset.id ? '#10b981' : textS,
                      fontFamily: 'Amiri_400Regular',
                    }]}>
                      {p.arabic}
                    </Text>
                  ) : null}
                  <Text style={[s.dropdownLabel, { color: p.id === preset.id ? '#10b981' : textP }]}>
                    {presetLabel(p)}
                  </Text>
                </View>
                <View style={s.dropdownRight}>
                  <Text style={[s.dropdownTarget, { color: textS }]}>
                    {p.target === 9999 ? '∞' : `×${p.target}`}
                  </Text>
                  {p.id === preset.id && <Check size={15} color="#10b981" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Big Circle */}
      <View style={s.circleArea}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={increment}
            activeOpacity={1}
            style={[s.circleOuter, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}
          >
            {/* Track ring */}
            <View style={[s.ringTrack, {
              width: CIRCLE_SIZE, height: CIRCLE_SIZE,
              borderColor: pal.cardAlt,
            }]} />

            {/* Progress arc */}
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth={RING_W}
                strokeDasharray={circumference}
                strokeDashoffset={isUnlimited ? circumference : strokeOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>

            {/* Inner */}
            <View style={[s.innerCircle, {
              backgroundColor: cardBg,
              shadowColor: '#10b981',
              shadowOpacity: darkMode ? 0.25 : 0.12,
            }]}>
              {preset.arabic ? (
                <Text style={[s.innerArabic, {
                  color: pal.accentText,
                  fontFamily: 'Amiri_400Regular',
                }]}>
                  {preset.arabic}
                </Text>
              ) : (
                <Text style={[s.freeTag, { color: textS }]}>{t('tasbih.freeTag')}</Text>
              )}
              <Text style={[s.countNum, { color: textP }]}>{count}</Text>
              {!isUnlimited && (
                <Text style={[s.countHint, { color: textS }]}>/ {preset.target}</Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Completion flash */}
        {completed && (
          <Animated.View style={[s.completionOverlay, { opacity: completionOp }]}>
            <View style={[s.completionBadge, {
              backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ecfdf5',
            }]}>
              <Check size={18} color="#10b981" />
              <Text style={[s.completionText, { color: '#10b981' }]}>{t('tasbih.roundComplete')}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { num: rounds,                                                       label: t('tasbih.rounds'), color: '#10b981' },
          { num: total,                                                        label: t('tasbih.total'),  color: textP     },
          { num: data.todayDate === todayStr() ? data.todayTotal : 0,          label: t('common.today'),  color: '#f59e0b' },
        ].map(st => (
          <View key={st.label} style={[s.statCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[s.statNum, { color: st.color }]}>{st.num}</Text>
            <Text style={[s.statLabel, { color: textS }]}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Reset */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.resetBtn, { backgroundColor: pal.cardAlt, borderColor: border }]}
          onPress={reset}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color={textS} />
          <Text style={[s.resetText, { color: textS }]}>{t('dhikr.reset')}</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

// ---- Styles ----
const INNER = CIRCLE_SIZE - RING_W * 2 - 32;

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  pickerWrap: { paddingHorizontal: 20, marginTop: 14 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  pickerLeft: { flex: 1 },
  pickerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickerArabicSmall: { fontSize: 20, lineHeight: 30 },
  pickerLabel: { fontSize: 14, fontWeight: '600' },
  pickerTarget: { fontSize: 12, fontWeight: '600' },

  dropdown: {
    position: 'absolute', top: '100%', left: 20, right: 20, marginTop: 4,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  dropdownLeft: { flex: 1 },
  dropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownArabic: { fontSize: 20, lineHeight: 30 },
  dropdownLabel: { fontSize: 14, fontWeight: '500' },
  dropdownTarget: { fontSize: 12 },

  circleArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  circleOuter: { alignItems: 'center', justifyContent: 'center' },
  ringTrack: {
    position: 'absolute', borderRadius: 1000, borderWidth: RING_W,
  },
  innerCircle: {
    width: INNER, height: INNER, borderRadius: INNER / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8,
    gap: 4,
  },
  innerArabic: { fontSize: 26, lineHeight: 38 },
  freeTag: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  countNum: { fontSize: 68, fontWeight: '800', lineHeight: 76 },
  countHint: { fontSize: 13, fontWeight: '600' },

  completionOverlay: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    bottom: -16, zIndex: 50, elevation: 50,
  },
  completionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 28,
  },
  completionText: { fontSize: 15, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  statCard: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, gap: 2,
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  bottom: { paddingBottom: Platform.OS === 'ios' ? 8 : 16, alignItems: 'center' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  resetText: { fontSize: 14, fontWeight: '600' },
});

export default Tasbih;
